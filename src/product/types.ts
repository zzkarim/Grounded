/**
 * Product-layer types (PRODUCT_PLAN.md §17). The product is built AROUND the frozen experiment:
 * it imports frozen schemas and functions, and never redefines or modifies them.
 */
import { z } from "zod";
import {
  Action,
  Certainty,
  ClaimStatus,
  CRMField,
  CRMState,
  Evidence,
  EvidenceSufficiency,
  Transcript,
  ValidationRule,
  type CaseInput,
  type SystemOutput,
} from "@/core/schemas";
import type { ClaimRecord } from "@/core/policy";

// ───────────────────────── Demo scenarios ─────────────────────────

/**
 * One hypothetical model output used for a deterministic dry run of a scenario: what the extractor
 * and classifier WOULD need to return for the design intent to hold. Never sent to a model and
 * never used as a few-shot example. It exists so the scenario's expected behaviour can be checked
 * against the real frozen policy before any API call.
 */
export const AssumedClaim = z.object({
  field: CRMField,
  value: z.unknown(),
  evidence: z.array(Evidence).min(1),
  status: ClaimStatus,
  certainty: Certainty,
  sufficiency: EvidenceSufficiency,
});
export type AssumedClaim = z.infer<typeof AssumedClaim>;

export const DryRun = z.object({
  /** e.g. "extractor resolves the date" vs "extractor leaves the date null". */
  label: z.string().min(1),
  claims: z.array(AssumedClaim),
  expect: z.record(CRMField, Action),
  /** Validation rules expected to fire across all claims in this dry run (empty = none). */
  expectValidationRules: z.array(ValidationRule),
});
export type DryRun = z.infer<typeof DryRun>;

export const FieldIntent = z.object({
  expectedAction: Action,
  /** Expected field value, in the frozen value schema for the field (null for ABSTAIN). */
  expectedValue: z.unknown().nullable(),
  why: z.string().min(1),
  /** Plausible model behaviours that would change the outcome, stated before recording. */
  risks: z.array(z.string()),
});
export type FieldIntent = z.infer<typeof FieldIntent>;

export const DemoScenario = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  account: z.object({ name: z.string().min(1), segment: z.string().min(1), stage: z.string().min(1) }),
  title: z.string().min(1),
  summary: z.string().min(1),
  /** What this scenario demonstrates, in presenter language. */
  showcases: z.array(z.string().min(1)).min(1),
  /** The ONLY inputs the system sees (as CaseInput). */
  crm: CRMState,
  transcript: Transcript,
  /** Design intent: NOT ground truth, NOT a benchmark label, never shown to the model. */
  designIntent: z.object({
    fields: z.object({ budget: FieldIntent, decisionMaker: FieldIntent, nextMeeting: FieldIntent }),
    dryRuns: z.array(DryRun).min(1),
  }),
});
export type DemoScenario = z.infer<typeof DemoScenario>;

export const toCaseInput = (s: DemoScenario): CaseInput => ({ caseId: s.id, crm: s.crm, transcript: s.transcript });

// ───────────────────────── Analysis results (replay or live) ─────────────────────────

export type AnalysisMode = "replay" | "experiment-trace";

export type AnalysisProvenance = {
  mode: AnalysisMode;
  /** Recording id, or the run file + case id for experiment traces. */
  source: string;
  recordedAt: string;
  model: string;
  effort: string;
  systemVersion: string;
  policyConfig: string;
  validatorVersion: string;
  promptHashes: Record<string, string>;
};

export type AnalysisResult = {
  input: CaseInput;
  output: SystemOutput;
  /** Grounded's per-claim records (trace.records), typed. */
  records: ClaimRecord[];
  provenance: AnalysisProvenance;
};
