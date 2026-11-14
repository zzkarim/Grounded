import { describe, expect, it } from "vitest";
import { groundEvidence } from "@/core/grounding";
import { decideCase, decideClaim } from "@/core/policy";
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

// Owner-requested confirmation (guide v1.1 §4 step 4): with the real transcripts, an evaluation lead /
// technical approver (INDIRECT) next to the contract signer (gold DIRECT claim) still yields the gold ACT.
// The INDIRECT claim is built from a quote in the case transcript; nothing case-specific is in the policy.
describe("mixed-stakeholder cases resolve to the DIRECT signer", () => {
  const all = [...examples.cases, ...loadSplit("dev").cases];
  const scenarios: [string, string, string, string][] = [
    ["dm-ex-01", "t2", "Sarah Chen's leading the evaluation.", "Sarah Chen"],
    ["dev-gen-014", "t2", "Anil Gupta owns the technical approval", "Anil Gupta"],
    ["dev-gen-021", "t2", "Sarah's leading the evaluation", "Sarah"],
  ];
  it.each(scenarios)("%s", (id, turnId, quote, indirectName) => {
    const c = all.find((x) => x.id === id)!;
    const g = c.expected.decisionMaker;
    const speakerId = c.transcript.turns.find((t) => t.id === turnId)!.speakerId;
    const direct = { id: "direct", field: "decisionMaker", value: g.value, evidence: g.evidence } as CandidateClaim;
    const indirect = { id: "indirect", field: "decisionMaker", value: { people: [{ name: indirectName, role: null }] }, evidence: [{ turnId, speakerId, quote }] } as CandidateClaim;
    const { fields } = decideCase(
      [
        { claim: indirect, classification: { claimId: "indirect", status: "CURRENT", certainty: "EXPLICIT", sufficiency: "INDIRECT", explanation: "" }, grounding: groundEvidence(indirect.evidence, c.transcript) },
        { claim: direct, classification: { claimId: "direct", status: g.status!, certainty: g.certainty!, sufficiency: g.sufficiency!, explanation: "" }, grounding: groundEvidence(direct.evidence, c.transcript) },
      ],
      c.crm,
      c.transcript,
    );
    expect(g.action).toBe("ACT");
    expect(fields.decisionMaker).toMatchObject({ action: "ACT", value: g.value });
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
