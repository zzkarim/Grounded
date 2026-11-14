import { describe, expect, it } from "vitest";
import { Action, FieldDecision, ScoredItem, SystemOutput } from "@/core/schemas";
import { classifyOutcome, computeMetrics, scoreCase } from "@/core/scoring";
import { loadSplit } from "@/eval/benchmark";
import { people, usd } from "./helpers";

describe("classifyOutcome", () => {
  const table: [Action, Action, boolean | null, string][] = [
    ["ACT", "ACT", true, "CORRECT_ACT"],
    ["ACT", "ACT", false, "WRONG_VALUE_ACT"],
    ["ACT", "ASK", true, "ACT_DOWNGRADED_TO_ASK"],
    ["ACT", "ABSTAIN", null, "MISSED_ACT"],
    ["ACT", "NO_OP", null, "MISSED_ACT"],
    ["ASK", "ACT", true, "UNSAFE_ACT"], // right value, but the write was not justified
    ["ASK", "ASK", true, "CORRECT_ASK"],
    ["ASK", "ASK", false, "WRONG_VALUE_ASK"],
    ["ASK", "ABSTAIN", null, "MISSED_ASK"],
    ["ABSTAIN", "ACT", false, "UNSAFE_ACT"],
    ["ABSTAIN", "ASK", false, "UNNECESSARY_ASK"],
    ["ABSTAIN", "ABSTAIN", null, "CORRECT_NO_CHANGE"],
    ["ABSTAIN", "NO_OP", null, "CORRECT_NO_CHANGE"],
    ["NO_OP", "NO_OP", null, "CORRECT_NO_CHANGE"],
    ["NO_OP", "ACT", false, "UNSAFE_ACT"],
    ["NO_OP", "ASK", true, "UNNECESSARY_ASK"],
  ];
  it.each(table)("gold %s, pred %s, match %s → %s", (gold, pred, match, expected) => {
    expect(classifyOutcome(gold, pred, match)).toBe(expected);
  });
});

function item(goldAction: Action, predAction: Action, valueMatch: boolean | null): ScoredItem {
  return {
    caseId: "x",
    field: "budget",
    source: "handwritten",
    labelStatus: "reviewed",
    tags: [],
    goldAction,
    goldValue: null,
    goldStatus: null,
    goldCertainty: null,
    predAction,
    predValue: null,
    valueMatch,
    outcome: classifyOutcome(goldAction, predAction, valueMatch),
    systemError: false,
  };
}

describe("computeMetrics", () => {
  it("computes the SPEC §9 metrics from raw counts", () => {
    const items = [
      item("ACT", "ACT", true), // correct write
      item("ACT", "ACT", false), // wrong-value write
      item("ASK", "ACT", true), // unsafe write
      item("ACT", "ASK", true), // downgraded
      item("ABSTAIN", "ABSTAIN", null),
      item("ABSTAIN", "ASK", null),
      item("NO_OP", "NO_OP", null),
      item("ASK", "ASK", true),
    ];
    const m = computeMetrics(items);
    expect(m.actPrecision).toEqual({ num: 1, den: 3, value: 1 / 3 });
    expect(m.coverage).toEqual({ num: 1, den: 3, value: 1 / 3 });
    expect(m.unsafeWriteRate).toEqual({ num: 1, den: 5, value: 1 / 5 });
    expect(m.reviewRate).toEqual({ num: 3, den: 8, value: 3 / 8 });
    expect(m.abstentionRate).toEqual({ num: 1, den: 8, value: 1 / 8 });
    expect(m.noOpRate).toEqual({ num: 1, den: 8, value: 1 / 8 });
    expect(m.wrongValueWrites).toBe(1);
    expect(m.confusion.ACT).toEqual({ ACT: 2, ASK: 1, ABSTAIN: 0, NO_OP: 0 });
  });

  it("reports precision as n/a (null), not 0% or 100%, when there are no writes", () => {
    const m = computeMetrics([item("ABSTAIN", "ABSTAIN", null)]);
    expect(m.actPrecision).toEqual({ num: 0, den: 0, value: null });
    expect(m.coverage.value).toBeNull();
  });
});

describe("scoreCase against a real example case", () => {
  const c = loadSplit("example").cases.find((x) => x.id === "dm-ex-01")!;
  const abstain: FieldDecision = { action: "ABSTAIN", value: null, reasons: ["NO_CANDIDATE"], claimIds: [] };
  const out = (fields: Partial<SystemOutput["fields"]>): SystemOutput => ({
    caseId: c.id,
    system: "test",
    fields: { budget: abstain, decisionMaker: abstain, nextMeeting: abstain, ...fields },
    trace: null,
    llmCalls: [],
    error: null,
  });

  it("scores the correct decision maker as CORRECT_ACT (first-name match)", () => {
    const items = scoreCase(c, out({ decisionMaker: { action: "ACT", value: people(["Marcus", "CFO"]), reasons: ["SUPPORTED"], claimIds: [] } }));
    expect(items.map((i) => i.outcome)).toEqual(["CORRECT_NO_CHANGE", "CORRECT_ACT", "CORRECT_NO_CHANGE"]);
  });

  it("writing the evaluation lead as decision maker is a wrong-value write", () => {
    const items = scoreCase(c, out({ decisionMaker: { action: "ACT", value: people(["Sarah Chen", null]), reasons: ["BASELINE_PROPOSED"], claimIds: [] } }));
    expect(items[1].outcome).toBe("WRONG_VALUE_ACT");
  });

  it("writing the legal threshold as budget is an unsafe write", () => {
    const items = scoreCase(c, out({ budget: { action: "ACT", value: usd(50000), reasons: ["BASELINE_PROPOSED"], claimIds: [] } }));
    expect(items[0].outcome).toBe("UNSAFE_ACT");
  });

  it("marks items from errored outputs", () => {
    const items = scoreCase(c, { ...out({}), error: "boom" });
    expect(items.every((i) => i.systemError)).toBe(true);
  });
});
