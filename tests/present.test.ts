/** Product presentation layer (src/product/present.ts). Generic examples only. */
import { describe, expect, it } from "vitest";
import { decideCase } from "@/core/policy";
import { PolicyReason } from "@/core/schemas";
import {
  ACTION,
  formatBudget,
  formatDate,
  formatDecisionMaker,
  formatFieldValue,
  formatMeeting,
  formatTime,
  ledgerEntries,
  orderReasons,
  presentAction,
  primaryReason,
  qualifiedValue,
  REASON,
} from "@/product/present";
import { claim, cls, emptyCRM, ev, meeting, people, transcript, usd } from "./helpers";

describe("reason copy", () => {
  it("covers every frozen PolicyReason with non-empty copy", () => {
    for (const r of PolicyReason.options) {
      expect(REASON[r].short.length, r).toBeGreaterThan(0);
      expect(REASON[r].explanation.length, r).toBeGreaterThan(0);
    }
    expect(Object.keys(REASON).sort()).toEqual([...PolicyReason.options].sort());
  });
  it("leads with the most consequential reason", () => {
    expect(primaryReason(["TENTATIVE", "CONFLICTS_WITH_EXISTING"])).toBe("CONFLICTS_WITH_EXISTING");
    expect(primaryReason(["UNDERSPECIFIED_VALUE", "VALUE_UNVERIFIED"])).toBe("VALUE_UNVERIFIED");
    expect(primaryReason(["SUPPORTED"])).toBe("SUPPORTED");
    expect(orderReasons(["TENTATIVE", "TENTATIVE", "CONDITIONAL"])).toEqual(["CONDITIONAL", "TENTATIVE"]);
  });
  it("orders every reason (none falls outside the priority list)", () => {
    const ordered = orderReasons([...PolicyReason.options].reverse());
    expect(ordered).toHaveLength(PolicyReason.options.length);
  });
  it("throws rather than inventing a reason", () => {
    expect(() => primaryReason([])).toThrow();
  });
});

describe("actions", () => {
  it("every action has a text label and glyph (not colour-only)", () => {
    for (const a of Object.values(ACTION)) {
      expect(a.label).toBeTruthy();
      expect(a.glyph).toBeTruthy();
    }
  });
  it("system errors are presented as errors, not ordinary abstentions", () => {
    expect(presentAction({ action: "ABSTAIN", reasons: ["SYSTEM_ERROR"] }).tone).toBe("error");
    expect(presentAction({ action: "ABSTAIN", reasons: ["NO_CANDIDATE"] }).tone).toBe("held");
  });
});

describe("value formatting", () => {
  it("budgets", () => {
    expect(formatBudget(usd(100000))).toBe("$100,000");
    expect(formatBudget({ kind: "range", min: 80000, max: 95000, currency: "USD" })).toBe("$80,000–$95,000");
    expect(formatBudget({ kind: "exact", amount: 5000, currency: "EUR" })).toBe("€5,000");
  });
  it("decision makers", () => {
    expect(formatDecisionMaker(people(["Ada Park", "CFO"]))).toBe("Ada Park (CFO)");
    expect(formatDecisionMaker(people([null, "General Counsel"], ["Lee", null]))).toBe("General Counsel + Lee");
  });
  it("meetings, computed in UTC", () => {
    expect(formatDate("2026-03-12")).toBe("Thu, Mar 12");
    expect(formatDate("2026-03-12", { year: true })).toBe("Thu, Mar 12, 2026");
    expect(formatTime("14:00")).toBe("2:00 PM");
    expect(formatTime("09:30")).toBe("9:30 AM");
    expect(formatTime("00:15")).toBe("12:15 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatMeeting({ ...meeting("2026-03-12", "14:00"), timezone: "ET" })).toBe("Thu, Mar 12 · 2:00 PM ET");
    expect(formatMeeting(meeting(null, "15:30"))).toBe("Date not confirmed · 3:30 PM");
    expect(formatMeeting(meeting("2026-03-12"))).toBe("Thu, Mar 12");
  });
  it("never throws on null or malformed values", () => {
    expect(formatFieldValue("budget", null)).toBe("—");
    expect(formatFieldValue("budget", { kind: "exact" })).toBe("Unreadable value");
  });
  it("a hedged budget is qualified for display only", () => {
    expect(qualifiedValue("budget", usd(100000), "TENTATIVE")).toBe("~$100,000");
    expect(qualifiedValue("budget", usd(100000), "EXPLICIT")).toBe("$100,000");
    expect(qualifiedValue("decisionMaker", people(["Ada", null]), "TENTATIVE")).toBe("Ada");
  });
});

describe("ledger: only claims present in the trace", () => {
  const t = transcript([
    ["rep", "What's the budget?"],
    ["cust", "Last year it was $40K. This year $90K is approved."],
    ["cust", "Ada signs."],
  ]);
  const old = claim("budget", usd(40000), [ev(t, "t2", "Last year it was $40K.")], "a1");
  const cur = claim("budget", usd(90000), [ev(t, "t2", "This year $90K is approved.")], "a2");
  const dm = claim("decisionMaker", people(["Ada", null]), [ev(t, "t3")], "a3");
  const { records } = decideCase(
    [
      { claim: old, classification: cls("a1", "HISTORICAL", "EXPLICIT", "DIRECT"), grounding: { grounded: true, hasCustomerEvidence: true, failures: [] } },
      { claim: cur, classification: cls("a2", "CURRENT", "EXPLICIT", "DIRECT"), grounding: { grounded: true, hasCustomerEvidence: true, failures: [] } },
      { claim: dm, classification: cls("a3", "CURRENT", "EXPLICIT", "DIRECT"), grounding: { grounded: true, hasCustomerEvidence: true, failures: [] } },
    ],
    emptyCRM(),
    t,
  );
  const entries = ledgerEntries(records, t);

  it("has exactly one entry per trace record", () => {
    expect(entries.map((e) => e.claimId).sort()).toEqual(["a1", "a2", "a3"]);
  });
  it("separates claims that became decisions from claims only heard", () => {
    expect(entries.find((e) => e.claimId === "a1")).toMatchObject({ group: "heard", action: "ABSTAIN", note: REASON.STATUS_HISTORICAL.explanation });
    expect(entries.find((e) => e.claimId === "a2")).toMatchObject({ group: "decision", action: "ACT", value: "$90,000" });
  });
  it("attributes quotes to named speakers and sides", () => {
    expect(entries.find((e) => e.claimId === "a3")!.quotes[0]).toMatchObject({ speaker: "Carl Customer", side: "customer", quote: "Ada signs." });
  });
});
