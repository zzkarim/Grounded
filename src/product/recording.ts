/**
 * Demo recordings (PRODUCT_PLAN.md §16, §18).
 *
 * A recording is one REAL run of the frozen Grounded v3 pipeline on a demo scenario. It stores the
 * exact input, the full SystemOutput (including every model call's raw text, usage and duration),
 * and the configuration it ran under. Recordings are append-only: they are written with an exclusive
 * flag, never modified, and never deleted, whatever their outcome.
 *
 * Demo recordings live under data/demo/, never under data/runs/ (experiment results).
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  ActionDecision,
  CandidateClaim,
  CRM_FIELDS,
  CRMField,
  CRMState,
  GroundingResult,
  PolicyReason,
  SemanticClassification,
  SystemOutput,
  Transcript,
  ValidationRule,
  ValueValidation,
  type Action,
} from "@/core/schemas";
import { DEMO_ROOT, matchesIntentValue } from "./scenarios";
import type { DemoScenario } from "./types";

export const RECORDINGS_DIR = path.join(DEMO_ROOT, "recordings");
export const MANIFEST_FILE = path.join(DEMO_ROOT, "RECORDINGS.json");

// ───────────────────────── Schemas ─────────────────────────

export const SystemIdentity = z.object({
  name: z.literal("grounded"),
  version: z.string(),
  policyConfig: z.string(),
  validatorVersion: z.string(),
  promptHashes: z.record(z.string(), z.string()),
});
export type SystemIdentity = z.infer<typeof SystemIdentity>;

export const ModelConfigRecord = z.object({ model: z.string(), effort: z.enum(["low", "medium", "high"]), maxTokens: z.number().int() });

export const DemoRecording = z.object({
  schemaVersion: z.literal(1),
  recordingId: z.string().min(1),
  scenarioId: z.string().min(1),
  recordedAt: z.string(),
  git: z.object({ commit: z.string().regex(/^[0-9a-f]{40}$/), cleanExceptRecordings: z.boolean() }),
  /** SHA-256 of the scenario file at recording time. */
  scenarioFileSha256: z.string().regex(/^[0-9a-f]{64}$/),
  /** Exactly what the system saw. */
  input: z.object({ caseId: z.string(), crm: CRMState, transcript: Transcript }),
  config: ModelConfigRecord,
  system: SystemIdentity,
  responseModels: z.array(z.string()),
  /** Wall-clock time of grounded.run(), including both model calls. */
  wallClockMs: z.number(),
  output: SystemOutput,
});
export type DemoRecording = z.infer<typeof DemoRecording>;

/** Grounded's trace (trace.records), as written by decideCase. */
export const GroundedTrace = z.object({
  records: z.array(
    z.object({
      claim: CandidateClaim,
      classification: SemanticClassification.nullable(),
      grounding: GroundingResult,
      validation: ValueValidation,
      decision: ActionDecision,
    }),
  ),
});

const FieldSummary = z.object({
  action: z.string(),
  value: z.unknown().nullable(),
  reasons: z.array(PolicyReason),
  matchesIntent: z.boolean(),
});

export const ManifestEntry = z.object({
  recordingId: z.string(),
  scenarioId: z.string(),
  recordedAt: z.string(),
  file: z.string(),
  gitCommit: z.string(),
  system: SystemIdentity,
  model: z.string(),
  effort: z.string(),
  error: z.string().nullable(),
  decisions: z.object({ budget: FieldSummary, decisionMaker: FieldSummary, nextMeeting: FieldSummary }),
  /** True if every field's action and value match the scenario's design intent (illustrative, not gold). */
  matchesIntent: z.boolean(),
  validatorFired: z.boolean(),
  validationRules: z.array(ValidationRule),
  modelCalls: z.number().int(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  /** Owner-reviewed selection for replay. At most one selected recording per scenario. */
  selected: z.boolean(),
  selectionReason: z.string().nullable(),
});
export type ManifestEntry = z.infer<typeof ManifestEntry>;

export const RecordingsManifest = z.object({
  schemaVersion: z.literal(1),
  note: z.string(),
  recordings: z.array(ManifestEntry),
});
export type RecordingsManifest = z.infer<typeof RecordingsManifest>;

// ───────────────────────── Summaries ─────────────────────────

export function traceRecords(output: SystemOutput) {
  if (output.trace === null || output.trace === undefined) return [];
  return GroundedTrace.parse(output.trace).records;
}

/** Derive the manifest entry from a recording. Selection fields start unselected. */
export function summarizeRecording(rec: DemoRecording, scenario: DemoScenario, file: string): ManifestEntry {
  const decisions = Object.fromEntries(
    CRM_FIELDS.map((f: CRMField) => {
      const d = rec.output.fields[f];
      const intent = scenario.designIntent.fields[f];
      const matches = d.action === intent.expectedAction && matchesIntentValue(f, d.value ?? null, intent.expectedValue);
      return [f, { action: d.action as Action, value: d.value ?? null, reasons: d.reasons, matchesIntent: matches }];
    }),
  ) as ManifestEntry["decisions"];
  const rules = [...new Set(traceRecords(rec.output).flatMap((r) => r.validation.issues.map((i) => i.rule)))];
  const calls = rec.output.llmCalls;
  return {
    recordingId: rec.recordingId,
    scenarioId: rec.scenarioId,
    recordedAt: rec.recordedAt,
    file,
    gitCommit: rec.git.commit,
    system: rec.system,
    model: rec.config.model,
    effort: rec.config.effort,
    error: rec.output.error,
    decisions,
    matchesIntent: CRM_FIELDS.every((f) => decisions[f].matchesIntent),
    validatorFired: rules.length > 0,
    validationRules: rules,
    modelCalls: calls.length,
    inputTokens: calls.reduce((n, c) => n + (c.usage?.inputTokens ?? 0), 0),
    outputTokens: calls.reduce((n, c) => n + (c.usage?.outputTokens ?? 0), 0),
    selected: false,
    selectionReason: null,
  };
}

// ───────────────────────── Files ─────────────────────────

export const timestampId = (iso: string) => iso.replace(/[:.]/g, "-");

/** Append-only write. Throws if the file already exists. Returns the repo-relative path. */
export function saveRecording(rec: DemoRecording, root = RECORDINGS_DIR): string {
  DemoRecording.parse(rec);
  const dir = path.join(root, rec.scenarioId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${timestampId(rec.recordedAt)}.json`);
  fs.writeFileSync(file, JSON.stringify(rec, null, 2) + "\n", { flag: "wx" });
  return path.relative(process.cwd(), file);
}

export function loadRecording(file: string): DemoRecording {
  return DemoRecording.parse(JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), "utf8")));
}

export function listRecordingFiles(root = RECORDINGS_DIR): string[] {
  if (!fs.existsSync(root)) return [];
  return (fs.readdirSync(root, { recursive: true }) as string[])
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.relative(process.cwd(), path.join(root, f)))
    .sort();
}

export function loadManifest(file = MANIFEST_FILE): RecordingsManifest {
  if (!fs.existsSync(file)) {
    return {
      schemaVersion: 1,
      note: "Every demo recording attempt, successful or not. Entries are never removed. Selection for replay is an owner decision.",
      recordings: [],
    };
  }
  return RecordingsManifest.parse(JSON.parse(fs.readFileSync(file, "utf8")));
}

/** Add an entry. Existing entries are never removed or rewritten here. */
export function appendManifestEntry(entry: ManifestEntry, file = MANIFEST_FILE): void {
  const m = loadManifest(file);
  if (m.recordings.some((r) => r.recordingId === entry.recordingId)) throw new Error(`manifest already has ${entry.recordingId}`);
  m.recordings.push(ManifestEntry.parse(entry));
  fs.writeFileSync(file, JSON.stringify(m, null, 2) + "\n");
}
