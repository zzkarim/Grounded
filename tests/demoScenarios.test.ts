/**
 * Demo scenarios (data/demo/scenarios). These tests check the scenarios' INTERNAL consistency and
 * what the REAL frozen deterministic stages do with ASSUMED model outputs (dry runs).
 * They make no model calls and say nothing about what the model will actually return.
 */
import { describe, expect, it } from "vitest";
import { CRM_FIELDS } from "@/core/schemas";
import { comparePair, jaccard, sharedNames, shingles, words } from "@/product/overlap";
import { checkScenario, loadScenarios, matchesIntentValue, runDryRun } from "@/product/scenarios";
import { toCaseInput } from "@/product/types";

const scenarios = loadScenarios();

describe("scenario files", () => {
  it("are the three planned accounts, in rail order", () => {
    expect(scenarios.map((s) => s.id)).toEqual(["corrigan", "meridale", "ardent"]);
  });
  it.each(scenarios.map((s) => [s.id, s] as const))("%s passes structural checks", (_, s) => {
    expect(checkScenario(s)).toEqual([]);
  });
  it("the system input contains only CRM and transcript (no design intent)", () => {
    for (const s of scenarios) expect(Object.keys(toCaseInput(s)).sort()).toEqual(["caseId", "crm", "transcript"]);
  });
});

describe.each(scenarios.map((s) => [s.id, s] as const))("%s dry runs through the frozen deterministic stages", (_, s) => {
  it.each(s.designIntent.dryRuns.map((d) => [d.label, d] as const))("%s", (_label, d) => {
    const { fields, records } = runDryRun(s, d);
    for (const f of CRM_FIELDS) expect(fields[f].action, f).toBe(d.expect[f]);
    const fired = records.flatMap((r) => r.validation.issues.map((i) => i.rule));
    expect([...new Set(fired)].sort()).toEqual([...d.expectValidationRules].sort());
  });
  it("primary dry run yields the intended field values", () => {
    const { fields } = runDryRun(s, s.designIntent.dryRuns[0]);
    for (const f of CRM_FIELDS) {
      expect(matchesIntentValue(f, fields[f].value, s.designIntent.fields[f].expectedValue), f).toBe(true);
    }
  });
});

describe("key demo mechanisms (dry run)", () => {
  const byId = Object.fromEntries(scenarios.map((s) => [s.id, s]));
  it("Meridale: an explicit reschedule is ASK only because it conflicts with the CRM", () => {
    const s = byId.meridale;
    const { fields } = runDryRun(s, s.designIntent.dryRuns[0]);
    expect(fields.nextMeeting.reasons).toEqual(["CONFLICTS_WITH_EXISTING"]);
    // Same claims against an empty CRM: the reschedule would have been written.
    const empty = runDryRun({ ...s, crm: { ...s.crm, budget: null, decisionMaker: null, nextMeeting: null } }, s.designIntent.dryRuns[0]);
    expect(empty.fields.nextMeeting.action).toBe("ACT");
  });
  it("Ardent path A: meeting-v1 removes the same-day date and the claim becomes unverifiable", () => {
    const s = byId.ardent;
    const { fields, records } = runDryRun(s, s.designIntent.dryRuns[0]);
    const m = records.find((r) => r.claim.field === "nextMeeting")!;
    expect(m.validation.originalValue).toMatchObject({ date: "2026-11-12", time: "15:30" });
    expect(m.claim.value).toMatchObject({ date: null, time: "15:30" });
    expect(fields.nextMeeting.reasons).toEqual(expect.arrayContaining(["VALUE_UNVERIFIED", "UNDERSPECIFIED_VALUE"]));
  });
  it("Ardent: characterization of a known meeting-v1 gap (reported, not fixed): 'today' resolved to a LATER date passes validation", () => {
    const s = byId.ardent;
    const pathA = s.designIntent.dryRuns[0];
    const wrongDay = {
      ...pathA,
      claims: pathA.claims.map((c) => (c.field === "nextMeeting" ? { ...c, value: { ...(c.value as object), date: "2026-11-13" } } : c)),
    };
    const { fields, records } = runDryRun(s, wrongDay);
    expect(records.find((r) => r.claim.field === "nextMeeting")!.validation.verified).toBe(true);
    expect(fields.nextMeeting.action).toBe("ACT");
  });
});

describe("overlap utilities", () => {
  it("tokenizes, keeping times and amounts", () => {
    expect(words("Today at 3:30, about $1,500.")).toEqual(["today", "at", "3:30", "about", "$1,500"]);
  });
  it("Jaccard and shared phrases", () => {
    const a = shingles(words("one two three four five six"), 5);
    expect(jaccard(a, a)).toBe(1);
    const t = (text: string) => ({ id: "x", occurredAt: "2026-01-01", participants: [], turns: [{ id: "t1", speakerId: "a", text }] });
    const r = comparePair(t("the quick brown fox jumps over the lazy dog"), t("a quick brown fox jumps over the lazy dog today"), "o");
    expect(r.shared8).toEqual(["quick brown fox jumps over the lazy dog"]);
  });
  it("finds whole-word name tokens only", () => {
    expect(sharedNames(["Ada Park"], "Parker met Ada.")).toEqual(["Ada"]);
  });
});
