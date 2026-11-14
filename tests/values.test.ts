import { describe, expect, it } from "vitest";
import { compareForScoring, compareUnknown, formatValue, scoringValuesEqual, valuesEqual } from "@/core/values";
import { meeting, people, usd } from "./helpers";

describe("budget equality", () => {
  it("compares exact amounts and currency", () => {
    expect(valuesEqual("budget", usd(100000), usd(100000))).toBe(true);
    expect(valuesEqual("budget", usd(100000), usd(90000))).toBe(false);
    expect(valuesEqual("budget", usd(100000), { kind: "exact", amount: 100000, currency: "EUR" })).toBe(false);
  });
  it("compares ranges by both bounds and never equates a range with an exact amount", () => {
    const r = { kind: "range" as const, min: 80000, max: 100000, currency: "USD" };
    expect(valuesEqual("budget", r, { ...r })).toBe(true);
    expect(valuesEqual("budget", r, { ...r, max: 110000 })).toBe(false);
    expect(valuesEqual("budget", r, usd(90000))).toBe(false); // no invented midpoint
  });
});

describe("decision maker equality", () => {
  it("matches a first name to a full name with the same first token", () => {
    expect(valuesEqual("decisionMaker", people(["Sarah", null]), people(["Sarah Chen", "CTO"]))).toBe(true);
    expect(valuesEqual("decisionMaker", people(["sarah  chen", null]), people(["Sarah Chen", null]))).toBe(true);
  });
  it("does not match different people", () => {
    expect(valuesEqual("decisionMaker", people(["Sarah Chen", null]), people(["Sarah Lee", null]))).toBe(false);
    expect(valuesEqual("decisionMaker", people(["Sarah", null]), people(["James", null]))).toBe(false);
  });
  it("falls back to role when a name is missing", () => {
    expect(valuesEqual("decisionMaker", people([null, "CFO"]), people(["Dana", "cfo"]))).toBe(true);
    expect(valuesEqual("decisionMaker", people([null, "CFO"]), people([null, "Chief Financial Officer"]))).toBe(false);
    expect(valuesEqual("decisionMaker", people([null, "CFO"]), people(["Dana", null]))).toBe(false);
  });
  it("compares joint approval as an order-independent set of the same size", () => {
    const joint = people(["Dana", null], ["Raj Patel", "COO"]);
    expect(valuesEqual("decisionMaker", joint, people(["Raj", null], ["Dana", null]))).toBe(true);
    expect(valuesEqual("decisionMaker", joint, people(["Raj Patel", "COO"]))).toBe(false); // collapsed to one
    expect(valuesEqual("decisionMaker", people(["Dana", null], ["Dana", null]), people(["Dana", null], ["Raj", null]))).toBe(false);
  });
});

describe("meeting equality", () => {
  it("compares dates; times only when both are present; ignores timezone and phrasing", () => {
    expect(valuesEqual("nextMeeting", meeting("2026-03-12", "14:00", "Thu at 2"), { ...meeting("2026-03-12", "14:00", "Thursday 2pm"), timezone: "ET" })).toBe(true);
    expect(valuesEqual("nextMeeting", meeting("2026-03-12", null), meeting("2026-03-12", "14:00"))).toBe(true);
    expect(valuesEqual("nextMeeting", meeting("2026-03-12", "14:00"), meeting("2026-03-12", "15:00"))).toBe(false);
    expect(valuesEqual("nextMeeting", meeting("2026-03-12"), meeting("2026-03-13"))).toBe(false);
    expect(valuesEqual("nextMeeting", meeting(null), meeting(null))).toBe(true);
  });
});

describe("compareUnknown", () => {
  it("returns null when either side is null", () => {
    expect(compareUnknown("budget", null, usd(1))).toBeNull();
  });
  it("throws on a malformed value instead of silently scoring a mismatch", () => {
    expect(() => compareUnknown("budget", { amount: "100K" }, usd(100000))).toThrow();
  });
  it("formats values for reports", () => {
    expect(formatValue("budget", usd(100000))).toBe("USD 100,000");
    expect(formatValue("decisionMaker", people(["Marcus", "CFO"], [null, "COO"]))).toBe("Marcus (CFO) + (COO)");
  });
});

describe("scoring equality (scoring v2, after DEV Run 1): exact meeting time", () => {
  const g = (time: string | null) => meeting("2026-03-19", time);
  it("gold has a time: a missing or different time is not an exact match", () => {
    expect(scoringValuesEqual("nextMeeting", g("16:00"), g(null))).toBe(false);
    expect(scoringValuesEqual("nextMeeting", g("16:00"), g("15:00"))).toBe(false);
    expect(scoringValuesEqual("nextMeeting", g("16:00"), g("16:00"))).toBe(true);
  });
  it("gold has no time: null matches, an invented time does not", () => {
    expect(scoringValuesEqual("nextMeeting", g(null), g(null))).toBe(true);
    expect(scoringValuesEqual("nextMeeting", g(null), g("14:00"))).toBe(false);
  });
  it("still ignores timezone and asStated, and still requires the same date (null == null)", () => {
    expect(scoringValuesEqual("nextMeeting", { ...g("16:00"), timezone: "ET", asStated: "x" }, { ...g("16:00"), asStated: "y" })).toBe(true);
    expect(scoringValuesEqual("nextMeeting", meeting(null, "11:00"), meeting(null, "11:00"))).toBe(true);
    expect(scoringValuesEqual("nextMeeting", meeting(null, "11:00"), meeting("2026-04-23", "11:00"))).toBe(false);
  });
  it("leaves budget and decision-maker scoring identical to semantic equality", () => {
    expect(scoringValuesEqual("decisionMaker", people(["Sarah Chen", "CTO"]), people(["Sarah", null]))).toBe(true);
    expect(scoringValuesEqual("budget", usd(1), usd(1))).toBe(true);
  });
  it("does NOT change the policy's semantic equality (used for NO_OP and conflicts)", () => {
    expect(valuesEqual("nextMeeting", g("16:00"), g(null))).toBe(true);
    expect(compareForScoring("nextMeeting", g("16:00"), g(null))).toBe(false);
  });
});
