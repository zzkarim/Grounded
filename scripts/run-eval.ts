/**
 * npm run eval -- --system <baseline-naive|baseline-self-assess|grounded> --split <example|dev|test>
 *                 [--cases id1,id2] [--concurrency 4] [--final-test]
 *
 * Calls the real model API (costs money). Writes an append-only run file + markdown report
 * under data/runs/<split>/.
 *
 * Integrity guards:
 *   - test split requires --final-test AND a frozen, unmodified test split.
 *   - any modified frozen split is refused.
 *   - invalid benchmark files abort the run.
 */
import fs from "node:fs";
import { checkFrozen, loadSplit, type Split } from "@/eval/benchmark";
import { renderReport, fmtRatio } from "@/eval/report";
import { runEvaluation, saveRun } from "@/eval/runner";
import { getModelConfig } from "@/llm/config";
import { createAnthropicClient } from "@/llm/client";
import { SYSTEMS } from "@/systems";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

/**
 * Load .env (git-ignored) from the project root. A missing file is fine (variables may come from
 * the shell); any other error, such as a malformed file, is fatal. Shell variables take precedence.
 */
function loadDotEnv() {
  try {
    process.loadEnvFile(".env");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}

/** Fail before any API call if no credential is set. Never prints the value. */
function requireCredentials() {
  const present = (name: string) => (process.env[name]?.trim().length ?? 0) > 0;
  if (!present("ANTHROPIC_API_KEY") && !present("ANTHROPIC_AUTH_TOKEN")) {
    const state = process.env.ANTHROPIC_API_KEY === undefined ? "not set" : "set but empty";
    console.error(`ANTHROPIC_API_KEY is ${state}. Add it to .env (and save the file) or export it in your shell.`);
    process.exit(1);
  }
}

async function main() {
  loadDotEnv();

  const systemName = arg("system");
  const split = arg("split") as Split | undefined;
  const system = systemName ? SYSTEMS[systemName] : undefined;
  if (!system || !split || !["example", "dev", "test"].includes(split)) {
    console.error(`usage: npm run eval -- --system <${Object.keys(SYSTEMS).join("|")}> --split <example|dev|test>`);
    process.exit(2);
  }

  const loaded = loadSplit(split);
  if (loaded.errors.length > 0) {
    console.error(`Benchmark has errors; run npm run validate-benchmark.\n${loaded.errors.join("\n")}`);
    process.exit(1);
  }
  const frozen = checkFrozen(split, loaded.files);
  if (frozen.problems.length > 0) {
    console.error(`Refusing to run: frozen ${split} split was modified.\n${frozen.problems.join("\n")}`);
    process.exit(1);
  }
  if (split === "test") {
    if (!process.argv.includes("--final-test")) {
      console.error("Refusing to run the held-out test split without --final-test (SPEC.md §10).");
      process.exit(1);
    }
    if (!frozen.frozen) {
      console.error("Refusing to run the test split: it is not frozen (data/benchmark/FROZEN.json).");
      process.exit(1);
    }
  }

  const only = arg("cases")?.split(",");
  const cases = only ? loaded.cases.filter((c) => only.includes(c.id)) : loaded.cases;
  const files = loaded.files.filter((f) => cases.some((c) => c.id === f.caseId));
  if (cases.length === 0) {
    console.error(`No cases to run in ${split}.`);
    process.exit(1);
  }

  requireCredentials();
  const config = getModelConfig();
  console.log(`Running ${system.name} v${system.version} on ${split} (${cases.length} cases) with ${config.model}, effort=${config.effort}`);
  const run = await runEvaluation({
    system,
    llm: createAnthropicClient(config),
    split,
    cases,
    files,
    frozen: frozen.frozen,
    concurrency: Number(arg("concurrency") ?? 4),
    onCaseDone: (o) => console.log(`  ${o.caseId}${o.error ? `  ERROR: ${o.error}` : ""}`),
  });

  const file = saveRun(run);
  const report = renderReport(run, { cases, showFailures: split !== "test" });
  fs.writeFileSync(file.replace(/\.json$/, ".md"), report, { flag: "wx" });

  const m = run.metrics.overall;
  console.log(`\nSaved ${file}`);
  console.log(`ACT precision ${fmtRatio(m.actPrecision)} · coverage ${fmtRatio(m.coverage)} · unsafe writes ${fmtRatio(m.unsafeWriteRate)}`);
  console.log(`review ${fmtRatio(m.reviewRate)} · abstain ${fmtRatio(m.abstentionRate)} · errors ${m.systemErrors}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
