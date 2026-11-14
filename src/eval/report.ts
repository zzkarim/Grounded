/**
 * Markdown report for one EvaluationRun. Purely a view: every number here is read
 * from the run file. Nothing is recomputed differently or estimated.
 */
import type { BenchmarkCase, CRMField, EvaluationRun, Metrics, Ratio, ScoredItem, SystemOutput } from "@/core/schemas";
import { formatValue } from "@/core/values";

const CORRECT = new Set(["CORRECT_ACT", "CORRECT_ASK", "CORRECT_NO_CHANGE"]);

export function fmtRatio(r: Ratio): string {
  return r.value === null ? `${r.num}/${r.den} (n/a)` : `${r.num}/${r.den} (${(r.value * 100).toFixed(1)}%)`;
}

function breakdownTable(title: string, groups: Record<string, Metrics>): string {
  const rows = Object.entries(groups).map(
    ([k, m]) =>
      `| ${k} | ${m.items} | ${fmtRatio(m.actPrecision)} | ${fmtRatio(m.coverage)} | ${fmtRatio(m.unsafeWriteRate)} | ${fmtRatio(m.reviewRate)} | ${fmtRatio(m.abstentionRate)} |`,
  );
  return [
    `### ${title}`,
    "| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |",
    "|---|---|---|---|---|---|---|",
    ...rows,
  ].join("\n");
}

/** Evidence behind a prediction, from the system's own trace. */
function predictionEvidence(out: SystemOutput | undefined, field: CRMField): string[] {
  if (!out) return [];
  const trace = out.trace as Record<string, unknown> | null;
  if (out.system === "grounded" && trace && Array.isArray(trace.records)) {
    return (trace.records as { claim: { field: string; value: unknown; evidence: { turnId: string; speakerId: string; quote: string }[] }; classification: { status: string; certainty: string; sufficiency: string } | null; decision: { action: string; reasons: string[] }; validation?: { verified: boolean; issues: { rule: string; detail: string }[]; originalValue: unknown } }[])
      .filter((r) => r.claim.field === field)
      .map((r) => {
        const cls = r.classification ? `${r.classification.status}/${r.classification.certainty}/${r.classification.sufficiency}` : "unclassified";
        const ev = r.claim.evidence.map((e) => `[${e.turnId}] ${e.speakerId}: "${e.quote}"`).join(" + ");
        const val = r.validation && !r.validation.verified
          ? ` · VALIDATION FAILED (${r.validation.issues.map((i) => i.rule).join(", ")}; model value was ${formatValue(field, r.validation.originalValue)})`
          : "";
        return `claim ${formatValue(field, r.claim.value)} · ${cls} → ${r.decision.action} (${r.decision.reasons.join(", ")})${val} · ${ev}`;
      });
  }
  const p = trace?.[field] as { evidenceQuote?: string; reason?: string } | null | undefined;
  if (p?.evidenceQuote) return [`quote: "${p.evidenceQuote}"${p.reason ? ` · model reason: ${p.reason}` : ""}`];
  return [];
}

function failureBlock(i: ScoredItem, out: SystemOutput | undefined, c: BenchmarkCase | undefined): string {
  const pred = out?.fields[i.field];
  const lines = [
    `- **${i.caseId} · ${i.field} · ${i.outcome}**${i.systemError ? " (system error)" : ""}`,
    `  - gold: ${i.goldAction} ${formatValue(i.field, i.goldValue)}${i.goldStatus ? ` · ${i.goldStatus}/${i.goldCertainty}` : ""}`,
    `  - pred: ${i.predAction} ${formatValue(i.field, i.predValue)} · reasons: ${pred?.reasons.join(", ") ?? "?"}`,
  ];
  if (c) lines.push(`  - gold rationale: ${c.expected[i.field].rationale}`);
  for (const e of predictionEvidence(out, i.field)) lines.push(`  - ${e}`);
  if (out?.error) lines.push(`  - error: ${out.error}`);
  return lines.join("\n");
}

export function renderReport(run: EvaluationRun, opts: { cases?: BenchmarkCase[]; showFailures: boolean }): string {
  const m = run.metrics.overall;
  const drafts = new Set(run.items.filter((i) => i.labelStatus === "draft").map((i) => i.caseId)).size;
  const outputs = new Map(run.outputs.map((o) => [o.caseId, o]));
  const cases = new Map((opts.cases ?? []).map((c) => [c.id, c]));
  const failures = run.items.filter((i) => !CORRECT.has(i.outcome));

  const confusion = [
    "| gold \\ pred | ACT | ASK | ABSTAIN | NO_OP |",
    "|---|---|---|---|---|",
    ...Object.entries(m.confusion).map(([g, row]) => `| ${g} | ${row.ACT} | ${row.ASK} | ${row.ABSTAIN} | ${row.NO_OP} |`),
  ].join("\n");

  const parts = [
    `# Run ${run.runId}`,
    "",
    "> Synthetic benchmark. These numbers say nothing about performance on real sales conversations.",
    drafts > 0 ? `> ⚠️ ${drafts} case(s) have **draft** labels that the owner has not reviewed. Treat results as provisional.` : "",
    run.split === "example" ? "> ⚠️ `example` split: schema-illustration cases, NOT the benchmark." : "",
    run.benchmarkFrozen ? "" : "> Benchmark split is not frozen.",
    "",
    `| | |`,
    `|---|---|`,
    `| system | ${run.system} v${run.systemVersion} |`,
    `| model (requested / reported) | ${run.requestedModel} / ${run.responseModels.join(", ") || "none"} |`,
    `| effort | ${run.effort} |`,
    `| policy | ${run.policyConfig} |`,
    `| scoring | ${run.scoringVersion ?? "v1 (run predates scoring versioning)"} |`,
    `| prompt hashes | ${Object.entries(run.promptHashes).map(([k, v]) => `${k}=${v}`).join(", ")} |`,
    `| split / cases / field-items | ${run.split} / ${run.caseFiles.length} / ${m.items} |`,
    `| created | ${run.createdAt} |`,
    "",
    "## Headline",
    "| metric | value |",
    "|---|---|",
    `| **ACT precision** | **${fmtRatio(m.actPrecision)}** |`,
    `| autonomous coverage | ${fmtRatio(m.coverage)} |`,
    `| unsafe write rate | ${fmtRatio(m.unsafeWriteRate)} |`,
    `| human review rate | ${fmtRatio(m.reviewRate)} |`,
    `| abstention rate | ${fmtRatio(m.abstentionRate)} |`,
    `| no-op rate | ${fmtRatio(m.noOpRate)} |`,
    `| wrong-value writes | ${m.wrongValueWrites} |`,
    `| field-items affected by system errors | ${m.systemErrors} |`,
    "",
    "## Gold × predicted action",
    confusion,
    "",
    "## Outcomes",
    Object.entries(m.outcomes).filter(([, n]) => n > 0).map(([o, n]) => `- ${o}: ${n}`).join("\n"),
    "",
    "## Breakdowns",
    breakdownTable("By field", run.metrics.byField),
    "",
    breakdownTable("By source", run.metrics.bySource),
    "",
    breakdownTable("By label status", run.metrics.byLabelStatus),
    "",
    breakdownTable("By gold status", run.metrics.byGoldStatus),
    "",
    breakdownTable("By gold certainty", run.metrics.byGoldCertainty),
    "",
    breakdownTable("By case tag (an item appears under every tag of its case)", run.metrics.byTag),
    "",
    `## Failures (${failures.length})`,
  ];
  if (!opts.showFailures) {
    parts.push("Failure details hidden (held-out split). Use `--show-failures` only for the final analysis.");
  } else if (failures.length === 0) {
    parts.push("None.");
  } else {
    const byOutcome = new Map<string, ScoredItem[]>();
    for (const f of failures) byOutcome.set(f.outcome, [...(byOutcome.get(f.outcome) ?? []), f]);
    for (const [outcome, items] of byOutcome) {
      parts.push(`### ${outcome} (${items.length})`, ...items.map((i) => failureBlock(i, outputs.get(i.caseId), cases.get(i.caseId))), "");
    }
  }
  return parts.filter((p) => p !== null).join("\n") + "\n";
}
