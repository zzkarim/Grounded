import { describe, expect, it } from "vitest";
import { groundEvidence, normalizeForMatch } from "@/core/grounding";
import { CUST, REP, transcript } from "./helpers";

const t = transcript([
  ["rep", "So your budget is $100K?"],
  ["cust", "No.  We have   $80K approved for this project."],
  ["cust", "It’s the “final” number — signed off."],
]);

describe("groundEvidence", () => {
  it("grounds an exact substring of the cited turn, spoken by the cited speaker", () => {
    const r = groundEvidence([{ turnId: "t2", speakerId: CUST, quote: "We have $80K approved" }], t);
    expect(r).toEqual({ grounded: true, hasCustomerEvidence: true, failures: [] });
  });

  it("normalizes whitespace, curly quotes and dashes only", () => {
    const r = groundEvidence([{ turnId: "t3", speakerId: CUST, quote: `It's the "final" number - signed off.` }], t);
    expect(r.grounded).toBe(true);
    expect(normalizeForMatch("a —  b")).toBe("a - b");
  });

  it("rejects paraphrases and case changes", () => {
    for (const quote of ["We have $80,000 approved", "we have $80K approved", "Budget is $80K"]) {
      const r = groundEvidence([{ turnId: "t2", speakerId: CUST, quote }], t);
      expect(r.grounded).toBe(false);
      expect(r.failures[0].reason).toBe("QUOTE_NOT_IN_TURN");
    }
  });

  it("rejects a real quote attributed to the wrong turn", () => {
    const r = groundEvidence([{ turnId: "t3", speakerId: CUST, quote: "We have $80K approved" }], t);
    expect(r.failures).toEqual([{ evidenceIndex: 0, reason: "QUOTE_NOT_IN_TURN" }]);
  });

  it("rejects a quote attributed to the wrong speaker (rep words claimed as the customer's)", () => {
    const r = groundEvidence([{ turnId: "t1", speakerId: CUST, quote: "So your budget is $100K?" }], t);
    expect(r).toMatchObject({ grounded: false, hasCustomerEvidence: false });
    expect(r.failures[0].reason).toBe("SPEAKER_MISMATCH");
  });

  it("rejects unknown turns", () => {
    expect(groundEvidence([{ turnId: "t99", speakerId: CUST, quote: "No." }], t).failures[0].reason).toBe("UNKNOWN_TURN");
  });

  it("grounds rep-only evidence but reports no customer evidence", () => {
    const r = groundEvidence([{ turnId: "t1", speakerId: REP, quote: "So your budget is $100K?" }], t);
    expect(r).toEqual({ grounded: true, hasCustomerEvidence: false, failures: [] });
  });

  it("fails the whole claim if any one evidence item fails", () => {
    const r = groundEvidence(
      [
        { turnId: "t2", speakerId: CUST, quote: "We have $80K approved" },
        { turnId: "t3", speakerId: CUST, quote: "fabricated sentence" },
      ],
      t,
    );
    expect(r).toMatchObject({ grounded: false, hasCustomerEvidence: false });
    expect(r.failures).toEqual([{ evidenceIndex: 1, reason: "QUOTE_NOT_IN_TURN" }]);
  });

  it("treats empty evidence and whitespace-only quotes as ungrounded", () => {
    expect(groundEvidence([], t).grounded).toBe(false);
    expect(groundEvidence([{ turnId: "t2", speakerId: CUST, quote: "   " }], t).grounded).toBe(false);
  });
});
