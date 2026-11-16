/**
 * Text-overlap check between demo scenarios and the benchmark (PRODUCT_PLAN.md §15).
 *
 * Demo transcripts must be written fresh: no phrasing or names taken from DEV, TEST or the
 * example cases. This uses the same measures as the TEST provenance check in TEST_MANIFEST.md:
 * 5-word-shingle Jaccard similarity and shared 8-word phrases. Pure functions, no I/O.
 */
import type { Transcript } from "@/core/schemas";

export function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9$'.:,]+/g, " ")
    .replace(/[.,:](?!\d)/g, " ") // keep "3:30" and "$1,000.50", drop sentence punctuation
    .split(/\s+/)
    .filter(Boolean);
}

export function shingles(ws: string[], n: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + n <= ws.length; i++) out.add(ws.slice(i, i + n).join(" "));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export const transcriptText = (t: Transcript) => t.turns.map((x) => x.text).join("\n");

/** Shingles never span turns, so a match is a phrase someone actually said. */
function turnShingles(t: Transcript, n: number): Set<string> {
  const out = new Set<string>();
  for (const turn of t.turns) for (const s of shingles(words(turn.text), n)) out.add(s);
  return out;
}

export type PairOverlap = { otherId: string; jaccard5: number; shared5: string[]; shared8: string[] };

export function comparePair(demo: Transcript, other: Transcript, otherId: string): PairOverlap {
  const d5 = turnShingles(demo, 5);
  const o5 = turnShingles(other, 5);
  const d8 = turnShingles(demo, 8);
  const o8 = turnShingles(other, 8);
  return {
    otherId,
    jaccard5: jaccard(d5, o5),
    shared5: [...d5].filter((s) => o5.has(s)),
    shared8: [...d8].filter((s) => o8.has(s)),
  };
}

/** Whole-word, case-sensitive occurrences of each name token (≥ 3 letters) in a text. */
export function sharedNames(names: string[], text: string): string[] {
  const tokens = [...new Set(names.flatMap((n) => n.split(/\s+/)).filter((t) => /^[A-Z][A-Za-z'-]{2,}$/.test(t)))];
  return tokens.filter((t) => new RegExp(`(^|[^A-Za-z])${t}([^A-Za-z]|$)`).test(text));
}
