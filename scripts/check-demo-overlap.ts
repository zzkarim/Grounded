/**
 * npm run check-demo-overlap
 *
 * Compares every demo scenario (data/demo/scenarios) with every benchmark transcript in DEV, TEST
 * and the examples, and reports:
 *   - max 5-word-shingle Jaccard per scenario (TEST provenance used the same measure)
 *   - shared 8-word phrases (FAIL if any)
 *   - shared 5-word phrases (listed for human review; common phrases are expected)
 *   - person and company name tokens that also appear in benchmark text (FAIL if any)
 *
 * Read-only. Benchmark files are only read, never modified.
 */
import { loadSplit, type Split } from "@/eval/benchmark";
import { comparePair, sharedNames, transcriptText } from "@/product/overlap";
import { loadScenarios } from "@/product/scenarios";

const JACCARD_LIMIT = 0.05;

function main() {
  const scenarios = loadScenarios();
  const bench = (["dev", "test", "example"] as Split[]).flatMap((split) => {
    const loaded = loadSplit(split);
    if (loaded.errors.length > 0) throw new Error(`${split}: ${loaded.errors.join("; ")}`);
    return loaded.cases.map((c) => ({ id: c.id, transcript: c.transcript, crm: c.crm }));
  });
  const benchText = bench
    .map((b) => [transcriptText(b.transcript), ...b.transcript.participants.map((p) => `${p.name} ${p.title ?? ""}`), JSON.stringify(b.crm)].join("\n"))
    .join("\n");

  console.log(`Compared ${scenarios.length} demo scenarios against ${bench.length} benchmark transcripts (dev, test, examples).\n`);
  let failed = false;

  for (const s of scenarios) {
    const pairs = bench.map((b) => comparePair(s.transcript, b.transcript, b.id));
    const worst = pairs.reduce((a, b) => (b.jaccard5 > a.jaccard5 ? b : a));
    const shared8 = pairs.flatMap((p) => p.shared8.map((x) => `${p.otherId}: "${x}"`));
    const shared5 = [...new Set(pairs.flatMap((p) => p.shared5))];
    const names = [
      ...s.transcript.participants.map((p) => p.name),
      s.account.name.split(" ")[0], // distinctive company token; generic industry words ("Health") are expected
      ...[s.crm.decisionMaker, ...s.designIntent.dryRuns.flatMap((d) => d.claims.filter((c) => c.field === "decisionMaker").map((c) => c.value))]
        .flatMap((v) => ((v as { people?: { name: string | null }[] } | null)?.people ?? []).map((p) => p.name ?? "")),
    ].filter(Boolean);
    const nameHits = sharedNames(names, benchText);

    console.log(`■ ${s.id}`);
    console.log(`  max 5-gram Jaccard: ${worst.jaccard5.toFixed(4)} (vs ${worst.otherId})`);
    console.log(`  shared 8-word phrases: ${shared8.length}${shared8.length ? `\n    ${shared8.join("\n    ")}` : ""}`);
    console.log(`  shared 5-word phrases (review): ${shared5.length}${shared5.length ? `\n    ${shared5.map((x) => `"${x}"`).join("\n    ")}` : ""}`);
    console.log(`  name tokens also in benchmark: ${nameHits.length ? nameHits.join(", ") : "none"}\n`);
    if (shared8.length > 0 || nameHits.length > 0 || worst.jaccard5 > JACCARD_LIMIT) failed = true;
  }

  console.log(failed ? "FAIL: overlap above limits (any shared 8-word phrase, any shared name, or Jaccard > 0.05)." : "PASS");
  process.exit(failed ? 1 : 0);
}

main();
