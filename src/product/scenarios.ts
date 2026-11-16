/**
 * Demo scenario loading and dry runs (PRODUCT_PLAN.md §15–16). Server/CLI only (reads files).
 *
 * Scenarios are purpose-built demo inputs, NOT benchmark cases. The system only ever sees
 * toCaseInput(scenario): the CRM and transcript. designIntent is never shown to any model.
 */
import fs from "node:fs";
import path from "node:path";
import { groundEvidence } from "@/core/grounding";
import { decideCase, type ClaimRecord } from "@/core/policy";
import { CandidateClaim, CRM_FIELDS, VALUE_SCHEMAS, type CRMField, type FieldDecision } from "@/core/schemas";
import { valuesEqual } from "@/core/values";
import { DemoScenario, type DryRun } from "./types";

export const DEMO_ROOT = path.join(process.cwd(), "data", "demo");
export const SCENARIO_DIR = path.join(DEMO_ROOT, "scenarios");
/** Presentation order in the account rail. */
export const SCENARIO_ORDER = ["corrigan", "meridale", "ardent"] as const;

/** Structural checks Zod can't express. Returns a list of problems (empty = valid). */
export function checkScenario(s: DemoScenario): string[] {
  const problems: string[] = [];
  const sides = new Set(s.transcript.participants.map((p) => p.side));
  if (!sides.has("rep") || !sides.has("customer")) problems.push("transcript needs a rep and a customer");
  if (s.crm.company !== s.account.name) problems.push("crm.company must equal account.name");

  for (const f of CRM_FIELDS) {
    const intent = s.designIntent.fields[f];
    if (intent.expectedValue !== null && !VALUE_SCHEMAS[f].safeParse(intent.expectedValue).success) {
      problems.push(`designIntent.fields.${f}.expectedValue is not a valid ${f} value`);
    }
    if ((intent.expectedValue === null) !== (intent.expectedAction === "ABSTAIN")) {
      problems.push(`designIntent.fields.${f}: ABSTAIN iff expectedValue is null`);
    }
  }
  s.designIntent.dryRuns.forEach((d, i) => {
    d.claims.forEach((c, j) => {
      if (!VALUE_SCHEMAS[c.field].safeParse(c.value).success) problems.push(`dryRuns[${i}].claims[${j}]: invalid ${c.field} value`);
      for (const fl of groundEvidence(c.evidence, s.transcript).failures) {
        problems.push(`dryRuns[${i}].claims[${j}].evidence[${fl.evidenceIndex}]: ${fl.reason}`);
      }
    });
  });
  // The primary dry run must agree with the stated design intent.
  const primary = s.designIntent.dryRuns[0];
  for (const f of CRM_FIELDS) {
    if (primary.expect[f] !== s.designIntent.fields[f].expectedAction) {
      problems.push(`dryRuns[0].expect.${f} (${primary.expect[f]}) ≠ designIntent.fields.${f}.expectedAction`);
    }
  }
  return problems;
}

export function loadScenarioFile(file: string): DemoScenario {
  const s = DemoScenario.parse(JSON.parse(fs.readFileSync(file, "utf8")));
  const problems = checkScenario(s);
  if (problems.length > 0) throw new Error(`${path.basename(file)}: ${problems.join("; ")}`);
  if (`${s.id}.json` !== path.basename(file)) throw new Error(`${path.basename(file)}: id must match file name`);
  return s;
}

export function loadScenarios(): DemoScenario[] {
  const files = fs.readdirSync(SCENARIO_DIR).filter((f) => f.endsWith(".json"));
  const all = files.map((f) => loadScenarioFile(path.join(process.cwd(), "data", "demo", "scenarios", f)));
  const rank = (id: string) => {
    const i = (SCENARIO_ORDER as readonly string[]).indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return all.sort((a, b) => rank(a.id) - rank(b.id));
}

export type DryRunResult = { fields: Record<CRMField, FieldDecision>; records: ClaimRecord[] };

/**
 * Feed a dry run's ASSUMED model outputs through the REAL frozen deterministic stages: grounding,
 * meeting-v1 validation (inside decideCase), policy and reconciliation. No model is involved.
 * This answers "if the model returns this, what does Grounded do?", never "what will the model return?".
 */
export function runDryRun(s: DemoScenario, d: DryRun): DryRunResult {
  const inputs = d.claims.map((c, i) => {
    const id = `c${i + 1}`;
    const claim = CandidateClaim.parse({ id, field: c.field, value: c.value, evidence: c.evidence });
    return {
      claim,
      classification: { claimId: id, status: c.status, certainty: c.certainty, sufficiency: c.sufficiency, explanation: "assumed (dry run)" },
      grounding: groundEvidence(c.evidence, s.transcript),
    };
  });
  return decideCase(inputs, s.crm, s.transcript);
}

/** True if the field decision's value equals the design intent (policy "same fact" equality). */
export function matchesIntentValue(field: CRMField, actual: unknown, expected: unknown): boolean {
  if (actual === null || expected === null) return actual === expected;
  return valuesEqual(field, VALUE_SCHEMAS[field].parse(actual) as never, VALUE_SCHEMAS[field].parse(expected) as never);
}
