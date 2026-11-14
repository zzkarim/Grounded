import { describe, expect, it } from "vitest";
import { groundEvidence } from "@/core/grounding";
import { decideClaim } from "@/core/policy";
import { BenchmarkCase, CandidateClaim, CRM_FIELDS } from "@/core/schemas";
import { checkCase, loadSplit } from "@/eval/benchmark";

const examples = loadSplit("example");

describe("illustrative example cases", () => {
  it("are exactly six valid cases: 2 budget, 2 decision maker, 2 meeting", () => {
    expect(examples.errors).toEqual([]);
    expect(examples.cases.map((c) => c.id).sort()).toEqual(["budget-ex-01", "budget-ex-02", "dm-ex-01", "dm-ex-02", "meeting-ex-01", "meeting-ex-02"]);
  });

  it("are honestly labeled as generated drafts outside the benchmark", () => {
    for (const c of examples.cases) expect(c).toMatchObject({ split: "example", source: "generated", labelStatus: "draft" });
  });

  it("only warn about draft status (no rubric inconsistencies)", () => {
    expect(examples.warnings.filter((w) => !w.includes("labelStatus is draft"))).toEqual([]);
  });

  // Consistency check between the labeling rubric and the policy (DECISIONS.md D11): if a perfect
  // classifier produced exactly the gold labels, the policy would reproduce the gold action.
  // This tests rubric/policy agreement, NOT system performance.
  it("gold semantic labels + deterministic policy reproduce each gold action", () => {
    for (const c of examples.cases) {
      for (const field of CRM_FIELDS) {
        const g = c.expected[field];
        if (g.value === null) continue;
        const claim = { id: "gold", field, value: g.value, evidence: g.evidence } as CandidateClaim;
        const d = decideClaim({
          claim,
          classification: { claimId: "gold", status: g.status!, certainty: g.certainty!, sufficiency: g.sufficiency!, explanation: "" },
          grounding: groundEvidence(g.evidence, c.transcript),
          existing: c.crm[field],
        });
        expect(d.action, `${c.id}.${field}`).toBe(g.action);
      }
    }
  });
});

describe("checkCase catches labeling mistakes", () => {
  const base = () => structuredClone(examples.cases.find((c) => c.id === "meeting-ex-01")!) as BenchmarkCase;

  it("gold evidence that is not in the transcript", () => {
    const c = base();
    c.expected.nextMeeting.evidence[1].quote = "Thursday at two works";
    expect(checkCase(c)[0].join()).toMatch(/QUOTE_NOT_IN_TURN/);
  });

  it("ACT/ASK/NO_OP without a value", () => {
    const c = base();
    c.expected.budget.action = "ASK";
    expect(checkCase(c)[0].join()).toMatch(/ASK requires a value/);
  });

  it("NO_OP whose value differs from the CRM", () => {
    const c = base();
    c.expected.nextMeeting.action = "NO_OP";
    expect(checkCase(c)[0].join()).toMatch(/NO_OP requires/);
  });

  it("warns when an ACT label would overwrite an existing CRM value", () => {
    const c = base();
    c.crm.nextMeeting = { date: "2026-03-30", time: null, timezone: null, asStated: "the 30th" };
    expect(checkCase(c)[1].join()).toMatch(/different value/);
  });
});
