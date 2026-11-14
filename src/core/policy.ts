/**
 * Deterministic ACT / ASK / ABSTAIN / NO_OP policy (SPEC.md §6, LABELING_GUIDE.md §4).
 *
 * The LLM never decides the action. This file takes:
 *   - the candidate claim (what was extracted),
 *   - the semantic classification (status / certainty / sufficiency, from the LLM),
 *   - the grounding result (deterministic),
 *   - the existing CRM value,
 * and applies explicit, ordered rules. Every rule that fires is recorded as a reason.
 */
import {
  ActionDecision,
  AnyFieldValue,
  CandidateClaim,
  CRM_FIELDS,
  CRMField,
  CRMState,
  FieldDecision,
  GroundingResult,
  MeetingValue,
  PolicyReason,
  SemanticClassification,
  Transcript,
  ValueValidation,
} from "./schemas";
import { validateClaim } from "./validation";
import { valuesEqual } from "./values";

/** Recorded with every run. Bump when any rule changes. */
/** v3 (Grounded v3): adds VALUE_UNVERIFIED as an ASK reason; no other rule changed (DECISIONS.md D21). */
export const POLICY_CONFIG = "default-v3";

export type ClaimPolicyInput = {
  claim: CandidateClaim;
  classification: SemanticClassification | null;
  grounding: GroundingResult;
  existing: AnyFieldValue | null;
  /** v3 structured-value validation. decideCase always supplies it; absent here means "not validated". */
  validation?: ValueValidation;
};

const STATUS_REASON = {
  NEGATED: "STATUS_NEGATED",
  HISTORICAL: "STATUS_HISTORICAL",
  SUPERSEDED: "STATUS_SUPERSEDED",
} as const;

function isUnderspecified(claim: CandidateClaim): boolean {
  // Only meetings can be underspecified: budget and decision-maker schemas require a concrete value.
  return claim.field === "nextMeeting" && (claim.value as MeetingValue).date === null;
}

/** Per-claim rules, evaluated in order. Rules 1–5 are terminal; rule 6 collects all ASK reasons. */
export function decideClaim({ claim, classification, grounding, existing, validation }: ClaimPolicyInput): ActionDecision {
  const decide = (action: ActionDecision["action"], reasons: PolicyReason[]): ActionDecision => ({
    claimId: claim.id,
    field: claim.field,
    action,
    reasons,
  });

  // 1. No valid semantic classification → fail safe.
  if (classification === null) return decide("ABSTAIN", ["CLASSIFICATION_MISSING"]);
  // 2. Evidence must be traceable to the transcript.
  if (!grounding.grounded) return decide("ABSTAIN", ["UNGROUNDED_EVIDENCE"]);
  // 3. Only claims about the current state can be written. The claim is kept in the trace as a signal.
  if (classification.status !== "CURRENT") return decide("ABSTAIN", [STATUS_REASON[classification.status]]);
  // 4. Evidence must bear on the field relationship at all.
  if (classification.sufficiency === "NONE") return decide("ABSTAIN", ["NO_SUPPORT"]);
  // 5. Identical to what the CRM already holds → corroboration, not a write.
  if (existing !== null && valuesEqual(claim.field, claim.value as never, existing as never)) {
    return decide("NO_OP", ["MATCHES_EXISTING"]);
  }
  // 6. Plausible but not safe to write autonomously.
  const ask: PolicyReason[] = [];
  if (existing !== null) ask.push("CONFLICTS_WITH_EXISTING"); // never overwrite autonomously (default config)
  if (classification.certainty === "TENTATIVE") ask.push("TENTATIVE");
  if (classification.certainty === "CONDITIONAL") ask.push("CONDITIONAL");
  if (classification.sufficiency === "INDIRECT") ask.push("INDIRECT_SUPPORT");
  if (!grounding.hasCustomerEvidence) ask.push("NO_CUSTOMER_EVIDENCE");
  if (isUnderspecified(claim)) ask.push("UNDERSPECIFIED_VALUE");
  // v3: a value component that contradicted or lacked support in its evidence can never be written autonomously.
  if (validation && !validation.verified) ask.push("VALUE_UNVERIFIED");
  if (ask.length > 0) return decide("ASK", ask);
  // 7. CURRENT + EXPLICIT + DIRECT + grounded + customer-stated + specific + no CRM conflict.
  return decide("ACT", ["SUPPORTED"]);
}

export type ClaimRecord = {
  /** The claim as decided on; for meetings, after validation may have nulled unverified components. */
  claim: CandidateClaim;
  classification: SemanticClassification | null;
  grounding: GroundingResult;
  validation: ValueValidation;
  decision: ActionDecision;
};

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/**
 * Combine per-claim decisions for ONE field into the field decision.
 * - decisionMaker only: if any surviving claim has DIRECT sufficiency (it establishes final
 *   authority), INDIRECT claims (involvement short of final authority) are signals, not competing
 *   values. They become ABSTAIN (OUTRANKED_BY_DIRECT) and stay in the trace (LABELING_GUIDE §4 step 4).
 * - Different values among the remaining ACT/ASK claims → conflict: ACT downgrades to ASK.
 *   For decisionMaker this means two different DIRECT claims conflict; joint approval is one claim
 *   listing every required signer, so it never conflicts with itself.
 * - Field action priority: ACT > ASK > NO_OP > ABSTAIN.
 * - ASK value = the ASK claim whose evidence appears latest in the transcript.
 */
export function reconcileField(
  field: CRMField,
  records: ClaimRecord[],
  transcript: Transcript,
): { decision: FieldDecision; claimDecisions: ActionDecision[] } {
  const own = records.filter((r) => r.claim.field === field);
  const claimIds = own.map((r) => r.claim.id);
  if (own.length === 0) {
    return { decision: { action: "ABSTAIN", value: null, reasons: ["NO_CANDIDATE"], claimIds }, claimDecisions: [] };
  }

  const decisions = new Map(own.map((r) => [r.claim.id, r.decision]));
  const surviving = (r: ClaimRecord) => r.decision.action !== "ABSTAIN"; // passed rules 1–4 (incl. NO_OP)

  if (field === "decisionMaker" && own.some((r) => surviving(r) && r.classification?.sufficiency === "DIRECT")) {
    for (const r of own) {
      if (surviving(r) && r.classification?.sufficiency === "INDIRECT") {
        decisions.set(r.claim.id, { ...r.decision, action: "ABSTAIN", reasons: ["OUTRANKED_BY_DIRECT"] });
      }
    }
  }

  const live = own.filter((r) => ["ACT", "ASK"].includes(decisions.get(r.claim.id)!.action));
  const conflict = live.some((a) => live.some((b) => !valuesEqual(field, a.claim.value as never, b.claim.value as never)));
  if (conflict) {
    for (const r of live) {
      const d = decisions.get(r.claim.id)!;
      decisions.set(r.claim.id, { ...d, action: "ASK", reasons: uniq([...d.reasons.filter((x) => x !== "SUPPORTED"), "CONFLICTING_CANDIDATES"]) });
    }
  }

  const claimDecisions = own.map((r) => decisions.get(r.claim.id)!);
  const done = (decision: FieldDecision) => ({ decision, claimDecisions });
  const withAction = (a: ActionDecision["action"]) => own.filter((r) => decisions.get(r.claim.id)!.action === a);
  const reasonsOf = (rs: ClaimRecord[]) => uniq(rs.flatMap((r) => decisions.get(r.claim.id)!.reasons));

  const acts = withAction("ACT");
  if (acts.length > 0) return done({ action: "ACT", value: acts[0].claim.value, reasons: reasonsOf(acts), claimIds });

  const asks = withAction("ASK");
  if (asks.length > 0) {
    const turnIndex = new Map(transcript.turns.map((t, i) => [t.id, i]));
    const latest = (r: ClaimRecord) => Math.max(...r.claim.evidence.map((e) => turnIndex.get(e.turnId) ?? -1));
    const chosen = asks.reduce((best, r) => (latest(r) > latest(best) ? r : best));
    return done({ action: "ASK", value: chosen.claim.value, reasons: reasonsOf(asks), claimIds });
  }

  const noops = withAction("NO_OP");
  if (noops.length > 0) return done({ action: "NO_OP", value: noops[0].claim.value, reasons: reasonsOf(noops), claimIds });

  return done({ action: "ABSTAIN", value: null, reasons: reasonsOf(own), claimIds });
}

/**
 * Full deterministic stage for one case: decide every claim, then reconcile per field.
 * `inputs` already carry grounding (computed by grounding.ts) and classification (from the LLM, or null).
 */
export function decideCase(
  inputs: Omit<ClaimPolicyInput, "existing">[],
  crm: CRMState,
  transcript: Transcript,
): { records: ClaimRecord[]; fields: Record<CRMField, FieldDecision> } {
  const initial: ClaimRecord[] = inputs.map((i) => {
    // Every claim is validated. Grounded validates before classification and passes the result in;
    // any other caller gets it computed here, so no path can skip validation.
    const v = i.validation ? { claim: i.claim, validation: i.validation } : validateClaim(i.claim, transcript);
    const input = { ...i, claim: v.claim, validation: v.validation };
    return { ...input, decision: decideClaim({ ...input, existing: crm[v.claim.field] }) };
  });
  const fields = {} as Record<CRMField, FieldDecision>;
  const finalDecisions = new Map<string, ActionDecision>();
  for (const f of CRM_FIELDS) {
    const { decision, claimDecisions } = reconcileField(f, initial, transcript);
    fields[f] = decision;
    for (const d of claimDecisions) finalDecisions.set(d.claimId, d);
  }
  // The trace shows each claim's FINAL decision (after conflict downgrades).
  const records = initial.map((r) => ({ ...r, decision: finalDecisions.get(r.claim.id) ?? r.decision }));
  return { records, fields };
}
