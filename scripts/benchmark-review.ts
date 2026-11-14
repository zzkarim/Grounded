/**
 * npm run benchmark-review -- --split dev
 *
 * Writes two human-review documents for a benchmark split (read-only with respect to the cases):
 *   data/benchmark/<SPLIT>_REVIEW.md  every case with transcript, existing CRM, and gold labels
 *   data/benchmark/<SPLIT>_AUDIT.md   distributions + quality-control checks
 *
 * Quality-control checks are deterministic and use only the case files. No system or model is run.
 * The "rubric reproduction" check applies the deterministic rubric (policy.ts) to the GOLD labels
 * of each gold claim. It tests label/rubric consistency, not system behavior.
 */
import fs from "node:fs";
import path from "node:path";
import { groundEvidence } from "@/core/grounding";
import { decideClaim } from "@/core/policy";
import { BenchmarkCase, CandidateClaim, CRM_FIELDS, MeetingValue } from "@/core/schemas";
import { weekdayOf } from "@/core/transcript";
import { formatValue } from "@/core/values";
import { BENCHMARK_ROOT, loadSplit, type Split } from "@/eval/benchmark";

const ACTIONS = ["ACT", "ASK", "ABSTAIN", "NO_OP"] as const;
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const difficultyOf = (c: BenchmarkCase) => /Intended difficulty: (\w+)/.exec(c.notes)?.[1] ?? "unspecified";
const distractorsOf = (c: BenchmarkCase) => (/Distractors: ([^.]+)\./.exec(c.notes)?.[1] ?? "none").split(", ").filter((d) => d !== "none");
const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${((100 * n) / d).toFixed(1)}%`);

function countBy<T>(xs: T[], key: (x: T) => string): [string, number][] {
  const m = new Map<string, number>();
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// ───────── Review document ─────────

function renderCase(c: BenchmarkCase): string {
  const names = new Map(c.transcript.participants.map((p) => [p.id, `${p.name} (${p.side}${p.title ? `, ${p.title}` : ""})`]));
  const crm = CRM_FIELDS.map((f) => `- ${f}: ${formatValue(f, c.crm[f])}`).join("\n");
  const turns = c.transcript.turns.map((t) => `> **[${t.id}] ${names.get(t.speakerId)}:** ${t.text}`).join("\n>\n");
  const fields = CRM_FIELDS.map((f) => {
    const g = c.expected[f];
    const ev = g.evidence.length ? g.evidence.map((e) => `  - [${e.turnId}] ${e.speakerId}: "${e.quote}"`).join("\n") : "  - (none)";
    return [
      `**${f.toUpperCase()}** → **${g.action}**`,
      `- value: ${formatValue(f, g.value)}`,
      `- status / certainty / sufficiency: ${g.status ?? "—"} / ${g.certainty ?? "—"} / ${g.sufficiency ?? "—"}`,
      `- evidence:\n${ev}`,
      `- rationale: ${g.rationale}`,
    ].join("\n");
  }).join("\n\n");
  return [
    `## ${c.id}: ${c.crm.company}`,
    `*${c.description}*`,
    "",
    `Call date: ${c.transcript.occurredAt} (${weekdayOf(c.transcript.occurredAt)}) · difficulty: ${difficultyOf(c)} · source: ${c.source} · labelStatus: ${c.labelStatus}`,
    "",
    "**Existing CRM**",
    crm,
    "",
    "**Transcript**",
    "",
    turns,
    "",
    fields,
    "",
    `**Tags:** ${c.tags.join(", ")}`,
    "",
    `**Notes:** ${c.notes}`,
    "",
    "---",
  ].join("\n");
}

// ───────── Quality checks ─────────

/** Check gold meeting dates against LABELING_GUIDE §2.3. Returns problems (empty = pass). */
function checkMeetingDate(c: BenchmarkCase): string[] {
  const g = c.expected.nextMeeting;
  if (g.value === null) return [];
  const m = g.value as MeetingValue;
  const said = m.asStated.toLowerCase();
  const weekday = WEEKDAYS.find((w) => said.includes(w));
  const dayOfMonth = /\bthe (\d{1,2})(st|nd|rd|th)\b/.exec(said)?.[1];
  const problems: string[] = [];
  if (m.date === null) {
    // Null is legitimate only for vague timing, "next <weekday>", or a weekday/date contradiction.
    if (weekday && !said.includes(`next ${weekday}`) && !dayOfMonth) problems.push(`date null but "${m.asStated}" names a resolvable weekday`);
    return problems;
  }
  if (m.date <= c.transcript.occurredAt) problems.push(`date ${m.date} is not after the call date`);
  const actualWeekday = weekdayOf(m.date).toLowerCase();
  if (weekday && weekday !== actualWeekday) problems.push(`"${m.asStated}" says ${weekday} but ${m.date} is a ${actualWeekday}`);
  if (dayOfMonth && Number(m.date.slice(8)) !== Number(dayOfMonth)) problems.push(`"${m.asStated}" says the ${dayOfMonth} but date is ${m.date}`);
  if (weekday && !dayOfMonth && !said.includes(`next ${weekday}`)) {
    // "Thursday" = first such weekday strictly after the call date.
    const d = new Date(`${c.transcript.occurredAt}T12:00:00Z`);
    do d.setUTCDate(d.getUTCDate() + 1);
    while (WEEKDAYS[(d.getUTCDay() + 6) % 7] !== weekday);
    const expected = d.toISOString().slice(0, 10);
    if (expected !== m.date) problems.push(`"${m.asStated}" should resolve to ${expected}, got ${m.date}`);
  }
  return problems;
}

function shingles(c: BenchmarkCase, n: number): Set<string> {
  const words = c.transcript.turns.map((t) => t.text).join(" ").toLowerCase().replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(" "));
  return out;
}
const jaccard = (a: Set<string>, b: Set<string>) => {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
};

/** Apply the deterministic rubric to each gold claim's gold labels; must reproduce the gold action. */
function rubricMismatches(c: BenchmarkCase): string[] {
  const out: string[] = [];
  for (const f of CRM_FIELDS) {
    const g = c.expected[f];
    if (g.value === null) continue;
    const d = decideClaim({
      claim: { id: "gold", field: f, value: g.value, evidence: g.evidence } as CandidateClaim,
      classification: { claimId: "gold", status: g.status!, certainty: g.certainty!, sufficiency: g.sufficiency!, explanation: "" },
      grounding: groundEvidence(g.evidence, c.transcript),
      existing: c.crm[f],
    });
    if (d.action !== g.action) out.push(`${f}: gold ${g.action}, rubric on gold labels gives ${d.action} (${d.reasons.join(", ")})`);
  }
  return out;
}

// ───────── Audit document ─────────

function renderAudit(split: Split, cases: BenchmarkCase[], loadErrors: string[], warnings: string[]): string {
  const items = cases.flatMap((c) => CRM_FIELDS.map((f) => ({ c, f, a: c.expected[f].action })));
  const actionTable = (rows: { a: string }[]) => ACTIONS.map((a) => `${a} ${rows.filter((r) => r.a === a).length} (${pct(rows.filter((r) => r.a === a).length, rows.length)})`).join(" · ");
  const examples = loadSplit("example").cases;

  const dateProblems = cases.flatMap((c) => checkMeetingDate(c).map((p) => `${c.id}: ${p}`));
  const rubric = cases.flatMap((c) => rubricMismatches(c).map((p) => `${c.id}: ${p}`));
  const nonDraftWarnings = warnings.filter((w) => !w.includes("labelStatus is draft"));

  const sh = new Map(cases.map((c) => [c.id, shingles(c, 5)]));
  const pairs: [string, string, number][] = [];
  for (let i = 0; i < cases.length; i++)
    for (let j = i + 1; j < cases.length; j++) pairs.push([cases[i].id, cases[j].id, jaccard(sh.get(cases[i].id)!, sh.get(cases[j].id)!)]);
  pairs.sort((a, b) => b[2] - a[2]);
  const exampleOverlap = cases.flatMap((c) => {
    const s8 = shingles(c, 8);
    return examples.flatMap((e) => [...shingles(e, 8)].filter((x) => s8.has(x)).map((x) => `${c.id} ↔ ${e.id}: "${x}"`));
  });

  const crmNonNull = cases.filter((c) => CRM_FIELDS.some((f) => c.crm[f] !== null));
  const flagged = cases.filter((c) => /GUIDE CONFLICT|Lower confidence/.test(c.notes));
  const distractorCount = (d: string) => cases.filter((c) => distractorsOf(c).includes(d)).length;
  const runsDir = path.join(process.cwd(), "data", "runs", split);
  const runFiles = fs.existsSync(runsDir) ? fs.readdirSync(runsDir).filter((f) => f.endsWith(".json")) : [];

  const check = (ok: boolean) => (ok ? "PASS" : "FAIL");
  return [
    `# ${split.toUpperCase()} benchmark audit`,
    "",
    `Generated by \`npm run benchmark-review -- --split ${split}\` from the case files. Regenerate it after any edit.`,
    "",
    "## Size and provenance",
    `- Transcripts: ${cases.length}; field-items: ${items.length}`,
    `- Source: ${countBy(cases, (c) => c.source).map(([k, n]) => `${k} ${n}`).join(", ")}`,
    `- Label status: ${countBy(cases, (c) => c.labelStatus).map(([k, n]) => `${k} ${n}`).join(", ")}`,
    `- Intended difficulty (from case notes): ${countBy(cases, difficultyOf).map(([k, n]) => `${k} ${n}`).join(", ")}`,
    "",
    "## Action distribution",
    `- **All field-items:** ${actionTable(items)}`,
    ...CRM_FIELDS.map((f) => `- **${f}:** ${actionTable(items.filter((i) => i.f === f))}`),
    "",
    "### Action by intended difficulty",
    ...countBy(cases, difficultyOf).map(([d]) => `- **${d}:** ${actionTable(items.filter((i) => difficultyOf(i.c) === d))}`),
    "",
    "## Tags",
    countBy(cases.flatMap((c) => c.tags), (t) => t).map(([t, n]) => `- ${t}: ${n}`).join("\n"),
    "",
    "## Coverage",
    `- Cases with any non-null existing CRM field: ${crmNonNull.length} (${crmNonNull.map((c) => c.id).join(", ")})`,
    ...CRM_FIELDS.map((f) => `  - ${f} pre-filled: ${cases.filter((c) => c.crm[f] !== null).length}`),
    `  - two or more fields pre-filled: ${cases.filter((c) => CRM_FIELDS.filter((f) => c.crm[f] !== null).length >= 2).length}`,
    `- Cases with multiple monetary values (tag multiple_numbers): ${cases.filter((c) => c.tags.includes("multiple_numbers")).length}`,
    `- Cases with multiple stakeholders (tag multiple_stakeholders): ${cases.filter((c) => c.tags.includes("multiple_stakeholders")).length}`,
    `- Cases with deliberate distractors (from notes): budget ${distractorCount("budget")}, decisionMaker ${distractorCount("decisionMaker")}, meeting ${distractorCount("meeting")}`,
    `- ABSTAIN items storing a tempting wrong value (§6): ${items.filter((i) => i.a === "ABSTAIN" && i.c.expected[i.f].value !== null).length}; ABSTAIN with nothing relevant: ${items.filter((i) => i.a === "ABSTAIN" && i.c.expected[i.f].value === null).length}`,
    "",
    "## Quality-control checks",
    `1. Zod schema + structural validation: ${check(loadErrors.length === 0)} (${loadErrors.length} errors)`,
    `2. Every gold evidence quote is in its cited turn with the right speaker: ${check(loadErrors.every((e) => !/QUOTE_NOT_IN_TURN|SPEAKER_MISMATCH|UNKNOWN_TURN/.test(e)))}`,
    `3. Meeting dates follow LABELING_GUIDE §2.3 (future date; weekday/date agree; weekday-only resolves to the first such day after the call): ${check(dateProblems.length === 0)}`,
    ...dateProblems.map((p) => `   - ${p}`),
    `4. Near-duplicates (5-word-shingle Jaccard between transcripts): max ${pairs[0] ? `${pairs[0][2].toFixed(3)} (${pairs[0][0]} ↔ ${pairs[0][1]})` : "n/a"}; pairs ≥ 0.20: ${pairs.filter((p) => p[2] >= 0.2).length} → ${check(pairs.every((p) => p[2] < 0.2))}`,
    `5. No 8-word phrase shared with the six example cases: ${check(exampleOverlap.length === 0)}`,
    ...exampleOverlap.slice(0, 10).map((p) => `   - ${p}`),
    `6. Labels consistent with LABELING_GUIDE §4:`,
    `   - validator rubric warnings (excluding "draft"): ${nonDraftWarnings.length} → ${check(nonDraftWarnings.length === 0)}`,
    ...nonDraftWarnings.map((w) => `     - ${w}`),
    `   - deterministic rubric applied to each gold claim's own labels reproduces the gold action: ${check(rubric.length === 0)}`,
    ...rubric.map((p) => `     - ${p}`),
    `   - Limitation: these checks see only the gold claim. They cannot detect §4 step 4 conflicts with unlabeled distractor claims; those were reviewed by hand (see flagged cases).`,
    `7. Isolation: no ${split} run files exist under data/runs/${split}/ (${runFiles.length} found) → ${check(runFiles.length === 0)}. Cases were written from LABELING_GUIDE.md only; no test data or model output was consulted (process attestation, not machine-checkable).`,
    "",
    "## Cases flagged for owner attention",
    flagged.length === 0 ? "None." : flagged.map((c) => `- **${c.id}**: ${c.notes.replace(/^.*?labels are drafts pending owner review\.\s*/, "")}`).join("\n"),
    "",
  ].join("\n");
}

function main() {
  const i = process.argv.indexOf("--split");
  const split = (i > -1 ? process.argv[i + 1] : "dev") as Split;
  const { cases, errors, warnings } = loadSplit(split);
  const prefix = split.toUpperCase();
  const review = [
    `# ${prefix} benchmark: owner review`,
    "",
    `${cases.length} cases. Generated by \`npm run benchmark-review -- --split ${split}\` from the case files; edit the JSON files, not this document. All labels follow LABELING_GUIDE.md v1.`,
    "",
    ...cases.map(renderCase),
  ].join("\n");
  fs.writeFileSync(path.join(BENCHMARK_ROOT, `${prefix}_REVIEW.md`), review + "\n");
  fs.writeFileSync(path.join(BENCHMARK_ROOT, `${prefix}_AUDIT.md`), renderAudit(split, cases, errors, warnings));
  console.log(`wrote ${prefix}_REVIEW.md and ${prefix}_AUDIT.md (${cases.length} cases, ${errors.length} errors)`);
  if (errors.length > 0) process.exit(1);
}

main();
