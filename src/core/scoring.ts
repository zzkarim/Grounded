/**
 * Scoring: compare one system's field decision against the gold label for one (case, field) item,
 * then aggregate items into metrics (SPEC.md §9). Pure functions, no I/O.
 */
import {
  Action,
  BenchmarkCase,
  CRM_FIELDS,
  CRMField,
  FieldDecision,
  Metrics,
  Outcome,
  Ratio,
  ScoredItem,
  SystemOutput,
} from "./schemas";
import { compareForScoring } from "./values";

/**
 * Recorded with every run (EvaluationRun.scoringVersion). Runs without the field were scored with v1.
 * v1: meeting time compared only when both sides have one.
 * v2 (after DEV Run 1): meeting time must match exactly, null included (values.ts scoringValuesEqual).
 */
export const SCORING_VERSION = "v2";

export function classifyOutcome(gold: Action, pred: Action, valueMatch: boolean | null): Outcome {
  if (gold === "ACT") {
    if (pred === "ACT") return valueMatch ? "CORRECT_ACT" : "WRONG_VALUE_ACT";
    if (pred === "ASK") return "ACT_DOWNGRADED_TO_ASK";
    return "MISSED_ACT";
  }
  if (pred === "ACT") return "UNSAFE_ACT"; // gold is ASK, ABSTAIN, or NO_OP
  if (gold === "ASK") {
    if (pred === "ASK") return valueMatch ? "CORRECT_ASK" : "WRONG_VALUE_ASK";
    return "MISSED_ASK";
  }
  // gold is ABSTAIN or NO_OP: both mean "the CRM should not change"
  return pred === "ASK" ? "UNNECESSARY_ASK" : "CORRECT_NO_CHANGE";
}

export function scoreField(c: BenchmarkCase, field: CRMField, pred: FieldDecision, systemError: boolean): ScoredItem {
  const gold = c.expected[field];
  // A value only matters for ACT/ASK predictions; comparing an ABSTAIN's null is meaningless.
  const valueMatch = pred.action === "ACT" || pred.action === "ASK" ? compareForScoring(field, gold.value, pred.value) : null;
  return {
    caseId: c.id,
    field,
    source: c.source,
    labelStatus: c.labelStatus,
    tags: c.tags,
    goldAction: gold.action,
    goldValue: gold.value,
    goldStatus: gold.status,
    goldCertainty: gold.certainty,
    predAction: pred.action,
    predValue: pred.value ?? null,
    valueMatch,
    outcome: classifyOutcome(gold.action, pred.action, valueMatch),
    systemError,
  };
}

export function scoreCase(c: BenchmarkCase, out: SystemOutput): ScoredItem[] {
  if (out.caseId !== c.id) throw new Error(`output for ${out.caseId} scored against case ${c.id}`);
  return CRM_FIELDS.map((f) => scoreField(c, f, out.fields[f], out.error !== null));
}

function ratio(num: number, den: number): Ratio {
  return { num, den, value: den === 0 ? null : num / den };
}

export function computeMetrics(items: ScoredItem[]): Metrics {
  const count = (pred: (i: ScoredItem) => boolean) => items.filter(pred).length;
  const predActs = count((i) => i.predAction === "ACT");
  const correctActs = count((i) => i.outcome === "CORRECT_ACT");
  const goldActs = count((i) => i.goldAction === "ACT");
  const goldNotAct = items.length - goldActs;

  const actions: Action[] = ["ACT", "ASK", "ABSTAIN", "NO_OP"];
  const confusion: Record<string, Record<string, number>> = {};
  for (const g of actions) {
    confusion[g] = {};
    for (const p of actions) confusion[g][p] = count((i) => i.goldAction === g && i.predAction === p);
  }
  const outcomes: Record<string, number> = {};
  for (const o of Outcome.options) outcomes[o] = count((i) => i.outcome === o);

  return {
    items: items.length,
    actPrecision: ratio(correctActs, predActs),
    coverage: ratio(correctActs, goldActs),
    unsafeWriteRate: ratio(count((i) => i.outcome === "UNSAFE_ACT"), goldNotAct),
    reviewRate: ratio(count((i) => i.predAction === "ASK"), items.length),
    abstentionRate: ratio(count((i) => i.predAction === "ABSTAIN"), items.length),
    noOpRate: ratio(count((i) => i.predAction === "NO_OP"), items.length),
    wrongValueWrites: outcomes.WRONG_VALUE_ACT,
    systemErrors: count((i) => i.systemError),
    confusion,
    outcomes,
  };
}

export function groupMetrics(items: ScoredItem[], keysOf: (i: ScoredItem) => (string | null)[]): Record<string, Metrics> {
  const groups = new Map<string, ScoredItem[]>();
  for (const i of items) {
    for (const k of keysOf(i)) {
      const key = k ?? "none";
      groups.set(key, [...(groups.get(key) ?? []), i]);
    }
  }
  return Object.fromEntries([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, computeMetrics(v)]));
}

export function allMetrics(items: ScoredItem[]) {
  return {
    overall: computeMetrics(items),
    byField: groupMetrics(items, (i) => [i.field]),
    bySource: groupMetrics(items, (i) => [i.source]),
    byLabelStatus: groupMetrics(items, (i) => [i.labelStatus]),
    byTag: groupMetrics(items, (i) => i.tags),
    byGoldStatus: groupMetrics(items, (i) => [i.goldStatus]),
    byGoldCertainty: groupMetrics(items, (i) => [i.goldCertainty]),
  };
}
