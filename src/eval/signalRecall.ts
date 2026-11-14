/**
 * SIGNAL RECALL: a DIAGNOSTIC for Grounded only (POST_RUN1_DECISIONS.md §4). Not a headline metric.
 *
 * Question: of the claims the gold labels explicitly record, how many did Grounded's extraction
 * produce as candidates, whatever happened to them afterwards?
 *
 * Why it's separate: a system can ABSTAIN correctly while failing to preserve useful negative or
 * historical context ("ABSTAIN must not discard information"). The autonomous-write metrics can't
 * see that.
 *
 * Definitions:
 *   - Gold signal: a (case, field) whose gold `value` is non-null. That is the ACT/ASK/NO_OP value,
 *     or the tempting wrong value an ABSTAIN records (LABELING_GUIDE §6). Fields with value null
 *     record no claim and are excluded.
 *   - Recalled: Grounded's trace contains at least one candidate claim for that field whose value
 *     is the SAME FACT as the gold value. Same fact uses the semantic equality the policy uses
 *     (values.ts valuesEqual), not scoring's exact match, because this asks whether the signal was
 *     preserved, not whether it would be written exactly.
 *
 * Limitation: gold records ONE claim per field, so distractors that were present but not labeled
 * (a second irrelevant number, say) are not counted. This measures recall of labeled signals only.
 *
 * Baselines are excluded: their output is one proposal per field, with no candidate trace.
 */
import { z } from "zod";
import { BenchmarkCase, CandidateClaim, CRM_FIELDS, CRMField, EvaluationRun, Ratio } from "@/core/schemas";
import { valuesEqual } from "@/core/values";

const GroundedTrace = z.object({ records: z.array(z.object({ claim: CandidateClaim })) });

export type SignalItem = {
  caseId: string;
  field: CRMField;
  goldAction: string;
  status: string;
  certainty: string;
  sufficiency: string;
  recalled: boolean;
  matchedClaimIds: string[];
};

const ratio = (num: number, den: number): Ratio => ({ num, den, value: den === 0 ? null : num / den });

function groupRecall(items: SignalItem[], key: (i: SignalItem) => string): Record<string, Ratio> {
  const keys = [...new Set(items.map(key))].sort();
  return Object.fromEntries(keys.map((k) => {
    const g = items.filter((i) => key(i) === k);
    return [k, ratio(g.filter((i) => i.recalled).length, g.length)];
  }));
}

export function computeSignalRecall(run: EvaluationRun, cases: BenchmarkCase[]) {
  if (run.system !== "grounded") throw new Error(`signal recall needs a Grounded candidate trace; got ${run.system}`);
  const byId = new Map(cases.map((c) => [c.id, c]));
  const items: SignalItem[] = [];

  for (const out of run.outputs) {
    const c = byId.get(out.caseId);
    if (!c) throw new Error(`run output for unknown case ${out.caseId}`);
    // A missing or unparseable trace (e.g. extraction failed) contributes no candidates: not recalled.
    const parsed = GroundedTrace.safeParse(out.trace);
    const claims = parsed.success ? parsed.data.records.map((r) => r.claim) : [];
    for (const field of CRM_FIELDS) {
      const g = c.expected[field];
      if (g.value === null) continue;
      const matched = claims.filter((cl) => cl.field === field && valuesEqual(field, cl.value as never, g.value as never));
      items.push({
        caseId: c.id,
        field,
        goldAction: g.action,
        status: g.status ?? "none",
        certainty: g.certainty ?? "none",
        sufficiency: g.sufficiency ?? "none",
        recalled: matched.length > 0,
        matchedClaimIds: matched.map((m) => m.id),
      });
    }
  }

  return {
    items,
    overall: ratio(items.filter((i) => i.recalled).length, items.length),
    byStatus: groupRecall(items, (i) => i.status),
    bySufficiency: groupRecall(items, (i) => i.sufficiency),
    byGoldAction: groupRecall(items, (i) => i.goldAction),
    byField: groupRecall(items, (i) => i.field),
    /** Signals the policy must never write (ABSTAIN gold with a recorded value): the "negative context". */
    nonWritten: ratio(items.filter((i) => i.goldAction === "ABSTAIN" && i.recalled).length, items.filter((i) => i.goldAction === "ABSTAIN").length),
  };
}
