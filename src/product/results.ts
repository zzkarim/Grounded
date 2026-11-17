/**
 * Results data (PRODUCT_PLAN.md §13). Everything here is DERIVED from the committed, frozen TEST run
 * files and benchmark cases. Nothing is re-run against a model; nothing frozen is modified.
 *
 * Headline metrics are read from each run's stored `metrics.overall`, and the stored per-item
 * outcomes are re-scored with the frozen scoring code as an integrity check.
 *
 * The only hand-written content is short failure-cause labels (from FINAL_TEST_ANALYSIS.md), keyed by
 * case + field. tests/results.test.ts verifies those keys equal the failure sets derived from the runs.
 */
import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { decideClaim } from "@/core/policy";
import { CRM_FIELDS, EvaluationRun, type BenchmarkCase, type CRMField, type MeetingValue, type Ratio } from "@/core/schemas";
import { scoreCase } from "@/core/scoring";
import { valuesEqual } from "@/core/values";
import { loadSplit } from "@/eval/benchmark";
import { computeSignalRecall } from "@/eval/signalRecall";
import { FIELD_LABEL, formatFieldValue, orderReasons, REASON } from "./present";
import { GroundedTrace } from "./recording";
import { validatorStory, type ValidatorStory } from "./validatorStory";

export const RUN_DIR = path.join(process.cwd(), "data", "runs", "test");
export const SYSTEM_ORDER = ["baseline-naive", "baseline-self-assess", "grounded"] as const;
export type SystemName = (typeof SYSTEM_ORDER)[number];
export const SYSTEM_LABEL: Record<SystemName, string> = { "baseline-naive": "Naive", "baseline-self-assess": "Self-assess", grounded: "Grounded" };
export const SYSTEM_BLURB: Record<SystemName, string> = {
  "baseline-naive": "One model call; every extracted value is written",
  "baseline-self-assess": "One model call; the model decides auto-write vs review",
  grounded: "Two model calls; deterministic code decides",
};

/**
 * Cost ESTIMATE: the claude-sonnet-5-5 list price this project used throughout ($2 / $10 per million
 * input / output tokens; FINAL_TEST_ANALYSIS.md §11). Not billed amounts.
 */
export const PRICE_PER_MTOK = { input: 2, output: 10 } as const;

// ───────────────────────── Curated labels (verified against the runs in tests) ─────────────────────────

/** Grounded's unsafe writes on TEST (gold ≠ ACT, predicted ACT). FINAL_TEST_ANALYSIS.md §3. */
export const UNSAFE_CAUSES: Record<string, string> = {
  "test-gen-036:decisionMaker": "“Needs to approve” read as final signing authority",
  "test-gen-050:decisionMaker": "“Has to approve” read as final signing authority",
  "test-gen-039:decisionMaker": "A hedged competing signer read as non-authoritative, so the other signer was written",
  "test-gen-057:budget": "A derived total read as a directly stated budget",
};
/** Gold ACT items Grounded did not write correctly. FINAL_TEST_ANALYSIS.md §4. */
export const LOST_CAUSES: Record<string, string> = {
  "test-gen-018:nextMeeting": "A correct weekday + date normalized to no date",
  "test-gen-060:nextMeeting": "A correct weekday + date normalized to no date",
  "test-gen-022:budget": "“Seventy-five” extracted as 75, not 75,000",
  "test-gen-053:budget": "“Seventy” extracted as 70, not 70,000",
  "test-gen-039:budget": "A spoken range extracted without its thousands, then written",
};

// ───────────────────────── Types ─────────────────────────

export type RatioView = { num: number; den: number; pct: string };
export type SystemRow = {
  system: SystemName;
  label: string;
  blurb: string;
  version: string;
  runId: string;
  createdAt: string;
  actPrecision: RatioView;
  coverage: RatioView;
  unsafe: RatioView;
  reviews: number;
  modelCalls: number;
  inputTokens: number;
  outputTokens: number;
  estCostUsd: number;
};
export type OverwriteCase = {
  caseId: string;
  field: CRMField;
  fieldLabel: string;
  existingText: string;
  proposedText: string;
  /** Stored verbatim from the self-assess run (trace[field].reason). */
  selfReason: string;
  /** Verbatim sentence(s) of the stored reason that mention the replacement, "…" marking omissions. */
  selfReasonExcerpt: string;
  groundedLabel: string;
  groundedReason: string;
  groundedReasonCode: string;
};
export type FailureItem = { key: string; caseId: string; field: CRMField; fieldLabel: string; outcome: string; cause: string };

export type ResultsData = {
  split: "test";
  frozenAt: string;
  items: number;
  goldAct: number;
  goldNonAct: number;
  transcripts: number;
  existingCrmTranscripts: number;
  multiCustomerTranscripts: number;
  medianTurns: number;
  systems: SystemRow[];
  rescore: { matched: number; total: number };
  overwrites: { cases: OverwriteCase[]; groundedOverwrites: number; prefilledFieldItems: number };
  validator: {
    meetingCandidates: number;
    activations: number;
    prevented: number;
    blocked: number;
    example: (ValidatorStory & { caseId: string; quotes: string[]; finalLabel: string; alsoWrittenBy: string[] }) | null;
  };
  failures: { unsafe: FailureItem[]; lost: FailureItem[] };
  recall: { overall: RatioView; crmRelevant: RatioView; contextual: RatioView };
  ratios: { calls: number; input: number; output: number };
};

// ───────────────────────── Loading ─────────────────────────

const pct = (r: Ratio | { num: number; den: number }): RatioView => ({
  num: r.num,
  den: r.den,
  pct: r.den === 0 ? "—" : `${((r.num / r.den) * 100).toFixed(1)}%`,
});

export function loadRun(system: SystemName): EvaluationRun {
  const files = fs.readdirSync(RUN_DIR).filter((f) => f.endsWith(`_${system}_test.json`));
  if (files.length !== 1) throw new Error(`expected exactly one TEST run for ${system}, found ${files.length}`);
  return EvaluationRun.parse(JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "runs", "test", files[0]), "utf8")));
}

function systemRow(run: EvaluationRun): SystemRow {
  const m = run.metrics.overall;
  const calls = run.outputs.flatMap((o) => o.llmCalls);
  const inputTokens = calls.reduce((n, c) => n + (c.usage?.inputTokens ?? 0), 0);
  const outputTokens = calls.reduce((n, c) => n + (c.usage?.outputTokens ?? 0), 0);
  const system = run.system as SystemName;
  return {
    system,
    label: SYSTEM_LABEL[system],
    blurb: SYSTEM_BLURB[system],
    version: run.systemVersion,
    runId: run.runId,
    createdAt: run.createdAt,
    actPrecision: pct(m.actPrecision),
    coverage: pct(m.coverage),
    unsafe: pct(m.unsafeWriteRate),
    reviews: m.reviewRate.num,
    modelCalls: calls.length,
    inputTokens,
    outputTokens,
    estCostUsd: (inputTokens * PRICE_PER_MTOK.input + outputTokens * PRICE_PER_MTOK.output) / 1_000_000,
  };
}

const key = (caseId: string, field: string) => `${caseId}:${field}`;

/**
 * Short verbatim excerpt of a stored model reason: the sentence(s) that talk about the CRM value being
 * replaced (or the first sentence if none do). Never rewords; "…" marks omitted sentences.
 */
export function excerpt(reason: string): string {
  const sentences = reason.match(/[^.!?]+[.!?]+(\s+|$)/g)?.map((x) => x.trim()) ?? [reason.trim()];
  const relevant = sentences.map((x, i) => [x, i] as const).filter(([x]) => /\b(CRM|replac\w*|supersed\w*|updat\w*)\b/i.test(x));
  const chosen = relevant.length > 0 ? relevant : [[sentences[0], 0] as const];
  const parts: string[] = [];
  chosen.forEach(([x, i], k) => {
    if (k === 0 ? i > 0 : i > chosen[k - 1][1] + 1) parts.push("…");
    parts.push(x);
  });
  if (chosen[chosen.length - 1][1] < sentences.length - 1) parts.push("…");
  return parts.join(" ");
}
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

export function buildResults(runs: Record<SystemName, EvaluationRun>, cases: BenchmarkCase[], frozenAt: string): ResultsData {
  const byId = new Map(cases.map((c) => [c.id, c]));
  const self = runs["baseline-self-assess"];
  const g = runs.grounded;

  // Re-score every stored output with the frozen scoring code; count items that reproduce exactly.
  let matched = 0;
  let total = 0;
  for (const run of Object.values(runs)) {
    for (const out of run.outputs) {
      const fresh = scoreCase(byId.get(out.caseId)!, out);
      for (const item of fresh) {
        total++;
        const stored = run.items.find((i) => i.caseId === item.caseId && i.field === item.field);
        if (stored && isDeepStrictEqual(JSON.parse(JSON.stringify(item)), stored)) matched++;
      }
    }
  }

  // Overwrites: an autonomous write (predicted ACT) on a field whose CRM already held a DIFFERENT value.
  const overwrote = (run: EvaluationRun) =>
    run.items.filter((i) => {
      const existing = byId.get(i.caseId)!.crm[i.field];
      return i.predAction === "ACT" && existing !== null && i.predValue !== null && !valuesEqual(i.field, i.predValue as never, existing as never);
    });
  const overwriteCases: OverwriteCase[] = overwrote(self).map((i) => {
    const c = byId.get(i.caseId)!;
    const selfTrace = self.outputs.find((o) => o.caseId === i.caseId)!.trace as Record<CRMField, { reason: string } | null>;
    const gd = g.outputs.find((o) => o.caseId === i.caseId)!.fields[i.field];
    const lead = orderReasons(gd.reasons)[0];
    return {
      caseId: i.caseId,
      field: i.field,
      fieldLabel: FIELD_LABEL[i.field],
      existingText: formatFieldValue(i.field, c.crm[i.field]),
      proposedText: formatFieldValue(i.field, i.predValue),
      selfReason: selfTrace[i.field]?.reason ?? "",
      selfReasonExcerpt: excerpt(selfTrace[i.field]?.reason ?? ""),
      groundedLabel: gd.action === "ASK" ? "Needs review" : gd.action,
      groundedReason: REASON[lead].short,
      groundedReasonCode: lead,
    };
  });
  const prefilledFieldItems = cases.reduce((n, c) => n + CRM_FIELDS.filter((f) => c.crm[f] !== null).length, 0);

  // Validator activations on TEST, with a labelled counterfactual: the frozen per-claim policy on the
  // ORIGINAL (pre-validation) value with the same labels. Prevented = would have been ACT on a gold non-ACT.
  let meetingCandidates = 0;
  let activations = 0;
  let prevented = 0;
  let blocked = 0;
  let example: ResultsData["validator"]["example"] = null;
  for (const out of g.outputs) {
    const c = byId.get(out.caseId)!;
    const parsed = GroundedTrace.safeParse(out.trace);
    if (!parsed.success) continue;
    for (const r of parsed.data.records) {
      if (r.claim.field !== "nextMeeting") continue;
      meetingCandidates++;
      if (r.validation.originalValue === null) continue;
      activations++;
      const original = { ...r.claim, value: r.validation.originalValue } as typeof r.claim;
      const without = decideClaim({ claim: original, classification: r.classification, grounding: r.grounding, existing: c.crm.nextMeeting });
      const gold = c.expected.nextMeeting.action;
      const finalField = out.fields.nextMeeting.action;
      if (without.action === "ACT" && gold !== "ACT" && finalField !== "ACT") {
        prevented++;
        example = {
          caseId: c.id,
          quotes: r.claim.evidence.map((e) => e.quote),
          finalLabel: finalField === "ASK" ? "Needs review" : finalField,
          // Which baselines wrote this field automatically on the same case (from their stored items).
          alsoWrittenBy: (["baseline-naive", "baseline-self-assess"] as const)
            .filter((s) => runs[s].items.some((i) => i.caseId === c.id && i.field === "nextMeeting" && i.predAction === "ACT"))
            .map((s) => SYSTEM_LABEL[s]),
          ...validatorStory(r.validation.originalValue as MeetingValue, r.claim.value as MeetingValue, r.validation.issues, c.transcript.occurredAt),
        };
      }
      if (gold === "ACT" && without.action === "ACT" && finalField !== "ACT") blocked++;
    }
  }

  const failures = (pred: (i: (typeof g.items)[number]) => boolean, causes: Record<string, string>): FailureItem[] =>
    g.items.filter(pred).map((i) => ({
      key: key(i.caseId, i.field),
      caseId: i.caseId,
      field: i.field,
      fieldLabel: FIELD_LABEL[i.field],
      outcome: i.outcome,
      cause: causes[key(i.caseId, i.field)] ?? "Unlabelled",
    }));

  const recall = computeSignalRecall(g, cases);
  const crmRelevant = recall.items.filter((i) => i.goldAction !== "ABSTAIN");
  const contextual = recall.items.filter((i) => i.sufficiency === "NONE");

  const rows = SYSTEM_ORDER.map((s) => systemRow(runs[s]));
  const sRow = rows[1];
  const gRow = rows[2];
  const gm = g.metrics.overall;
  return {
    split: "test",
    frozenAt,
    items: gm.items,
    goldAct: gm.coverage.den,
    goldNonAct: gm.unsafeWriteRate.den,
    transcripts: cases.length,
    existingCrmTranscripts: cases.filter((c) => CRM_FIELDS.some((f) => c.crm[f] !== null)).length,
    multiCustomerTranscripts: cases.filter((c) => c.transcript.participants.filter((p) => p.side === "customer").length > 1).length,
    medianTurns: median(cases.map((c) => c.transcript.turns.length)),
    systems: rows,
    rescore: { matched, total },
    overwrites: { cases: overwriteCases, groundedOverwrites: overwrote(g).length, prefilledFieldItems },
    validator: { meetingCandidates, activations, prevented, blocked, example },
    failures: {
      unsafe: failures((i) => i.outcome === "UNSAFE_ACT", UNSAFE_CAUSES),
      lost: failures((i) => i.goldAction === "ACT" && i.outcome !== "CORRECT_ACT", LOST_CAUSES),
    },
    recall: {
      overall: pct(recall.overall),
      crmRelevant: pct({ num: crmRelevant.filter((i) => i.recalled).length, den: crmRelevant.length }),
      contextual: pct({ num: contextual.filter((i) => i.recalled).length, den: contextual.length }),
    },
    ratios: {
      calls: gRow.modelCalls / sRow.modelCalls,
      input: gRow.inputTokens / sRow.inputTokens,
      output: gRow.outputTokens / sRow.outputTokens,
    },
  };
}

export function loadResults(): ResultsData {
  const runs = Object.fromEntries(SYSTEM_ORDER.map((s) => [s, loadRun(s)])) as Record<SystemName, EvaluationRun>;
  const split = loadSplit("test");
  if (split.errors.length > 0) throw new Error(`TEST benchmark invalid: ${split.errors.join("; ")}`);
  const frozen = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "benchmark", "FROZEN.json"), "utf8")) as { frozenAt: { test: string } };
  return buildResults(runs, split.cases, frozen.frozenAt.test);
}
