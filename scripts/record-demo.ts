/**
 * npm run record-demo -- --scenarios corrigan,meridale,ardent
 *
 * Runs each named demo scenario ONCE through the REAL frozen Grounded v3 pipeline (real model calls,
 * costs money) and stores the result append-only under data/demo/recordings/<scenario>/.
 *
 * Guards:
 *   - model and effort must equal the frozen experiment configuration
 *   - the git tree must be clean apart from demo recordings and the manifest
 *   - no automatic retries of a scenario (the LLM client's single invalid-output retry is part of
 *     the frozen pipeline and is recorded like any other attempt)
 *   - every attempt is saved and added to data/demo/RECORDINGS.json, whatever its outcome
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { POLICY_CONFIG } from "@/core/policy";
import { VALIDATOR_VERSION } from "@/core/validation";
import { createAnthropicClient } from "@/llm/client";
import { DEFAULT_EFFORT, DEFAULT_MODEL, getModelConfig } from "@/llm/config";
import { grounded } from "@/systems/grounded";
import { errorOutput } from "@/systems/shared";
import { formatFieldValue } from "@/product/present";
import { appendManifestEntry, DemoRecording, saveRecording, summarizeRecording, timestampId } from "@/product/recording";
import { loadScenarioFile, SCENARIO_DIR } from "@/product/scenarios";
import { toCaseInput } from "@/product/types";
import type { SystemOutput } from "@/core/schemas";

const RECORDING_PATHS = ["data/demo/recordings", "data/demo/RECORDINGS.json"];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function loadDotEnv() {
  try {
    process.loadEnvFile(".env");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

async function main() {
  loadDotEnv();
  const ids = arg("scenarios")?.split(",").filter(Boolean) ?? [];
  if (ids.length === 0) {
    console.error("usage: npm run record-demo -- --scenarios <id>[,<id>...]");
    process.exit(2);
  }
  const present = (n: string) => (process.env[n]?.trim().length ?? 0) > 0;
  if (!present("ANTHROPIC_API_KEY") && !present("ANTHROPIC_AUTH_TOKEN")) {
    console.error("ANTHROPIC_API_KEY is not set (.env or shell).");
    process.exit(1);
  }

  const config = getModelConfig();
  if (config.model !== DEFAULT_MODEL || config.effort !== DEFAULT_EFFORT) {
    console.error(`Refusing: config ${config.model}/${config.effort} differs from the frozen experiment (${DEFAULT_MODEL}/${DEFAULT_EFFORT}).`);
    process.exit(1);
  }

  const dirty = git(["status", "--porcelain", "--", ".", ...RECORDING_PATHS.map((p) => `:(exclude)${p}`)]);
  if (dirty !== "") {
    console.error(`Refusing: working tree has uncommitted changes outside demo recordings:\n${dirty}`);
    process.exit(1);
  }
  const commit = git(["rev-parse", "HEAD"]);

  const llm = createAnthropicClient(config);
  for (const id of ids) {
    const file = path.join(SCENARIO_DIR, `${id}.json`);
    const scenario = loadScenarioFile(file);
    const input = toCaseInput(scenario);
    const recordedAt = new Date().toISOString();
    console.log(`\n■ ${id}: recording with ${config.model}, effort=${config.effort} …`);

    const started = Date.now();
    let output: SystemOutput;
    try {
      output = await grounded.run(input, llm);
    } catch (e) {
      output = errorOutput(input.caseId, grounded.name, `system threw: ${(e as Error).message}`, []);
    }
    const wallClockMs = Date.now() - started;

    const rec: DemoRecording = DemoRecording.parse({
      schemaVersion: 1,
      recordingId: `${id}_${timestampId(recordedAt)}`,
      scenarioId: id,
      recordedAt,
      git: { commit, cleanExceptRecordings: true },
      scenarioFileSha256: createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
      input,
      config,
      system: {
        name: "grounded",
        version: grounded.version,
        policyConfig: POLICY_CONFIG,
        validatorVersion: VALIDATOR_VERSION,
        promptHashes: grounded.promptHashes,
      },
      responseModels: [...new Set(output.llmCalls.map((c) => c.responseModel).filter((m): m is string => m !== null))],
      wallClockMs,
      output,
    });
    const saved = saveRecording(rec);
    const entry = summarizeRecording(rec, scenario, saved);
    appendManifestEntry(entry);

    console.log(`  saved ${saved}${output.error ? `  ERROR: ${output.error}` : ""}`);
    for (const f of ["budget", "decisionMaker", "nextMeeting"] as const) {
      const d = entry.decisions[f];
      console.log(`  ${f.padEnd(14)} ${d.action.padEnd(8)} ${formatFieldValue(f, d.value).padEnd(32)} ${d.reasons.join(",")}  ${d.matchesIntent ? "(as intended)" : "(DIFFERS from intent)"}`);
    }
    console.log(`  validator: ${entry.validatorFired ? entry.validationRules.join(",") : "did not fire"} · calls ${entry.modelCalls} · tokens ${entry.inputTokens} in / ${entry.outputTokens} out · ${wallClockMs} ms`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
