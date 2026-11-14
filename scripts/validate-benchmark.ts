/**
 * npm run validate-benchmark [-- --split dev|test|example]
 * Validates benchmark files (schema, gold evidence grounding, label consistency) and prints
 * label distributions. Read-only. Exits 1 on any error.
 */
import { CRM_FIELDS } from "@/core/schemas";
import { checkFrozen, loadSplit, type Split } from "@/eval/benchmark";

function main() {
  const arg = process.argv.indexOf("--split");
  const splits: Split[] = arg > -1 ? [process.argv[arg + 1] as Split] : ["example", "dev", "test"];
  let failed = false;

  for (const split of splits) {
    const { cases, files, errors, warnings } = loadSplit(split);
    const frozen = checkFrozen(split, files);
    console.log(`\n=== ${split}: ${cases.length} valid case(s)${frozen.frozen ? " [FROZEN]" : ""} ===`);
    for (const e of errors) console.log(`  ERROR   ${e}`);
    for (const p of frozen.problems) console.log(`  FROZEN  ${p}`);
    for (const w of warnings) console.log(`  warn    ${w}`);
    if (errors.length > 0 || frozen.problems.length > 0) failed = true;
    if (cases.length === 0) continue;

    const count = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((a, x) => ({ ...a, [x]: (a[x] ?? 0) + 1 }), {}));
    console.log(`  source:       ${count(cases.map((c) => c.source)).map(([k, n]) => `${k}=${n}`).join(" ")}`);
    console.log(`  labelStatus:  ${count(cases.map((c) => c.labelStatus)).map(([k, n]) => `${k}=${n}`).join(" ")}`);
    for (const f of CRM_FIELDS) {
      console.log(`  ${f.padEnd(14)}${count(cases.map((c) => c.expected[f].action)).map(([k, n]) => `${k}=${n}`).join(" ")}`);
    }
    console.log(`  tags:         ${count(cases.flatMap((c) => c.tags)).map(([k, n]) => `${k}=${n}`).join(" ")}`);
  }
  process.exit(failed ? 1 : 0);
}

main();
