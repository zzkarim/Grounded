/**
 * npm run freeze-benchmark -- --split dev
 *
 * Records the SHA-256 of every case file in a split into data/benchmark/FROZEN.json.
 * After this, `npm run eval` and `npm run validate-benchmark` refuse a modified, added, or
 * removed case in that split (see checkFrozen in src/eval/benchmark.ts).
 *
 * Refuses if: the split has validation errors, any case is still a draft, the split is
 * empty, or the split is already frozen (re-freezing must be an explicit, reviewed manual change).
 */
import fs from "node:fs";
import { FROZEN_MANIFEST, loadSplit, type Split } from "@/eval/benchmark";

function main() {
  const i = process.argv.indexOf("--split");
  const split = (i > -1 ? process.argv[i + 1] : undefined) as Split | undefined;
  if (split !== "dev" && split !== "test") {
    console.error("usage: npm run freeze-benchmark -- --split <dev|test>");
    process.exit(2);
  }
  const { cases, files, errors } = loadSplit(split);
  const drafts = cases.filter((c) => c.labelStatus !== "reviewed").map((c) => c.id);
  const manifest = fs.existsSync(FROZEN_MANIFEST)
    ? (JSON.parse(fs.readFileSync(FROZEN_MANIFEST, "utf8")) as { frozenAt: Record<string, string>; splits: Record<string, Record<string, string>> })
    : { frozenAt: {}, splits: {} };

  if (errors.length > 0) return fail(`${split} has validation errors:\n${errors.join("\n")}`);
  if (cases.length === 0) return fail(`${split} is empty`);
  if (drafts.length > 0) return fail(`${split} has draft labels: ${drafts.join(", ")}`);
  if (manifest.splits[split]) return fail(`${split} is already frozen (${manifest.frozenAt[split]}). Edit FROZEN.json by hand only with owner approval.`);

  manifest.splits[split] = Object.fromEntries(files.map((f) => [f.file, f.sha256]));
  manifest.frozenAt[split] = new Date().toISOString();
  fs.writeFileSync(FROZEN_MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Froze ${split}: ${files.length} case files → ${FROZEN_MANIFEST}`);
}

function fail(msg: string) {
  console.error(`Refusing to freeze: ${msg}`);
  process.exit(1);
}

main();
