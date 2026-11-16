/**
 * Replay (PRODUCT_PLAN.md R1). Re-executes the REAL frozen Grounded pipeline on a recording.
 *
 *   recorded raw model responses ─▶ replayTransport ─▶ createClient (frozen: JSON + Zod + retry)
 *        ─▶ grounded.run()  (frozen: grounding, meeting-v1 validation, policy, reconciliation)
 *        ─▶ SystemOutput, compared with the recording
 *
 * Only the two MODEL calls are substituted. Everything deterministic runs again, live.
 * A replay that doesn't reproduce the recording is never silently accepted: verification returns
 * every problem found, and the result is marked not ok.
 *
 * Not compared (inherently recording-specific): model call durations and the recording timestamp.
 * Usage and durations shown to users come from the ORIGINAL recording; the replay incurs none.
 */
import { isDeepStrictEqual } from "node:util";
import type { ClaimRecord } from "@/core/policy";
import { POLICY_CONFIG } from "@/core/policy";
import type { LLMCallRecord, SystemOutput } from "@/core/schemas";
import { VALIDATOR_VERSION } from "@/core/validation";
import { createClient, promptHash, type Transport } from "@/llm/client";
import { DEFAULT_EFFORT, DEFAULT_MODEL, type ModelConfig } from "@/llm/config";
import { grounded, GROUNDED_VERSION } from "@/systems/grounded";
import { DemoRecording, GroundedTrace } from "./recording";
import { toCaseInput, type AnalysisResult, type DemoScenario } from "./types";

/** Model-call labels Grounded v3 makes, and which frozen prompt each must use. */
export const EXPECTED_CALLS: Record<string, keyof typeof grounded.promptHashes> = {
  "grounded.extract": "extract",
  "grounded.classify": "classify",
};

export class ReplayIntegrityError extends Error {}

/**
 * A Transport that serves recorded model responses in recorded order. Each request's prompt hash
 * (system prompt + output schema) must equal the hash of the next recorded call, so a request for
 * the wrong call, or in the wrong order, is detected. Integrity problems are collected in `problems`
 * because the frozen client converts transport exceptions into ordinary API-error results.
 */
export function replayTransport(calls: readonly LLMCallRecord[]) {
  const queue = [...calls];
  const problems: string[] = [];
  let served = 0;

  const transport: Transport = async ({ system, schema }) => {
    const requested = promptHash(system, schema);
    const next = queue.shift();
    if (next === undefined) {
      const msg = `missing recorded call: the pipeline made call #${served + 1} (prompt ${requested}) but the recording has only ${calls.length}`;
      problems.push(msg);
      throw new ReplayIntegrityError(msg);
    }
    served++;
    if (next.promptHash !== requested) {
      const msg = `call #${served}: the pipeline requested prompt ${requested}, but the recording's next call is ${next.label} (prompt ${next.promptHash})`;
      problems.push(msg);
      throw new ReplayIntegrityError(msg);
    }
    // Faithfully reproduce a recorded API error (no response at all): the frozen client records it again.
    if (!next.ok && next.rawText === null && next.stopReason === null && next.responseModel === null) {
      throw new Error((next.error ?? "recorded API error").replace(/^api error: /, ""));
    }
    return { text: next.rawText, stopReason: next.stopReason, responseModel: next.responseModel, usage: next.usage };
  };

  return { transport, problems, unconsumed: () => [...queue] };
}

/** JSON round-trip, so in-memory output compares exactly like the stored file. */
const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** The comparable part of a call record: everything except timing. */
const callShape = (c: LLMCallRecord) => {
  const { durationMs: _ignored, ...rest } = c;
  void _ignored;
  return rest;
};

/** Checks that need no execution: frozen identity, configuration, call labels, scenario input. */
export function staticChecks(rec: DemoRecording, scenario?: DemoScenario): string[] {
  const p: string[] = [];
  const s = rec.system;
  if (s.version !== GROUNDED_VERSION) p.push(`grounded version ${s.version} ≠ frozen ${GROUNDED_VERSION}`);
  if (s.policyConfig !== POLICY_CONFIG) p.push(`policy ${s.policyConfig} ≠ frozen ${POLICY_CONFIG}`);
  if (s.validatorVersion !== VALIDATOR_VERSION) p.push(`validator ${s.validatorVersion} ≠ frozen ${VALIDATOR_VERSION}`);
  if (!isDeepStrictEqual(s.promptHashes, grounded.promptHashes)) {
    p.push(`prompt hashes ${JSON.stringify(s.promptHashes)} ≠ frozen ${JSON.stringify(grounded.promptHashes)}`);
  }
  if (rec.config.model !== DEFAULT_MODEL || rec.config.effort !== DEFAULT_EFFORT) {
    p.push(`model config ${rec.config.model}/${rec.config.effort} ≠ frozen ${DEFAULT_MODEL}/${DEFAULT_EFFORT}`);
  }
  rec.output.llmCalls.forEach((c, i) => {
    const key = EXPECTED_CALLS[c.label];
    if (key === undefined) p.push(`recorded call #${i + 1} has unexpected label "${c.label}"`);
    else if (c.promptHash !== grounded.promptHashes[key]) p.push(`recorded call #${i + 1} (${c.label}) prompt ${c.promptHash} ≠ frozen ${grounded.promptHashes[key]}`);
    if (c.requestedModel !== rec.config.model) p.push(`recorded call #${i + 1} requested ${c.requestedModel}, recording config says ${rec.config.model}`);
  });
  if (scenario && !isDeepStrictEqual(plain(rec.input), plain(toCaseInput(scenario)))) {
    p.push(`recorded input differs from the current ${scenario.id} scenario`);
  }
  return p;
}

export type ReplayOutcome = {
  ok: boolean;
  problems: string[];
  /** Present whenever the pipeline ran, even if verification failed (so failures can be inspected). */
  result: AnalysisResult | null;
};

/** Re-execute the frozen pipeline on a recording and verify it reproduces the recorded decisions. */
export async function replayAnalysis(recording: DemoRecording, scenario?: DemoScenario): Promise<ReplayOutcome> {
  const rec = DemoRecording.parse(recording);
  const problems = staticChecks(rec, scenario);

  const replay = replayTransport(rec.output.llmCalls);
  const llm = createClient(replay.transport, rec.config as ModelConfig);
  let out: SystemOutput;
  try {
    out = plain(await grounded.run(rec.input, llm));
  } catch (e) {
    return { ok: false, problems: [...problems, `pipeline threw during replay: ${(e as Error).message}`], result: null };
  }

  problems.push(...replay.problems);
  const extra = replay.unconsumed();
  if (extra.length > 0) problems.push(`extra recorded call(s) never requested by the pipeline: ${extra.map((c) => c.label).join(", ")}`);

  const recorded = plain(rec.output);
  if (!isDeepStrictEqual(out.fields, recorded.fields)) problems.push("replayed field decisions differ from the recording");
  if (!isDeepStrictEqual(out.trace, recorded.trace)) problems.push("replayed trace (claims, grounding, validation, decisions) differs from the recording");
  if (out.error !== recorded.error) problems.push(`replayed error ${JSON.stringify(out.error)} ≠ recorded ${JSON.stringify(recorded.error)}`);
  if (!isDeepStrictEqual(out.llmCalls.map(callShape), recorded.llmCalls.map(callShape))) {
    problems.push("replayed model-call sequence (labels, attempts, prompts, outcomes) differs from the recording");
  }

  let records: ClaimRecord[] = [];
  const parsed = GroundedTrace.safeParse(out.trace);
  if (out.trace !== null && !parsed.success) problems.push("replayed trace is not a valid Grounded trace");
  if (parsed.success) records = parsed.data.records as ClaimRecord[];

  return {
    ok: problems.length === 0,
    problems,
    result: {
      input: rec.input,
      // Decisions and trace are the RE-EXECUTED ones; call metadata (usage, durations) is the ORIGINAL recording's.
      output: { ...out, llmCalls: rec.output.llmCalls },
      records,
      provenance: {
        mode: "replay",
        source: rec.recordingId,
        recordedAt: rec.recordedAt,
        model: rec.config.model,
        effort: rec.config.effort,
        systemVersion: rec.system.version,
        policyConfig: rec.system.policyConfig,
        validatorVersion: rec.system.validatorVersion,
        promptHashes: rec.system.promptHashes,
      },
    },
  };
}

/** Verification only. */
export async function verifyReplay(recording: DemoRecording, scenario?: DemoScenario): Promise<{ ok: boolean; problems: string[] }> {
  const { ok, problems } = await replayAnalysis(recording, scenario);
  return { ok, problems };
}
