/**
 * Presentation layer (PRODUCT_PLAN.md §8, R4).
 *
 * The human-readable "why" for every decision comes from this file: a fixed mapping from the
 * deterministic policy's reason codes. The classifier's free-text explanation is never the
 * authoritative explanation; the UI shows it only as a secondary "Model note".
 *
 * Pure functions, no I/O. Nothing here changes a decision; it only describes one.
 */
import type { ClaimRecord } from "@/core/policy";
import {
  VALUE_SCHEMAS,
  type Action,
  type BudgetValue,
  type Certainty,
  type ClaimStatus,
  type CRMField,
  type DecisionMakerValue,
  type EvidenceSufficiency,
  type FieldDecision,
  type MeetingValue,
  type Person,
  type PolicyReason,
  type Transcript,
  type ValidationRule,
} from "@/core/schemas";

// ───────────────────────── Fields ─────────────────────────

export const FIELD_LABEL: Record<CRMField, string> = {
  budget: "Budget",
  decisionMaker: "Decision maker",
  nextMeeting: "Next meeting",
};

// ───────────────────────── Actions ─────────────────────────

export type Tone = "written" | "review" | "held" | "current" | "error";

export type ActionPresentation = {
  label: string;
  /** Text glyph shown with the label, so meaning never depends on colour alone. */
  glyph: string;
  tone: Tone;
  /** What happens to the CRM. */
  crmEffect: string;
};

export const ACTION: Record<Action, ActionPresentation> = {
  ACT: { label: "Written", glyph: "✓", tone: "written", crmEffect: "Written to the CRM automatically." },
  ASK: { label: "Needs review", glyph: "!", tone: "review", crmEffect: "CRM unchanged until a person approves." },
  ABSTAIN: { label: "Not written", glyph: "–", tone: "held", crmEffect: "CRM unchanged." },
  NO_OP: { label: "Already current", glyph: "=", tone: "current", crmEffect: "CRM already holds this value." },
};

/** A field decision that came from a system error is shown as an error, not as an ordinary ABSTAIN. */
export function presentAction(decision: Pick<FieldDecision, "action" | "reasons">): ActionPresentation {
  if (decision.reasons.includes("SYSTEM_ERROR")) {
    return { label: "Analysis failed", glyph: "×", tone: "error", crmEffect: "Nothing was written." };
  }
  return ACTION[decision.action];
}

// ───────────────────────── Reasons ─────────────────────────

/** Where in the pipeline a reason originates. */
export type ReasonSource = "grounding" | "validation" | "classification" | "policy" | "reconciliation" | "system" | "baseline";

export type ReasonCopy = { short: string; explanation: string; source: ReasonSource };

/**
 * Exhaustive over PolicyReason: adding a reason to the frozen schema without copy here fails typecheck.
 * "source" says which stage produced the condition. The decision itself is always the policy's.
 */
export const REASON: Record<PolicyReason, ReasonCopy> = {
  SUPPORTED: { short: "Stated explicitly", explanation: "The customer stated it plainly, and the quote was verified in the transcript.", source: "policy" },
  TENTATIVE: { short: "Hedged", explanation: "The customer hedged or approximated it, so it isn't a confirmed fact.", source: "classification" },
  CONDITIONAL: { short: "Conditional", explanation: "It depends on something that hasn't happened yet, such as an approval.", source: "classification" },
  INDIRECT_SUPPORT: { short: "Indirect", explanation: "Relevant, but the evidence doesn't establish this field directly.", source: "classification" },
  CONFLICTS_WITH_EXISTING: { short: "Would overwrite CRM", explanation: "Would overwrite an existing CRM value. Grounded requires a person.", source: "policy" },
  VALUE_UNVERIFIED: { short: "Value didn't match quote", explanation: "Part of the model's structured value wasn't supported by the quoted words, so that part was removed.", source: "validation" },
  UNDERSPECIFIED_VALUE: { short: "No confirmed date", explanation: "There's no confirmed calendar date, so it can't be scheduled automatically.", source: "policy" },
  NO_CUSTOMER_EVIDENCE: { short: "Seller-only", explanation: "Only the seller said it; the customer didn't confirm it.", source: "grounding" },
  MATCHES_EXISTING: { short: "Matches CRM", explanation: "The customer confirmed what the CRM already holds. Nothing to change.", source: "policy" },
  CONFLICTING_CANDIDATES: { short: "Conflicting values", explanation: "The call contains different values for this field, so a person should pick.", source: "reconciliation" },
  OUTRANKED_BY_DIRECT: { short: "Not the final signer", explanation: "Someone else was named as the final decision maker; this person's role is supporting.", source: "reconciliation" },
  STATUS_NEGATED: { short: "Denied", explanation: "A speaker said this isn't true.", source: "classification" },
  STATUS_HISTORICAL: { short: "In the past", explanation: "It describes a past state, not the current one.", source: "classification" },
  STATUS_SUPERSEDED: { short: "Replaced", explanation: "It was later corrected or replaced in the conversation.", source: "classification" },
  NO_SUPPORT: { short: "Not this field", explanation: "Mentioned in the call, but it doesn't belong in this field (for example, a vendor's price isn't a budget).", source: "classification" },
  UNGROUNDED_EVIDENCE: { short: "Quote not found", explanation: "The cited quote couldn't be found verbatim in the transcript, so it was discarded.", source: "grounding" },
  CLASSIFICATION_MISSING: { short: "Unclassified", explanation: "The meaning couldn't be classified, so nothing was written.", source: "system" },
  NO_CANDIDATE: { short: "Not discussed", explanation: "Nothing in the call bears on this field.", source: "reconciliation" },
  SYSTEM_ERROR: { short: "Analysis failed", explanation: "The analysis failed, so nothing was written.", source: "system" },
  BASELINE_PROPOSED: { short: "Proposed", explanation: "The model proposed this update and it was written without checks.", source: "baseline" },
  BASELINE_AUTO: { short: "Model chose auto", explanation: "The model itself decided this was safe to write automatically.", source: "baseline" },
  BASELINE_REVIEW: { short: "Model chose review", explanation: "The model itself decided this needs review.", source: "baseline" },
};

/** Which reason leads the explanation when several apply. The most consequential first. */
const REASON_PRIORITY: PolicyReason[] = [
  "SYSTEM_ERROR",
  "CLASSIFICATION_MISSING",
  "UNGROUNDED_EVIDENCE",
  "CONFLICTS_WITH_EXISTING",
  "VALUE_UNVERIFIED",
  "CONFLICTING_CANDIDATES",
  "CONDITIONAL",
  "TENTATIVE",
  "NO_CUSTOMER_EVIDENCE",
  "INDIRECT_SUPPORT",
  "UNDERSPECIFIED_VALUE",
  "STATUS_NEGATED",
  "STATUS_SUPERSEDED",
  "STATUS_HISTORICAL",
  "NO_SUPPORT",
  "OUTRANKED_BY_DIRECT",
  "MATCHES_EXISTING",
  "SUPPORTED",
  "NO_CANDIDATE",
  "BASELINE_REVIEW",
  "BASELINE_AUTO",
  "BASELINE_PROPOSED",
];

/** Reasons ordered by importance (stable, deduplicated). */
export function orderReasons(reasons: readonly PolicyReason[]): PolicyReason[] {
  return [...new Set(reasons)].sort((a, b) => REASON_PRIORITY.indexOf(a) - REASON_PRIORITY.indexOf(b));
}

export function primaryReason(reasons: readonly PolicyReason[]): PolicyReason {
  const ordered = orderReasons(reasons);
  if (ordered.length === 0) throw new Error("a decision always has at least one reason");
  return ordered[0];
}

// ───────────────────────── Semantic labels (classification) ─────────────────────────

export const STATUS_LABEL: Record<ClaimStatus, string> = {
  CURRENT: "Current",
  HISTORICAL: "Past",
  NEGATED: "Denied",
  SUPERSEDED: "Replaced later in the call",
};
export const CERTAINTY_LABEL: Record<Certainty, string> = {
  EXPLICIT: "Stated plainly",
  TENTATIVE: "Hedged",
  CONDITIONAL: "Conditional",
};
export const SUFFICIENCY_LABEL: Record<EvidenceSufficiency, string> = {
  DIRECT: "Establishes the field",
  INDIRECT: "Related, not conclusive",
  NONE: "Not this field",
};

export const VALIDATION_RULE_LABEL: Record<ValidationRule, string> = {
  DATE_NOT_FUTURE: "The proposed date was not after the call date",
  DATE_UNSUPPORTED: "No date expression in the quote",
  DATE_WEEKDAY_MISMATCH: "Weekday doesn't match the date",
  DATE_DAY_MISMATCH: "Day of month doesn't match the date",
  DATE_MONTH_MISMATCH: "Month doesn't match the date",
  DATE_AMBIGUOUS_NEXT_WEEKDAY: "\"Next <weekday>\" is ambiguous",
  TIME_UNSUPPORTED: "Time not found in the quote",
};

// ───────────────────────── Pipeline (model vs code) ─────────────────────────

export type Lane = "MODEL" | "CODE";
export type StageId = "extract" | "ground" | "validate" | "classify" | "policy" | "reconcile";

export const PIPELINE: { id: StageId; lane: Lane; title: string; detail: string }[] = [
  { id: "extract", lane: "MODEL", title: "Extract", detail: "Candidate values with exact quotes" },
  { id: "ground", lane: "CODE", title: "Ground", detail: "Quote is in the cited turn, from that speaker" },
  { id: "validate", lane: "CODE", title: "Validate", detail: "Structured value matches its quote" },
  { id: "classify", lane: "MODEL", title: "Classify", detail: "Current? Hedged? Establishes the field?" },
  { id: "policy", lane: "CODE", title: "Policy", detail: "Seven ordered rules decide the action" },
  { id: "reconcile", lane: "CODE", title: "Reconcile", detail: "One decision per CRM field" },
];

// ───────────────────────── Value formatting ─────────────────────────

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-US")}`;
  }
}

export function formatBudget(v: BudgetValue): string {
  return v.kind === "exact" ? formatMoney(v.amount, v.currency) : `${formatMoney(v.min, v.currency)}–${formatMoney(v.max, v.currency)}`;
}

export function formatPerson(p: Person): string {
  if (p.name && p.role) return `${p.name} (${p.role})`;
  return (p.name ?? p.role)!;
}

export function formatDecisionMaker(v: DecisionMakerValue): string {
  return v.people.map(formatPerson).join(" + ");
}

/** "2026-11-12" → "Thu, Nov 12, 2026". Computed in UTC so the weekday never shifts with the viewer's timezone. */
export function formatDate(iso: string, opts: { year?: boolean } = {}): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const base = `${WEEKDAY_SHORT[d.getUTCDay()]}, ${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return opts.year ? `${base}, ${d.getUTCFullYear()}` : base;
}

/** "14:00" → "2:00 PM", "09:30" → "9:30 AM". */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

const TIMEZONE_SHORT: Record<string, string> = {
  "america/new_york": "ET", "us/eastern": "ET", eastern: "ET", "eastern time": "ET", et: "ET", est: "ET", edt: "ET",
  "america/chicago": "CT", "us/central": "CT", central: "CT", "central time": "CT", ct: "CT", cst: "CT", cdt: "CT",
  "america/denver": "MT", "us/mountain": "MT", mountain: "MT", "mountain time": "MT", mt: "MT", mst: "MT", mdt: "MT",
  "america/los_angeles": "PT", "us/pacific": "PT", pacific: "PT", "pacific time": "PT", pt: "PT", pst: "PT", pdt: "PT",
  utc: "UTC", gmt: "GMT", "etc/utc": "UTC",
};

/**
 * Human-readable timezone for display only ("America/New_York" → "ET"). The stored value is untouched;
 * timezones are ignored by every comparison in the frozen system.
 */
export function formatTimezone(tz: string): string {
  const key = tz.trim().toLowerCase();
  if (TIMEZONE_SHORT[key]) return TIMEZONE_SHORT[key];
  if (key.includes("/")) return `${tz.trim().split("/").pop()!.replace(/_/g, " ")} time`;
  return tz.trim();
}

export function formatMeeting(v: MeetingValue): string {
  const date = v.date ? formatDate(v.date) : "Date not confirmed";
  const time = v.time ? formatTime(v.time) : null;
  return [date, time && `${time}${v.timezone ? ` ${formatTimezone(v.timezone)}` : ""}`].filter(Boolean).join(" · ");
}

/** Format any field value (untyped, as stored in FieldDecision / traces). Never throws. */
export function formatFieldValue(field: CRMField, value: unknown): string {
  if (value === null || value === undefined) return "—";
  const parsed = VALUE_SCHEMAS[field].safeParse(value);
  if (!parsed.success) return "Unreadable value";
  switch (field) {
    case "budget":
      return formatBudget(parsed.data as BudgetValue);
    case "decisionMaker":
      return formatDecisionMaker(parsed.data as DecisionMakerValue);
    case "nextMeeting":
      return formatMeeting(parsed.data as MeetingValue);
  }
}

/**
 * Display qualifier for how a value was asserted. A hedged amount is shown as "~$100,000".
 * Presentation only: the stored value is never changed, and the trace shows the certainty label.
 */
export function qualifiedValue(field: CRMField, value: unknown, certainty: Certainty | null): string {
  const text = formatFieldValue(field, value);
  if (value === null || value === undefined) return text;
  if (field === "budget" && certainty === "TENTATIVE") return `~${text}`;
  return text;
}

// ───────────────────────── "Everything Grounded heard" ─────────────────────────

export type LedgerEntry = {
  claimId: string;
  field: CRMField;
  value: string;
  /** "decision": this claim backs the field's ACT/ASK/NO_OP. "heard": kept in the trace, not written. */
  group: "decision" | "heard";
  /** Plain-language note derived from the claim's final decision reasons and labels. */
  note: string;
  action: Action;
  quotes: { turnId: string; speaker: string; side: "rep" | "customer" | "unknown"; quote: string }[];
};

/**
 * Every candidate claim actually present in the trace, and nothing else. Never synthesizes context.
 * Ordered by first evidence position in the transcript.
 */
export function ledgerEntries(records: ClaimRecord[], transcript: Transcript): LedgerEntry[] {
  const people = new Map(transcript.participants.map((p) => [p.id, p]));
  const turnIndex = new Map(transcript.turns.map((t, i) => [t.id, i]));
  const firstTurn = (r: ClaimRecord) => Math.min(...r.claim.evidence.map((e) => turnIndex.get(e.turnId) ?? Number.MAX_SAFE_INTEGER));

  return [...records]
    .sort((a, b) => firstTurn(a) - firstTurn(b))
    .map((r) => {
      const { action, reasons } = r.decision;
      const group = action === "ABSTAIN" ? "heard" : "decision";
      const lead = REASON[primaryReason(reasons)];
      const certainty = r.classification?.certainty ?? null;
      return {
        claimId: r.claim.id,
        field: r.claim.field,
        value: qualifiedValue(r.claim.field, r.claim.value, certainty),
        group,
        note: lead.explanation,
        action,
        quotes: r.claim.evidence.map((e) => {
          const p = people.get(e.speakerId);
          return { turnId: e.turnId, speaker: p?.name ?? e.speakerId, side: p?.side ?? "unknown", quote: e.quote };
        }),
      };
    });
}
