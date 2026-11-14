/**
 * Core data model for Grounded. Every type is inferred from its Zod schema,
 * so each shape is defined exactly once.
 *
 * Convention: optional data is `nullable` (always present, possibly null), not `optional`.
 * That keeps benchmark JSON explicit and matches what structured model outputs return.
 */
import { z } from "zod";

// ───────────────────────── CRM fields and values ─────────────────────────

export const CRM_FIELDS = ["budget", "decisionMaker", "nextMeeting"] as const;
export const CRMField = z.enum(CRM_FIELDS);
export type CRMField = z.infer<typeof CRMField>;

const Currency = z.string().regex(/^[A-Z]{3}$/, "ISO 4217 code, e.g. USD");

export const BudgetValue = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("exact"), amount: z.number().positive(), currency: Currency }),
  z.object({
    kind: z.literal("range"),
    min: z.number().positive(),
    max: z.number().positive(),
    currency: Currency,
  }),
]).refine((v) => v.kind === "exact" || v.min < v.max, { message: "range requires min < max" });
export type BudgetValue = z.infer<typeof BudgetValue>;

export const Person = z
  .object({ name: z.string().min(1).nullable(), role: z.string().min(1).nullable() })
  .refine((p) => p.name !== null || p.role !== null, { message: "person needs a name or a role" });
export type Person = z.infer<typeof Person>;

/** One or more people; several only when joint approval is explicitly required. */
export const DecisionMakerValue = z.object({ people: z.array(Person).min(1) });
export type DecisionMakerValue = z.infer<typeof DecisionMakerValue>;

export const MeetingValue = z.object({
  /** YYYY-MM-DD resolved against the call date; null if no specific day is resolvable. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  /** HH:MM, 24h; null if not stated or AM/PM unclear. */
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  /** As stated ("ET"); ignored in comparisons. */
  timezone: z.string().nullable(),
  /** Timing phrase as spoken; shown to reviewers, ignored in comparisons. */
  asStated: z.string().min(1),
});
export type MeetingValue = z.infer<typeof MeetingValue>;

export type FieldValueMap = {
  budget: BudgetValue;
  decisionMaker: DecisionMakerValue;
  nextMeeting: MeetingValue;
};
export type AnyFieldValue = FieldValueMap[CRMField];

export const VALUE_SCHEMAS = {
  budget: BudgetValue,
  decisionMaker: DecisionMakerValue,
  nextMeeting: MeetingValue,
} as const;

/** Existing CRM state. null = Unknown. */
export const CRMState = z.object({
  company: z.string().min(1),
  budget: BudgetValue.nullable(),
  decisionMaker: DecisionMakerValue.nullable(),
  nextMeeting: MeetingValue.nullable(),
});
export type CRMState = z.infer<typeof CRMState>;

// ───────────────────────── Transcript ─────────────────────────

export const Participant = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  side: z.enum(["rep", "customer"]),
  title: z.string().nullable(),
});
export type Participant = z.infer<typeof Participant>;

export const TranscriptTurn = z.object({
  id: z.string().min(1),
  speakerId: z.string().min(1),
  text: z.string().min(1),
});
export type TranscriptTurn = z.infer<typeof TranscriptTurn>;

export const Transcript = z
  .object({
    id: z.string().min(1),
    /** Call date, YYYY-MM-DD. Needed to resolve "Thursday". */
    occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    participants: z.array(Participant).min(2),
    turns: z.array(TranscriptTurn).min(1),
  })
  .superRefine((t, ctx) => {
    const ids = new Set(t.participants.map((p) => p.id));
    const turnIds = new Set<string>();
    for (const turn of t.turns) {
      if (!ids.has(turn.speakerId)) ctx.addIssue({ code: "custom", message: `turn ${turn.id}: unknown speaker ${turn.speakerId}` });
      if (turnIds.has(turn.id)) ctx.addIssue({ code: "custom", message: `duplicate turn id ${turn.id}` });
      turnIds.add(turn.id);
    }
  });
export type Transcript = z.infer<typeof Transcript>;

// ───────────────────────── Evidence and claims ─────────────────────────

export const Evidence = z.object({
  turnId: z.string().min(1),
  speakerId: z.string().min(1),
  quote: z.string().min(1),
});
export type Evidence = z.infer<typeof Evidence>;

export const Certainty = z.enum(["EXPLICIT", "TENTATIVE", "CONDITIONAL"]);
export type Certainty = z.infer<typeof Certainty>;

export const ClaimStatus = z.enum(["CURRENT", "HISTORICAL", "NEGATED", "SUPERSEDED"]);
export type ClaimStatus = z.infer<typeof ClaimStatus>;

export const EvidenceSufficiency = z.enum(["DIRECT", "INDIRECT", "NONE"]);
export type EvidenceSufficiency = z.infer<typeof EvidenceSufficiency>;

/** Output of Grounded Call 1 (plus an id we assign). No semantic labels yet. */
export const CandidateClaim = z.discriminatedUnion("field", [
  z.object({ id: z.string(), field: z.literal("budget"), value: BudgetValue, evidence: z.array(Evidence).min(1) }),
  z.object({ id: z.string(), field: z.literal("decisionMaker"), value: DecisionMakerValue, evidence: z.array(Evidence).min(1) }),
  z.object({ id: z.string(), field: z.literal("nextMeeting"), value: MeetingValue, evidence: z.array(Evidence).min(1) }),
]);
export type CandidateClaim = z.infer<typeof CandidateClaim>;

/** Output of Grounded Call 2, one per claim. */
export const SemanticClassification = z.object({
  claimId: z.string(),
  status: ClaimStatus,
  certainty: Certainty,
  sufficiency: EvidenceSufficiency,
  explanation: z.string(),
});
export type SemanticClassification = z.infer<typeof SemanticClassification>;

// ───────────────────────── Decisions ─────────────────────────

/** NO_OP = supported value identical to existing CRM value: not a write (DECISIONS.md D3). */
export const Action = z.enum(["ACT", "ASK", "ABSTAIN", "NO_OP"]);
export type Action = z.infer<typeof Action>;

export const PolicyReason = z.enum([
  // Grounded per-claim (in policy order)
  "CLASSIFICATION_MISSING",
  "UNGROUNDED_EVIDENCE",
  "STATUS_NEGATED",
  "STATUS_HISTORICAL",
  "STATUS_SUPERSEDED",
  "NO_SUPPORT",
  "MATCHES_EXISTING",
  "CONFLICTS_WITH_EXISTING",
  "TENTATIVE",
  "CONDITIONAL",
  "INDIRECT_SUPPORT",
  "NO_CUSTOMER_EVIDENCE",
  "UNDERSPECIFIED_VALUE",
  "SUPPORTED",
  // Field reconciliation
  "CONFLICTING_CANDIDATES",
  "NO_CANDIDATE",
  // Baselines
  "BASELINE_PROPOSED",
  "BASELINE_AUTO",
  "BASELINE_REVIEW",
  // Any system
  "SYSTEM_ERROR",
]);
export type PolicyReason = z.infer<typeof PolicyReason>;

export const GroundingFailure = z.object({
  evidenceIndex: z.number().int(),
  reason: z.enum(["UNKNOWN_TURN", "SPEAKER_MISMATCH", "QUOTE_NOT_IN_TURN"]),
});
export const GroundingResult = z.object({
  grounded: z.boolean(),
  hasCustomerEvidence: z.boolean(),
  failures: z.array(GroundingFailure),
});
export type GroundingResult = z.infer<typeof GroundingResult>;

/** Per-claim decision produced by the deterministic policy. */
export const ActionDecision = z.object({
  claimId: z.string(),
  field: CRMField,
  action: Action,
  reasons: z.array(PolicyReason).min(1),
});
export type ActionDecision = z.infer<typeof ActionDecision>;

/** Per-field decision: what every system ultimately outputs and what is scored. */
export const FieldDecision = z.object({
  action: Action,
  /** Shape matches the field (validated where produced). null for ABSTAIN. */
  value: z.unknown().nullable(),
  reasons: z.array(PolicyReason).min(1),
  claimIds: z.array(z.string()),
});
export type FieldDecision = z.infer<typeof FieldDecision>;

// ───────────────────────── Benchmark ─────────────────────────

export const CASE_TAGS = [
  "explicit", "tentative", "conditional", "negation", "historical", "supersession",
  "multiple_numbers", "multiple_stakeholders", "joint_approval", "pronouns", "filler_words",
  "mid_sentence_correction", "ambiguous_date", "irrelevant_info", "no_update",
  "explicit_but_insufficient", "unconfirmed_rep_statement", "messy_speech", "existing_value",
] as const;
export const CaseTag = z.enum(CASE_TAGS);
export type CaseTag = z.infer<typeof CaseTag>;

function expectedOutcome<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.object({
    action: Action,
    value: valueSchema.nullable(),
    status: ClaimStatus.nullable(),
    certainty: Certainty.nullable(),
    sufficiency: EvidenceSufficiency.nullable(),
    evidence: z.array(Evidence),
    rationale: z.string().min(1),
  });
}
export const ExpectedBudget = expectedOutcome(BudgetValue);
export const ExpectedDecisionMaker = expectedOutcome(DecisionMakerValue);
export const ExpectedMeeting = expectedOutcome(MeetingValue);

export const BenchmarkCase = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  split: z.enum(["dev", "test", "example"]),
  source: z.enum(["handwritten", "generated"]),
  labelStatus: z.enum(["draft", "reviewed"]),
  tags: z.array(CaseTag),
  description: z.string().min(1),
  crm: CRMState,
  transcript: Transcript,
  expected: z.object({
    budget: ExpectedBudget,
    decisionMaker: ExpectedDecisionMaker,
    nextMeeting: ExpectedMeeting,
  }),
  notes: z.string(),
});
export type BenchmarkCase = z.infer<typeof BenchmarkCase>;
export type ExpectedOutcome = BenchmarkCase["expected"][CRMField];

/** What a system is allowed to see: never labels, tags, or case notes. */
export type CaseInput = { caseId: string; crm: CRMState; transcript: Transcript };

// ───────────────────────── System outputs and runs ─────────────────────────

export const LLMCallRecord = z.object({
  label: z.string(),
  requestedModel: z.string(),
  /** Model id reported by the API response (null if the call failed before a response). */
  responseModel: z.string().nullable(),
  attempt: z.number().int(),
  promptHash: z.string(),
  durationMs: z.number(),
  stopReason: z.string().nullable(),
  rawText: z.string().nullable(),
  ok: z.boolean(),
  error: z.string().nullable(),
  usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }).nullable(),
});
export type LLMCallRecord = z.infer<typeof LLMCallRecord>;

export const SystemOutput = z.object({
  caseId: z.string(),
  system: z.string(),
  fields: z.object({ budget: FieldDecision, decisionMaker: FieldDecision, nextMeeting: FieldDecision }),
  /** System-specific inspectable detail (Grounded: claims + classifications + grounding + decisions). */
  trace: z.unknown(),
  llmCalls: z.array(LLMCallRecord),
  error: z.string().nullable(),
});
export type SystemOutput = z.infer<typeof SystemOutput>;

export const Outcome = z.enum([
  "CORRECT_ACT",          // gold ACT, pred ACT, value matches
  "WRONG_VALUE_ACT",      // gold ACT, pred ACT, value differs  (incorrect write)
  "UNSAFE_ACT",           // gold ≠ ACT, pred ACT               (incorrect write)
  "ACT_DOWNGRADED_TO_ASK",// gold ACT, pred ASK                 (lost coverage, safe)
  "MISSED_ACT",           // gold ACT, pred ABSTAIN/NO_OP
  "CORRECT_ASK",          // gold ASK, pred ASK, value matches
  "WRONG_VALUE_ASK",      // gold ASK, pred ASK, value differs
  "MISSED_ASK",           // gold ASK, pred ABSTAIN/NO_OP
  "UNNECESSARY_ASK",      // gold ABSTAIN/NO_OP, pred ASK
  "CORRECT_NO_CHANGE",    // gold ABSTAIN/NO_OP, pred ABSTAIN/NO_OP
]);
export type Outcome = z.infer<typeof Outcome>;

export const ScoredItem = z.object({
  caseId: z.string(),
  field: CRMField,
  source: z.enum(["handwritten", "generated"]),
  labelStatus: z.enum(["draft", "reviewed"]),
  tags: z.array(CaseTag),
  goldAction: Action,
  goldValue: z.unknown().nullable(),
  goldStatus: ClaimStatus.nullable(),
  goldCertainty: Certainty.nullable(),
  predAction: Action,
  predValue: z.unknown().nullable(),
  /** null when either side has no value to compare. */
  valueMatch: z.boolean().nullable(),
  outcome: Outcome,
  systemError: z.boolean(),
});
export type ScoredItem = z.infer<typeof ScoredItem>;

export const Ratio = z.object({ num: z.number(), den: z.number(), value: z.number().nullable() });
export type Ratio = z.infer<typeof Ratio>;

export const Metrics = z.object({
  items: z.number(),
  actPrecision: Ratio,
  coverage: Ratio,
  unsafeWriteRate: Ratio,
  reviewRate: Ratio,
  abstentionRate: Ratio,
  noOpRate: Ratio,
  wrongValueWrites: z.number(),
  systemErrors: z.number(),
  /** confusion[gold][pred] = count */
  confusion: z.record(z.string(), z.record(z.string(), z.number())),
  outcomes: z.record(z.string(), z.number()),
});
export type Metrics = z.infer<typeof Metrics>;

export const EvaluationRun = z.object({
  schemaVersion: z.literal(1),
  runId: z.string(),
  createdAt: z.string(),
  system: z.string(),
  systemVersion: z.string(),
  requestedModel: z.string(),
  /** Distinct model ids reported by the API across all calls in the run. */
  responseModels: z.array(z.string()),
  effort: z.string(),
  promptHashes: z.record(z.string(), z.string()),
  policyConfig: z.string(),
  split: z.enum(["dev", "test", "example"]),
  benchmarkFrozen: z.boolean(),
  caseFiles: z.array(z.object({ caseId: z.string(), sha256: z.string() })),
  outputs: z.array(SystemOutput),
  items: z.array(ScoredItem),
  metrics: z.object({
    overall: Metrics,
    byField: z.record(z.string(), Metrics),
    bySource: z.record(z.string(), Metrics),
    byLabelStatus: z.record(z.string(), Metrics),
    byTag: z.record(z.string(), Metrics),
    byGoldStatus: z.record(z.string(), Metrics),
    byGoldCertainty: z.record(z.string(), Metrics),
  }),
});
export type EvaluationRun = z.infer<typeof EvaluationRun>;
