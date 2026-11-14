/**
 * npm run signal-recall -- <grounded run.json>
 * DIAGNOSTIC (not a headline metric): how many gold-recorded claims Grounded extracted as
 * candidates. Read-only; no model calls. See src/eval/signalRecall.ts for definitions.
 */
import fs from "node:fs";
import { EvaluationRun, Ratio } from "@/core/schemas";
import { loadSplit } from "@/eval/benchmark";
import { fmtRatio } from "@/eval/report";
import { computeSignalRecall } from "@/eval/signalRecall";

function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    console.error("usage: npm run signal-recall -- <grounded run.json>");
    process.exit(2);
  }
  const run = EvaluationRun.parse(JSON.parse(fs.readFileSync(file, "utf8")));
  if (run.split === "test" && !process.argv.includes("--show-failures")) {
    console.error("Refusing to list test-split signal details without --show-failures (SPEC.md §10).");
    process.exit(1);
  }
  const r = computeSignalRecall(run, loadSplit(run.split).cases);
  const table = (title: string, g: Record<string, Ratio>) =>
    [`\n${title}`, ...Object.entries(g).map(([k, v]) => `  ${k.padEnd(14)} ${fmtRatio(v)}`)].join("\n");
  console.log(`Signal recall (DIAGNOSTIC) for ${run.runId}`);
  console.log(`overall                      ${fmtRatio(r.overall)}`);
  console.log(`gold-ABSTAIN signals kept    ${fmtRatio(r.nonWritten)}`);
  console.log(table("by gold status", r.byStatus));
  console.log(table("by gold sufficiency", r.bySufficiency));
  console.log(table("by gold action", r.byGoldAction));
  console.log(table("by field", r.byField));
  console.log("\nnot recalled:");
  for (const i of r.items.filter((x) => !x.recalled)) console.log(`  ${i.caseId} ${i.field} (gold ${i.goldAction}, ${i.status}/${i.certainty}/${i.sufficiency})`);
}

main();
