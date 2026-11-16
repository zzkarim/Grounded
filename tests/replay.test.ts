/**
 * Replay engine (src/product/replay.ts), demo recordings and the recordings manifest.
 * Synthetic recordings are produced by running the REAL frozen grounded.run() with a scripted
 * transport (generic text, no benchmark content). No model API calls.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CRMState, LLMCallRecord, Transcript } from "@/core/schemas";
import { POLICY_CONFIG } from "@/core/policy";
import { VALIDATOR_VERSION } from "@/core/validation";
import { createClient, type TransportResponse } from "@/llm/client";
import { DEFAULT_EFFORT, DEFAULT_MODEL, MAX_TOKENS } from "@/llm/config";
import { grounded } from "@/systems/grounded";
import {
  DemoRecording,
  listRecordingFiles,
  loadManifest,
  loadRecording,
  saveRecording,
  summarizeRecording,
} from "@/product/recording";
import { replayAnalysis, replayTransport } from "@/product/replay";
import { loadScenarios } from "@/product/scenarios";
import { emptyCRM, json, scriptedTransport, transcript } from "./helpers";

const CONFIG = { model: DEFAULT_MODEL, effort: DEFAULT_EFFORT, maxTokens: MAX_TOKENS } as const;

const t: Transcript = transcript(
  [
    ["rep", "Where did budget land?"],
    ["cust", "Finance approved $90,000 for this."],
    ["cust", "Ada signs the contract. Thursday at 2 works for a follow-up."],
  ],
  "2026-03-09",
);
const crm: CRMState = emptyCRM();

const EXTRACTION = {
  candidates: [
    { field: "budget", value: { kind: "exact", amount: 90000, currency: "USD" }, evidence: [{ turnId: "t2", speakerId: "carl", quote: "Finance approved $90,000 for this." }] },
    { field: "decisionMaker", value: { people: [{ name: "Ada", role: null }] }, evidence: [{ turnId: "t3", speakerId: "carl", quote: "Ada signs the contract." }] },
    // Wrong weekday on purpose: 2026-03-13 is a Friday, so meeting-v1 must remove the date.
    { field: "nextMeeting", value: { date: "2026-03-13", time: "14:00", timezone: null, asStated: "Thursday at 2" }, evidence: [{ turnId: "t3", speakerId: "carl", quote: "Thursday at 2 works for a follow-up." }] },
  ],
};
const CLASSIFICATION = {
  classifications: ["c1", "c2", "c3"].map((claimId) => ({ claimId, status: "CURRENT", certainty: "EXPLICIT", sufficiency: "DIRECT", explanation: "generic" })),
};

/** A recording made by running the real pipeline with scripted model responses. */
async function makeRecording(responses: (Partial<TransportResponse> | Error)[] = [json(EXTRACTION), json(CLASSIFICATION)]): Promise<DemoRecording> {
  const { transport } = scriptedTransport(responses);
  const input = { caseId: "synthetic", crm, transcript: t };
  const output = await grounded.run(input, createClient(transport, CONFIG));
  return DemoRecording.parse(
    JSON.parse(
      JSON.stringify({
        schemaVersion: 1,
        recordingId: "synthetic_2026-01-01T00-00-00-000Z",
        scenarioId: "synthetic",
        recordedAt: "2026-01-01T00:00:00.000Z",
        git: { commit: "0".repeat(40), cleanExceptRecordings: true },
        scenarioFileSha256: "0".repeat(64),
        input,
        config: CONFIG,
        system: { name: "grounded", version: grounded.version, policyConfig: POLICY_CONFIG, validatorVersion: VALIDATOR_VERSION, promptHashes: grounded.promptHashes },
        responseModels: ["test-model-reported"],
        wallClockMs: 1,
        output,
      }),
    ),
  );
}
const withCalls = (r: DemoRecording, calls: LLMCallRecord[]): DemoRecording => ({ ...r, output: { ...r.output, llmCalls: calls } });

describe("replay of a faithful recording", () => {
  it("re-executes the frozen pipeline and reproduces every decision", async () => {
    const rec = await makeRecording();
    const out = await replayAnalysis(rec);
    expect(out.problems).toEqual([]);
    expect(out.ok).toBe(true);
    expect(out.result!.output.fields).toEqual(rec.output.fields);
    // The deterministic validator really ran again during replay.
    const m = out.result!.records.find((r) => r.claim.field === "nextMeeting")!;
    expect(m.validation.issues.map((i) => i.rule)).toContain("DATE_WEEKDAY_MISMATCH");
    expect(out.result!.output.fields.nextMeeting.action).toBe("ASK");
    expect(out.result!.provenance).toMatchObject({ mode: "replay", source: rec.recordingId, policyConfig: "default-v3", validatorVersion: "meeting-v1" });
  });
  it("shows the ORIGINAL call metadata, not replay timings", async () => {
    const rec = await makeRecording();
    rec.output.llmCalls[0].durationMs = 4321;
    const out = await replayAnalysis(rec);
    expect(out.ok).toBe(true); // durations are not compared
    expect(out.result!.output.llmCalls[0].durationMs).toBe(4321);
  });
  it("replays a recorded invalid-output retry exactly as the frozen client handled it", async () => {
    const rec = await makeRecording([{ text: "not json" }, json(EXTRACTION), json(CLASSIFICATION)]);
    expect(rec.output.llmCalls.map((c) => [c.label, c.attempt, c.ok])).toEqual([
      ["grounded.extract", 1, false],
      ["grounded.extract", 2, true],
      ["grounded.classify", 1, true],
    ]);
    expect((await replayAnalysis(rec)).ok).toBe(true);
  });
  it("replays a recorded API failure as the same no-write error", async () => {
    const rec = await makeRecording([new Error("overloaded")]);
    expect(rec.output.error).toMatch(/extraction failed/);
    const out = await replayAnalysis(rec);
    expect(out.problems).toEqual([]);
    expect(out.result!.output.fields.budget.reasons).toEqual(["SYSTEM_ERROR"]);
  });
});

describe("replay transport", () => {
  it("serves recorded responses in recorded order", async () => {
    const rec = await makeRecording();
    const { transport, problems, unconsumed } = replayTransport(rec.output.llmCalls);
    const client = createClient(transport, CONFIG);
    await grounded.run(rec.input, client);
    expect(problems).toEqual([]);
    expect(unconsumed()).toEqual([]);
  });
});

describe("replay integrity failures are reported, never silently accepted", () => {
  const expectFailure = async (rec: DemoRecording, pattern: RegExp) => {
    const out = await replayAnalysis(rec);
    expect(out.ok).toBe(false);
    expect(out.problems.join("\n")).toMatch(pattern);
  };

  it("calls in the wrong order", async () => {
    const rec = await makeRecording();
    await expectFailure(withCalls(rec, [...rec.output.llmCalls].reverse()), /requested prompt .* but the recording's next call is grounded\.classify/);
  });
  it("wrong call label", async () => {
    const rec = await makeRecording();
    const calls = rec.output.llmCalls.map((c, i) => (i === 1 ? { ...c, label: "grounded.extract" } : c));
    await expectFailure(withCalls(rec, calls), /recorded call #2 \(grounded\.extract\) prompt .* ≠ frozen/);
  });
  it("unknown call label", async () => {
    const rec = await makeRecording();
    const calls = rec.output.llmCalls.map((c, i) => (i === 0 ? { ...c, label: "something.else" } : c));
    await expectFailure(withCalls(rec, calls), /unexpected label "something\.else"/);
  });
  it("missing recorded call", async () => {
    const rec = await makeRecording();
    await expectFailure(withCalls(rec, rec.output.llmCalls.slice(0, 1)), /missing recorded call/);
  });
  it("extra recorded call", async () => {
    const rec = await makeRecording();
    await expectFailure(withCalls(rec, [...rec.output.llmCalls, rec.output.llmCalls[1]]), /extra recorded call/);
  });
  it("recorded identity has different prompt hashes", async () => {
    const rec = await makeRecording();
    await expectFailure({ ...rec, system: { ...rec.system, promptHashes: { extract: "ffffffffffffffff", classify: rec.system.promptHashes.classify } } }, /prompt hashes .* ≠ frozen/);
  });
  it("a recorded call's prompt hash differs from the frozen prompt", async () => {
    const rec = await makeRecording();
    const calls = rec.output.llmCalls.map((c, i) => (i === 0 ? { ...c, promptHash: "ffffffffffffffff" } : c));
    await expectFailure(withCalls(rec, calls), /prompt ffffffffffffffff/);
  });
  it.each([
    ["grounded version", (r: DemoRecording) => ({ ...r, system: { ...r.system, version: "2.1" } }), /grounded version 2\.1/],
    ["policy", (r: DemoRecording) => ({ ...r, system: { ...r.system, policyConfig: "default-v2" } }), /policy default-v2/],
    ["validator", (r: DemoRecording) => ({ ...r, system: { ...r.system, validatorVersion: "meeting-v0" } }), /validator meeting-v0/],
    ["model", (r: DemoRecording) => ({ ...r, config: { ...r.config, model: "other-model" } }), /model config other-model/],
    ["effort", (r: DemoRecording) => ({ ...r, config: { ...r.config, effort: "high" as const } }), /model config .*\/high/],
  ])("frozen-version mismatch: %s", async (_, mutate, pattern) => {
    await expectFailure(mutate(await makeRecording()), pattern);
  });
  it("tampered recorded decision", async () => {
    const rec = await makeRecording();
    const tampered = { ...rec, output: { ...rec.output, fields: { ...rec.output.fields, nextMeeting: { ...rec.output.fields.nextMeeting, action: "ACT" as const } } } };
    await expectFailure(tampered, /field decisions differ/);
  });
  it("tampered recorded trace", async () => {
    const rec = await makeRecording();
    const trace = JSON.parse(JSON.stringify(rec.output.trace));
    trace.records[0].grounding.hasCustomerEvidence = false;
    await expectFailure({ ...rec, output: { ...rec.output, trace } }, /trace .* differs/);
  });
  it("tampered raw model response", async () => {
    const rec = await makeRecording();
    const altered = JSON.parse(rec.output.llmCalls[1].rawText!);
    altered.classifications[0].certainty = "TENTATIVE";
    const calls = rec.output.llmCalls.map((c, i) => (i === 1 ? { ...c, rawText: JSON.stringify(altered) } : c));
    await expectFailure(withCalls(rec, calls), /field decisions differ|model-call sequence/);
  });
});

describe("recording files", () => {
  it("are append-only: saving over an existing recording throws", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "grounded-rec-"));
    const rec = await makeRecording();
    saveRecording(rec, dir);
    expect(() => saveRecording(rec, dir)).toThrow(/EEXIST/);
  });
  it("reject an invalid recording before writing", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "grounded-rec-"));
    const rec = await makeRecording();
    expect(() => saveRecording({ ...rec, git: { ...rec.git, commit: "nope" } }, dir)).toThrow();
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});

// ───────────── Real demo recordings (data/demo) ─────────────

const files = listRecordingFiles();
const scenarios = Object.fromEntries(loadScenarios().map((s) => [s.id, s]));
const manifest = loadManifest();

describe("stored demo recordings", () => {
  it("exist and all parse with the recording schema", () => {
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(() => loadRecording(f), f).not.toThrow();
  });
  it.each(files)("%s replays through the frozen pipeline and reproduces the recording", async (f) => {
    const rec = loadRecording(f);
    const out = await replayAnalysis(rec, scenarios[rec.scenarioId]);
    expect(out.problems).toEqual([]);
    expect(out.ok).toBe(true);
  });
  it("are stored outside data/runs", () => {
    for (const f of files) expect(f.startsWith(path.join("data", "demo", "recordings"))).toBe(true);
  });
});

describe("RECORDINGS.json manifest", () => {
  it("lists every recording file exactly once, and nothing else", () => {
    expect(manifest.recordings.map((r) => r.file).sort()).toEqual(files);
    expect(new Set(manifest.recordings.map((r) => r.recordingId)).size).toBe(manifest.recordings.length);
  });
  it.each(manifest.recordings.map((e) => [e.recordingId, e] as const))("%s: entry matches the recording content", (_, entry) => {
    const rec = loadRecording(entry.file);
    const derived = summarizeRecording(rec, scenarios[rec.scenarioId], entry.file);
    const { selected, selectionReason } = entry;
    expect({ ...entry, selected: false, selectionReason: null }).toEqual(derived);
    if (selected) expect(selectionReason).toBeTruthy();
  });
  it("selects at most one recording per scenario", () => {
    const sel = manifest.recordings.filter((r) => r.selected).map((r) => r.scenarioId);
    expect(new Set(sel).size).toBe(sel.length);
  });
});
