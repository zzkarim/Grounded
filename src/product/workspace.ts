/**
 * Workspace view model (PRODUCT_PLAN.md §6.1). A pure function from a VERIFIED replay to everything
 * the Workspace renders. The UI never reinterprets frozen output; it only displays this model.
 *
 * Sources of truth:
 *   - field decisions, values and reasons: the re-executed SystemOutput (identical to the recording)
 *   - per-claim stages: the re-executed trace.records (claim, grounding, validation, classification, decision)
 *   - "Policy applied" per claim: the frozen decideClaim() re-run on that record, BEFORE reconciliation,
 *     so the drawer can show what reconciliation changed (e.g. OUTRANKED_BY_DIRECT)
 *   - explanations: deterministic reason-code copy (present.ts); the classifier's prose is only a "model note"
 */
import { isDeepStrictEqual } from "node:util";
import { decideClaim, type ClaimRecord } from "@/core/policy";
import { CRM_FIELDS, type Action, type CRMField, type CRMState, type FieldDecision, type PolicyReason } from "@/core/schemas";
import {
  CERTAINTY_LABEL,
  FIELD_LABEL,
  formatDate,
  formatFieldValue,
  orderReasons,
  PIPELINE,
  presentAction,
  REASON,
  STATUS_LABEL,
  SUFFICIENCY_LABEL,
  VALIDATION_RULE_LABEL,
  type ActionPresentation,
  type Lane,
  type ReasonSource,
  type StageId,
  type Tone,
} from "./present";
import type { ReplayOutcome } from "./replay";
import type { DemoScenario } from "./types";

// ───────────────────────── Types ─────────────────────────

export type ReasonView = { code: PolicyReason; short: string; explanation: string; source: ReasonSource };
export type Side = "rep" | "customer" | "unknown";
export type QuoteView = { key: string; claimId: string; turnId: string; speaker: string; side: Side; quote: string };

export type ValidationView = {
  /** meeting-v1 validates meetings only. */
  applicable: boolean;
  verified: boolean;
  issues: { component: "date" | "time"; rule: string; label: string; detail: string }[];
  /** True when validation removed part of the model's value. */
  changed: boolean;
  /** The model's value before validation, and the value Grounded kept. */
  extractedText: string;
  keptText: string;
  removed: ("date" | "time")[];
};

export type ClaimView = {
  claimId: string;
  field: CRMField;
  fieldLabel: string;
  value: unknown;
  valueText: string;
  /** "decision": backs the field's ACT/ASK/NO_OP. "heard": kept in the trace, not written. */
  group: "decision" | "heard";
  quotes: QuoteView[];
  extracted: { value: unknown; valueText: string };
  grounding: {
    ok: boolean;
    customerEvidence: boolean;
    items: { turnId: string; speaker: string; side: Side; quote: string; failure: string | null }[];
  };
  validation: ValidationView;
  classification: {
    status: string;
    certainty: string;
    sufficiency: string;
    statusLabel: string;
    certaintyLabel: string;
    sufficiencyLabel: string;
    /** The classifier's free text. Secondary; never the authoritative explanation. */
    modelNote: string;
  } | null;
  /** Frozen decideClaim() on this record alone, before field reconciliation. */
  policy: { action: Action; reasons: ReasonView[] };
  /** The claim's final decision after reconciliation (as recorded in the trace). */
  final: { action: Action; label: string; tone: Tone; reasons: ReasonView[]; changedByReconciliation: boolean };
  /** Plain-language note for the ledger, from the final decision's lead reason. */
  note: string;
  noteShort: string;
};

export type FieldView = {
  field: CRMField;
  label: string;
  action: Action;
  presentation: ActionPresentation;
  value: unknown;
  valueText: string;
  reasons: ReasonView[];
  primary: ReasonView;
  secondary: ReasonView[];
  /** Non-default labels of the deciding claim, e.g. "Conditional", "Related, not conclusive". */
  qualifiers: string[];
  decidingClaimId: string | null;
  claimIds: string[];
  primaryQuote: QuoteView | null;
  /** CRM value before this call (null = empty). */
  existing: { value: unknown; text: string } | null;
  /** ASK because it would replace a different existing CRM value. */
  conflict: boolean;
  /** Present when meeting-v1 removed part of the deciding claim's value. */
  validatorChange: { extractedText: string; keptText: string; removed: ("date" | "time")[]; issues: ValidationView["issues"] } | null;
};

export type StageView = { id: StageId; lane: Lane; title: string; detail: string; metric: string; attention: boolean };

export type ProvenanceView = {
  ok: boolean;
  problems: string[];
  recordingId: string;
  recordedAt: string;
  replayedAt: string;
  model: string;
  effort: string;
  systemVersion: string;
  policyConfig: string;
  validatorVersion: string;
  promptHashes: Record<string, string>;
  calls: { label: string; attempt: number; ok: boolean; responseModel: string | null; inputTokens: number | null; outputTokens: number | null; durationMs: number }[];
};

export type WorkspaceView = {
  scenario: { id: string; accountName: string; segment: string; stage: string; title: string; summary: string; occurredAt: string; occurredAtText: string };
  participants: { id: string; name: string; side: Side; title: string | null }[];
  turns: { id: string; speakerId: string; text: string }[];
  crmBefore: CRMState;
  fields: FieldView[];
  claims: ClaimView[];
  ledger: { decision: ClaimView[]; heard: ClaimView[] };
  stages: StageView[];
  error: string | null;
  provenance: ProvenanceView;
};

// ───────────────────────── Builders ─────────────────────────

const reasonView = (code: PolicyReason): ReasonView => ({ code, ...REASON[code] });
const reasonViews = (codes: readonly PolicyReason[]) => orderReasons(codes).map(reasonView);

function buildClaim(r: ClaimRecord, s: DemoScenario): ClaimView {
  const people = new Map(s.transcript.participants.map((p) => [p.id, p]));
  const field = r.claim.field;
  const quotes: QuoteView[] = r.claim.evidence.map((e, i) => ({
    key: `${r.claim.id}:${i}`,
    claimId: r.claim.id,
    turnId: e.turnId,
    speaker: people.get(e.speakerId)?.name ?? e.speakerId,
    side: people.get(e.speakerId)?.side ?? "unknown",
    quote: e.quote,
  }));
  const failures = new Map(r.grounding.failures.map((f) => [f.evidenceIndex, f.reason]));

  const extractedValue = r.validation.originalValue ?? r.claim.value;
  const removed = (["date", "time"] as const).filter((c) => r.validation.issues.some((i) => i.component === c));
  const validation: ValidationView = {
    applicable: field === "nextMeeting",
    verified: r.validation.verified,
    issues: r.validation.issues.map((i) => ({ component: i.component, rule: i.rule, label: VALIDATION_RULE_LABEL[i.rule], detail: i.detail })),
    changed: r.validation.originalValue !== null,
    extractedText: formatFieldValue(field, extractedValue),
    keptText: formatFieldValue(field, r.claim.value),
    removed,
  };

  const c = r.classification;
  const policy = decideClaim({ claim: r.claim, classification: c, grounding: r.grounding, existing: s.crm[field], validation: r.validation });
  const final = r.decision;
  const finalPresentation = presentAction({ action: final.action, reasons: final.reasons });
  const lead = reasonView(orderReasons(final.reasons)[0]);

  return {
    claimId: r.claim.id,
    field,
    fieldLabel: FIELD_LABEL[field],
    value: r.claim.value,
    valueText: formatFieldValue(field, r.claim.value),
    group: final.action === "ABSTAIN" ? "heard" : "decision",
    quotes,
    extracted: { value: extractedValue, valueText: formatFieldValue(field, extractedValue) },
    grounding: {
      ok: r.grounding.grounded,
      customerEvidence: r.grounding.hasCustomerEvidence,
      items: quotes.map((q, i) => ({ turnId: q.turnId, speaker: q.speaker, side: q.side, quote: q.quote, failure: failures.get(i) ?? null })),
    },
    validation,
    classification: c && {
      status: c.status,
      certainty: c.certainty,
      sufficiency: c.sufficiency,
      statusLabel: STATUS_LABEL[c.status],
      certaintyLabel: CERTAINTY_LABEL[c.certainty],
      sufficiencyLabel: SUFFICIENCY_LABEL[c.sufficiency],
      modelNote: c.explanation,
    },
    policy: { action: policy.action, reasons: reasonViews(policy.reasons) },
    final: {
      action: final.action,
      label: finalPresentation.label,
      tone: finalPresentation.tone,
      reasons: reasonViews(final.reasons),
      changedByReconciliation: policy.action !== final.action || !isDeepStrictEqual([...policy.reasons].sort(), [...final.reasons].sort()),
    },
    note: lead.explanation,
    noteShort: lead.short,
  };
}

function preferredQuote(c: ClaimView | undefined): QuoteView | null {
  if (!c) return null;
  return c.quotes.find((q) => q.side === "customer") ?? c.quotes[0] ?? null;
}

function buildField(field: CRMField, d: FieldDecision, claims: ClaimView[], s: DemoScenario): FieldView {
  const own = claims.filter((c) => c.field === field);
  const deciding =
    d.action === "ABSTAIN"
      ? undefined
      : own.find((c) => c.final.action === d.action && isDeepStrictEqual(c.value, d.value)) ?? own.find((c) => c.final.action === d.action);
  const reasons = reasonViews(d.reasons);
  const existingValue = s.crm[field];
  const qualifiers: string[] = [];
  if (deciding?.classification) {
    if (deciding.classification.certainty !== "EXPLICIT") qualifiers.push(deciding.classification.certaintyLabel);
    if (deciding.classification.sufficiency !== "DIRECT") qualifiers.push(deciding.classification.sufficiencyLabel);
  }
  return {
    field,
    label: FIELD_LABEL[field],
    action: d.action,
    presentation: presentAction(d),
    value: d.value ?? null,
    valueText: formatFieldValue(field, d.value),
    reasons,
    primary: reasons[0],
    secondary: reasons.slice(1),
    qualifiers,
    decidingClaimId: deciding?.claimId ?? null,
    claimIds: d.claimIds,
    primaryQuote: preferredQuote(deciding),
    existing: existingValue === null ? null : { value: existingValue, text: formatFieldValue(field, existingValue) },
    conflict: d.reasons.includes("CONFLICTS_WITH_EXISTING"),
    validatorChange:
      deciding && deciding.validation.changed
        ? { extractedText: deciding.validation.extractedText, keptText: deciding.validation.keptText, removed: deciding.validation.removed, issues: deciding.validation.issues }
        : null,
  };
}

function buildStages(claims: ClaimView[], fields: FieldView[], ok: boolean): StageView[] {
  const n = claims.length;
  const grounded = claims.filter((c) => c.grounding.ok).length;
  const meetings = claims.filter((c) => c.validation.applicable);
  const changed = meetings.filter((c) => c.validation.changed);
  const classified = claims.filter((c) => c.classification !== null).length;
  const count = (a: Action) => fields.filter((f) => f.action === a).length;
  const plural = (k: number, w: string) => `${k} ${w}${k === 1 ? "" : "s"}`;
  const policyLines = [
    count("ACT") && `${count("ACT")} written`,
    count("ASK") && `${count("ASK")} to review`,
    count("NO_OP") && `${count("NO_OP")} already current`,
    count("ABSTAIN") && `${count("ABSTAIN")} not written`,
  ].filter(Boolean);
  // Validation only ever REMOVES components; say exactly what it removed.
  const removedParts = (["date", "time"] as const)
    .map((comp) => [comp, changed.filter((c) => c.validation.removed.includes(comp)).length] as const)
    .filter(([, k]) => k > 0)
    .map(([comp, k]) => plural(k, comp) + " removed");

  const metric: Record<StageId, [string, boolean]> = {
    extract: [plural(n, "candidate"), false],
    ground: [`${grounded}/${n} quotes verbatim`, grounded < n],
    validate: [
      meetings.length === 0 ? "No meeting to check" : changed.length > 0 ? removedParts.join(", ") : `${plural(meetings.length, "meeting")} verified`,
      changed.length > 0,
    ],
    classify: [`${classified}/${n} labeled`, classified < n],
    policy: [policyLines.join("\n"), false],
    reconcile: ["One decision per field", false],
  };
  return PIPELINE.filter((p) => p.id !== "reconcile").map((p) => ({
    ...p,
    metric: ok ? metric[p.id][0] : "—",
    attention: ok && metric[p.id][1],
  }));
}

export function buildWorkspaceView(s: DemoScenario, replay: ReplayOutcome, replayedAt: string): WorkspaceView {
  if (!replay.result) throw new Error(`replay of ${s.id} produced no result: ${replay.problems.join("; ")}`);
  const { output, records, provenance } = replay.result;

  const claims = records.map((r) => buildClaim(r, s));
  const turnIndex = new Map(s.transcript.turns.map((t, i) => [t.id, i]));
  const firstTurn = (c: ClaimView) => Math.min(...c.quotes.map((q) => turnIndex.get(q.turnId) ?? Number.MAX_SAFE_INTEGER));
  const ordered = [...claims].sort((a, b) => firstTurn(a) - firstTurn(b));
  const fields = CRM_FIELDS.map((f) => buildField(f, output.fields[f], claims, s));

  return {
    scenario: {
      id: s.id,
      accountName: s.account.name,
      segment: s.account.segment,
      stage: s.account.stage,
      title: s.title,
      summary: s.summary,
      occurredAt: s.transcript.occurredAt,
      occurredAtText: formatDate(s.transcript.occurredAt, { year: true }),
    },
    participants: s.transcript.participants.map((p) => ({ id: p.id, name: p.name, side: p.side, title: p.title })),
    turns: s.transcript.turns.map((t) => ({ ...t })),
    crmBefore: s.crm,
    fields,
    claims: ordered,
    ledger: { decision: ordered.filter((c) => c.group === "decision"), heard: ordered.filter((c) => c.group === "heard") },
    stages: buildStages(claims, fields, replay.ok),
    error: output.error,
    provenance: {
      ok: replay.ok,
      problems: replay.problems,
      recordingId: provenance.source,
      recordedAt: provenance.recordedAt,
      replayedAt,
      model: provenance.model,
      effort: provenance.effort,
      systemVersion: provenance.systemVersion,
      policyConfig: provenance.policyConfig,
      validatorVersion: provenance.validatorVersion,
      promptHashes: provenance.promptHashes,
      calls: output.llmCalls.map((c) => ({
        label: c.label,
        attempt: c.attempt,
        ok: c.ok,
        responseModel: c.responseModel,
        inputTokens: c.usage?.inputTokens ?? null,
        outputTokens: c.usage?.outputTokens ?? null,
        durationMs: c.durationMs,
      })),
    },
  };
}

