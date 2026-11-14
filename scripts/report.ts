/**
 * npm run report -- <path/to/run.json> [--show-failures]
 * Prints the markdown report for a stored run. Failure details for the test split are hidden
 * unless --show-failures is given (SPEC.md §10).
 */
import fs from "node:fs";
import { EvaluationRun } from "@/core/schemas";
import { loadSplit } from "@/eval/benchmark";
import { renderReport } from "@/eval/report";

function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    console.error("usage: npm run report -- <run.json> [--show-failures]");
    process.exit(2);
  }
  const run = EvaluationRun.parse(JSON.parse(fs.readFileSync(file, "utf8")));
  const showFailures = run.split !== "test" || process.argv.includes("--show-failures");
  const cases = showFailures ? loadSplit(run.split).cases : [];
  process.stdout.write(renderReport(run, { cases, showFailures }));
}

main();
