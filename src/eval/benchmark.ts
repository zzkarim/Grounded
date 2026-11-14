/**
 * Load and validate benchmark cases from data/benchmark/<split>/.
 *
 * Errors   = the case is structurally invalid and must not be used.
 * Warnings = the label looks inconsistent with LABELING_GUIDE.md §4; the labeler should look.
 * This module only READS benchmark files. It never modifies them.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { groundEvidence } from "@/core/grounding";
import { BenchmarkCase, CRM_FIELDS, MeetingValue } from "@/core/schemas";
import { compareUnknown } from "@/core/values";

export type Split = "dev" | "test" | "example";
export const BENCHMARK_ROOT = path.join(process.cwd(), "data", "benchmark");
export const FROZEN_MANIFEST = path.join(BENCHMARK_ROOT, "FROZEN.json");

export function splitDir(split: Split): string {
  return path.join(BENCHMARK_ROOT, split === "example" ? "examples" : split);
}

export type LoadedSplit = {
  cases: BenchmarkCase[];
  files: { caseId: string; file: string; sha256: string }[];
  errors: string[];
  warnings: string[];
};

export const sha256 = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");

/** Semantic checks that Zod alone can't express. Returns [errors, warnings]. */
export function checkCase(c: BenchmarkCase): [string[], string[]] {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sides = new Set(c.transcript.participants.map((p) => p.side));
  if (!sides.has("rep") || !sides.has("customer")) errors.push("transcript needs at least one rep and one customer");

  for (const field of CRM_FIELDS) {
    const g = c.expected[field];
    const at = `expected.${field}`;
    const labels = [g.status, g.certainty, g.sufficiency];

    if (g.value === null) {
      if (g.action !== "ABSTAIN") errors.push(`${at}: ${g.action} requires a value`);
      if (labels.some((l) => l !== null) || g.evidence.length > 0) {
        errors.push(`${at}: value is null, so status/certainty/sufficiency must be null and evidence empty`);
      }
      continue;
    }
    if (labels.some((l) => l === null)) errors.push(`${at}: value is set, so status, certainty and sufficiency are required`);
    if (g.evidence.length === 0) errors.push(`${at}: value is set, so evidence is required`);

    const grounding = groundEvidence(g.evidence, c.transcript);
    for (const f of grounding.failures) errors.push(`${at}.evidence[${f.evidenceIndex}]: ${f.reason}`);

    const existing = c.crm[field];
    const same = existing === null ? null : compareUnknown(field, g.value, existing);
    if (g.action === "NO_OP" && same !== true) errors.push(`${at}: NO_OP requires the value to equal the existing CRM value`);

    // Rubric-consistency warnings (LABELING_GUIDE §4). Not errors: the labeler decides.
    if (g.action === "ACT") {
      const why: string[] = [];
      if (same === false) why.push("CRM already holds a different value (§4 step 6 → ASK)");
      if (same === true) why.push("value equals CRM value (§4 step 5 → NO_OP)");
      if (g.status !== "CURRENT") why.push(`status ${g.status}`);
      if (g.certainty !== "EXPLICIT") why.push(`certainty ${g.certainty}`);
      if (g.sufficiency !== "DIRECT") why.push(`sufficiency ${g.sufficiency}`);
      if (!grounding.hasCustomerEvidence) why.push("no customer-side evidence");
      if (field === "nextMeeting" && (g.value as MeetingValue).date === null) why.push("meeting date is null");
      if (why.length > 0) warnings.push(`${at}: ACT label but ${why.join("; ")}`);
    }
    if (g.action === "ABSTAIN" && g.status === "CURRENT" && g.sufficiency !== "NONE") {
      warnings.push(`${at}: ABSTAIN label on a CURRENT claim with ${g.sufficiency} support; check §4`);
    }
  }
  if (c.labelStatus === "draft") warnings.push("labelStatus is draft (not yet reviewed by the owner)");
  return [errors, warnings];
}

export function loadSplit(split: Split): LoadedSplit {
  const dir = splitDir(split);
  const out: LoadedSplit = { cases: [], files: [], errors: [], warnings: [] };
  if (!fs.existsSync(dir)) return { ...out, errors: [`missing directory ${dir}`] };

  const seen = new Set<string>();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const full = path.join(dir, file);
    const raw = fs.readFileSync(full);
    let json: unknown;
    try {
      json = JSON.parse(raw.toString("utf8"));
    } catch (e) {
      out.errors.push(`${file}: invalid JSON (${(e as Error).message})`);
      continue;
    }
    const parsed = BenchmarkCase.safeParse(json);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) out.errors.push(`${file}: ${issue.path.join(".")}: ${issue.message}`);
      continue;
    }
    const c = parsed.data;
    const [errors, warnings] = checkCase(c);
    if (c.split !== split) errors.push(`split is "${c.split}" but file is in ${split}/`);
    if (`${c.id}.json` !== file) errors.push(`id "${c.id}" does not match filename`);
    if (seen.has(c.id)) errors.push(`duplicate id ${c.id}`);
    seen.add(c.id);
    out.errors.push(...errors.map((e) => `${file}: ${e}`));
    out.warnings.push(...warnings.map((w) => `${file}: ${w}`));
    if (errors.length === 0) {
      out.cases.push(c);
      out.files.push({ caseId: c.id, file, sha256: sha256(raw) });
    }
  }
  return out;
}

type FrozenManifest = { frozenAt: Partial<Record<Split, string>>; splits: Partial<Record<Split, Record<string, string>>> };

/** Compare current files against data/benchmark/FROZEN.json, if present. */
export function checkFrozen(split: Split, files: LoadedSplit["files"]): { frozen: boolean; problems: string[] } {
  if (!fs.existsSync(FROZEN_MANIFEST)) return { frozen: false, problems: [] };
  const manifest = JSON.parse(fs.readFileSync(FROZEN_MANIFEST, "utf8")) as FrozenManifest;
  const expected = manifest.splits[split];
  if (!expected) return { frozen: false, problems: [] };
  const problems: string[] = [];
  const actual = new Map(files.map((f) => [f.file, f.sha256]));
  for (const [file, hash] of Object.entries(expected)) {
    if (!actual.has(file)) problems.push(`frozen file missing or invalid: ${file}`);
    else if (actual.get(file) !== hash) problems.push(`frozen file modified: ${file}`);
  }
  for (const file of actual.keys()) if (!(file in expected)) problems.push(`file added after freeze: ${file}`);
  return { frozen: true, problems };
}
