/**
 * Deterministic CRM value comparison (LABELING_GUIDE.md §5).
 * Used for NO_OP detection, conflicting-candidate detection, and scoring.
 */
import {
  BudgetValue,
  CRMField,
  DecisionMakerValue,
  FieldValueMap,
  MeetingValue,
  Person,
  VALUE_SCHEMAS,
} from "./schemas";

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

export function budgetEquals(a: BudgetValue, b: BudgetValue): boolean {
  if (a.currency !== b.currency) return false;
  if (a.kind === "exact" && b.kind === "exact") return a.amount === b.amount;
  if (a.kind === "range" && b.kind === "range") return a.min === b.min && a.max === b.max;
  return false; // exact never equals range
}

/** "Sarah" matches "Sarah Chen" (single token vs same first token); otherwise exact after normalization. */
export function namesMatch(a: string, b: string): boolean {
  const ta = norm(a).split(" ");
  const tb = norm(b).split(" ");
  if (ta.join(" ") === tb.join(" ")) return true;
  if (ta.length === 1 || tb.length === 1) return ta[0] === tb[0];
  return false;
}

export function personMatches(a: Person, b: Person): boolean {
  if (a.name !== null && b.name !== null) return namesMatch(a.name, b.name);
  if (a.role !== null && b.role !== null) return norm(a.role) === norm(b.role);
  return false;
}

/** Set equality with one-to-one matching (greedy is fine for the small lists we see). */
export function decisionMakerEquals(a: DecisionMakerValue, b: DecisionMakerValue): boolean {
  if (a.people.length !== b.people.length) return false;
  const unused = [...b.people];
  for (const p of a.people) {
    const i = unused.findIndex((q) => personMatches(p, q));
    if (i === -1) return false;
    unused.splice(i, 1);
  }
  return true;
}

/** Same date (null == null) and same time when both are specified. Timezone/asStated ignored. */
export function meetingEquals(a: MeetingValue, b: MeetingValue): boolean {
  if (a.date !== b.date) return false;
  if (a.time !== null && b.time !== null) return a.time === b.time;
  return true;
}

export function valuesEqual<F extends CRMField>(field: F, a: FieldValueMap[F], b: FieldValueMap[F]): boolean {
  switch (field) {
    case "budget":
      return budgetEquals(a as BudgetValue, b as BudgetValue);
    case "decisionMaker":
      return decisionMakerEquals(a as DecisionMakerValue, b as DecisionMakerValue);
    case "nextMeeting":
      return meetingEquals(a as MeetingValue, b as MeetingValue);
    default:
      throw new Error(`unknown field ${field satisfies never}`);
  }
}

/**
 * Compare two untyped values (as stored in FieldDecision / gold labels).
 * Returns null if either is null; throws if a value has the wrong shape for the field,
 * because silently scoring a malformed value as "mismatch" would hide bugs.
 */
export function compareUnknown(field: CRMField, a: unknown, b: unknown): boolean | null {
  if (a === null || a === undefined || b === null || b === undefined) return null;
  const schema = VALUE_SCHEMAS[field];
  const pa = schema.parse(a) as FieldValueMap[typeof field];
  const pb = schema.parse(b) as FieldValueMap[typeof field];
  return valuesEqual(field, pa, pb);
}

/** Human-readable rendering for reports and the UI. */
export function formatValue(field: CRMField, v: unknown): string {
  if (v === null || v === undefined) return "—";
  const parsed = VALUE_SCHEMAS[field].safeParse(v);
  if (!parsed.success) return `<invalid ${field} value>`;
  const val = parsed.data;
  switch (field) {
    case "budget": {
      const b = val as BudgetValue;
      const f = (n: number) => n.toLocaleString("en-US");
      return b.kind === "exact" ? `${b.currency} ${f(b.amount)}` : `${b.currency} ${f(b.min)}–${f(b.max)}`;
    }
    case "decisionMaker":
      return (val as DecisionMakerValue).people
        .map((p) => [p.name, p.role && `(${p.role})`].filter(Boolean).join(" "))
        .join(" + ");
    case "nextMeeting": {
      const m = val as MeetingValue;
      const when = [m.date ?? "date unspecified", m.time, m.timezone].filter(Boolean).join(" ");
      return `${when} ["${m.asStated}"]`;
    }
  }
}
