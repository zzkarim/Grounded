import { describe, expect, it } from "vitest";
import { groundEvidence } from "@/core/grounding";
import { decideCase, decideClaim, reconcileField } from "@/core/policy";
import {
  AnyFieldValue,
  CandidateClaim,
  Certainty,
  ClaimStatus,
  EvidenceSufficiency,
  SemanticClassification,
  Transcript,
} from "@/core/schemas";
import { claim, cls, emptyCRM, ev, meeting, people, transcript, usd } from "./helpers";

/** Run the full deterministic stage for one claim: real grounding + policy. */
function decide(t: Transcript, c: CandidateClaim, classification: SemanticClassification | null, existing: AnyFieldValue | null = null) {
  return decideClaim({ claim: c, classification, grounding: groundEvidence(c.evidence, t), existing });
}

describe("required policy behaviors", () => {
  it("exact, direct, approved budget can ACT", () => {
    const t = transcript([["rep", "Where's budget?"], ["cust", "Our approved budget for this is $75K."]]);
    const c = claim("budget", usd(75000), [ev(t, "t2")]);
    expect(decide(t, c, cls(c.id, "CURRENT", "EXPLICIT", "DIRECT"))).toMatchObject({ action: "ACT", reasons: ["SUPPORTED"] });
  });

  it("tentative budget does not ACT", () => {
    const t = transcript([["cust", "We could probably spend around $75K."]]);
    const c = claim("budget", usd(75000), [ev(t, "t1")]);
    expect(decide(t, c, cls(c.id, "CURRENT", "TENTATIVE", "DIRECT"))).toMatchObject({ action: "ASK", reasons: ["TENTATIVE"] });
  });

  it("conditional budget does not ACT", () => {
    const t = transcript([["cust", "If finance approves, we'll have $75K."]]);
    const c = claim("budget", usd(75000), [ev(t, "t1")]);
    expect(decide(t, c, cls(c.id, "CURRENT", "CONDITIONAL", "DIRECT"))).toMatchObject({ action: "ASK", reasons: ["CONDITIONAL"] });
  });

  it("historical budget does not overwrite current CRM state", () => {
    const t = transcript([["cust", "We used to have a $75K budget."]]);
    const c = claim("budget", usd(75000), [ev(t, "t1")]);
    const crm = emptyCRM({ budget: usd(120000) });
    const { fields, records } = decideCase([{ claim: c, classification: cls(c.id, "HISTORICAL", "EXPLICIT", "DIRECT"), grounding: groundEvidence(c.evidence, t) }], crm, t);
    expect(records[0].decision).toMatchObject({ action: "ABSTAIN", reasons: ["STATUS_HISTORICAL"] });
    expect(fields.budget).toMatchObject({ action: "ABSTAIN", value: null });
  });

  it("negated budget does not become the positive value, and the negative signal is preserved", () => {
    const t = transcript([["rep", "So your budget is $100K?"], ["cust", "No."]]);
    const c = claim("budget", usd(100000), [ev(t, "t1"), ev(t, "t2")]);
    const { fields, records } = decideCase([{ claim: c, classification: cls(c.id, "NEGATED", "EXPLICIT", "DIRECT"), grounding: groundEvidence(c.evidence, t) }], emptyCRM(), t);
    expect(fields.budget).toMatchObject({ action: "ABSTAIN", value: null, reasons: ["STATUS_NEGATED"], claimIds: [c.id] });
    // The claim, its NEGATED label and its evidence stay inspectable in the trace.
    expect(records[0]).toMatchObject({ claim: { value: usd(100000) }, classification: { status: "NEGATED" }, decision: { action: "ABSTAIN" } });
  });

  it("explicit stakeholder involvement does not establish decision-maker authority", () => {
    const t = transcript([["cust", "Sarah is leading the evaluation."]]);
    const c = claim("decisionMaker", people(["Sarah", null]), [ev(t, "t1")]);
    const d = decide(t, c, cls(c.id, "CURRENT", "EXPLICIT", "INDIRECT"));
    expect(d.action).not.toBe("ACT");
    expect(d).toMatchObject({ action: "ASK", reasons: ["INDIRECT_SUPPORT"] });
  });

  it("confirmed meeting can ACT", () => {
    const t = transcript([["rep", "Thursday at 2?"], ["cust", "Thursday at 2 works. Send me the invite."]]);
    const c = claim("nextMeeting", meeting("2026-03-12", "14:00"), [ev(t, "t1"), ev(t, "t2")]);
    expect(decide(t, c, cls(c.id, "CURRENT", "EXPLICIT", "DIRECT")).action).toBe("ACT");
  });

  it("tentative meeting asks for review", () => {
    const t = transcript([["cust", "Thursday should probably work, I'll confirm."]]);
    const c = claim("nextMeeting", meeting("2026-03-12"), [ev(t, "t1")]);
    expect(decide(t, c, cls(c.id, "CURRENT", "TENTATIVE", "DIRECT"))).toMatchObject({ action: "ASK", reasons: ["TENTATIVE"] });
  });

  it("existing conflicting CRM value defaults to ASK, even for explicit direct evidence", () => {
    const t = transcript([["cust", "Finance approved $60K for this."]]);
    const c = claim("budget", usd(60000), [ev(t, "t1")]);
    expect(decide(t, c, cls(c.id, "CURRENT", "EXPLICIT", "DIRECT"), usd(100000))).toMatchObject({ action: "ASK", reasons: ["CONFLICTS_WITH_EXISTING"] });
  });

  describe("invalid or missing evidence can never ACT", () => {
    const t = transcript([["rep", "Budget?"], ["cust", "We have $75K approved."]]);
    const perfect = (c: CandidateClaim) => cls(c.id, "CURRENT", "EXPLICIT", "DIRECT");

    it("paraphrased quote", () => {
      const c = claim("budget", usd(75000), [{ turnId: "t2", speakerId: "carl", quote: "Our budget is $75K" }]);
      expect(decide(t, c, perfect(c))).toMatchObject({ action: "ABSTAIN", reasons: ["UNGROUNDED_EVIDENCE"] });
    });
    it("quote attributed to the wrong speaker", () => {
      const c = claim("budget", usd(75000), [{ turnId: "t2", speakerId: "rita", quote: "We have $75K approved." }]);
      expect(decide(t, c, perfect(c)).action).toBe("ABSTAIN");
    });
    it("nonexistent turn", () => {
      const c = claim("budget", usd(75000), [{ turnId: "t7", speakerId: "carl", quote: "We have $75K approved." }]);
      expect(decide(t, c, perfect(c)).action).toBe("ABSTAIN");
    });
    it("missing classification (malformed or absent model output)", () => {
      const c = claim("budget", usd(75000), [ev(t, "t2")]);
      expect(decide(t, c, null)).toMatchObject({ action: "ABSTAIN", reasons: ["CLASSIFICATION_MISSING"] });
    });
    it("rep-only evidence asks rather than acts", () => {
      const t2 = transcript([["rep", "You have $75K approved."], ["cust", "Mm."]]);
      const c = claim("budget", usd(75000), [ev(t2, "t1")]);
      expect(decide(t2, c, perfect(c))).toMatchObject({ action: "ASK", reasons: ["NO_CUSTOMER_EVIDENCE"] });
    });
  });
});

describe("other per-claim rules", () => {
  const t = transcript([["cust", "Our price from you was $90K."]]);

  it("sufficiency NONE abstains even if explicit", () => {
    const c = claim("budget", usd(90000), [ev(t, "t1")]);
    expect(decide(t, c, cls(c.id, "CURRENT", "EXPLICIT", "NONE"))).toMatchObject({ action: "ABSTAIN", reasons: ["NO_SUPPORT"] });
  });

  it("same value as the CRM is a NO_OP, regardless of certainty", () => {
    const c = claim("budget", usd(90000), [ev(t, "t1")]);
    for (const certainty of ["EXPLICIT", "TENTATIVE", "CONDITIONAL"] as const) {
      expect(decide(t, c, cls(c.id, "CURRENT", certainty, "DIRECT"), usd(90000))).toMatchObject({ action: "NO_OP", reasons: ["MATCHES_EXISTING"] });
    }
  });

  it("a meeting without a resolvable date is underspecified and asks", () => {
    const t2 = transcript([["cust", "Sure, let's find time next week."]]);
    const c = claim("nextMeeting", meeting(null, null, "next week"), [ev(t2, "t1")]);
    expect(decide(t2, c, cls(c.id, "CURRENT", "EXPLICIT", "DIRECT"))).toMatchObject({ action: "ASK", reasons: ["UNDERSPECIFIED_VALUE"] });
  });

  it("collects every ASK reason that applies", () => {
    const t2 = transcript([["rep", "Maybe Sarah approves?"]]);
    const c = claim("decisionMaker", people(["Sarah", null]), [ev(t2, "t1")]);
    expect(decide(t2, c, cls(c.id, "CURRENT", "TENTATIVE", "INDIRECT"), people(["James", null])).reasons).toEqual([
      "CONFLICTS_WITH_EXISTING",
      "TENTATIVE",
      "INDIRECT_SUPPORT",
      "NO_CUSTOMER_EVIDENCE",
    ]);
  });
});

describe("exhaustive: ACT if and only if every safety condition holds", () => {
  const statuses: ClaimStatus[] = ["CURRENT", "HISTORICAL", "NEGATED", "SUPERSEDED"];
  const certainties: Certainty[] = ["EXPLICIT", "TENTATIVE", "CONDITIONAL"];
  const sufficiencies: EvidenceSufficiency[] = ["DIRECT", "INDIRECT", "NONE"];
  const t = transcript([["rep", "Is it Thursday at 2?"], ["cust", "Yes, Thursday at 2."]]);

  it("holds across all label × grounding × speaker × CRM × specificity combinations", () => {
    let checked = 0;
    for (const status of statuses)
      for (const certainty of certainties)
        for (const sufficiency of sufficiencies)
          for (const grounded of [true, false])
            for (const customer of [true, false])
              for (const existing of [null, meeting("2026-03-12", "14:00"), meeting("2026-03-20", "09:00")])
                for (const date of ["2026-03-12", null]) {
                  const evidence = [customer ? ev(t, "t2") : ev(t, "t1")];
                  if (!grounded) evidence[0] = { ...evidence[0], quote: "not said" };
                  const c = claim("nextMeeting", meeting(date, "14:00"), evidence);
                  const d = decide(t, c, cls(c.id, status, certainty, sufficiency), existing);
                  const shouldAct =
                    status === "CURRENT" && certainty === "EXPLICIT" && sufficiency === "DIRECT" && grounded && customer && existing === null && date !== null;
                  expect(d.action === "ACT", JSON.stringify({ status, certainty, sufficiency, grounded, customer, existing, date })).toBe(shouldAct);
                  if (!grounded || status !== "CURRENT" || sufficiency === "NONE") expect(d.action).toBe("ABSTAIN");
                  checked++;
                }
    expect(checked).toBe(4 * 3 * 3 * 2 * 2 * 3 * 2);
  });

  it("never ACTs without a classification", () => {
    const c = claim("nextMeeting", meeting("2026-03-12", "14:00"), [ev(t, "t2")]);
    expect(decide(t, c, null).action).toBe("ABSTAIN");
  });
});

describe("field reconciliation", () => {
  const t = transcript([
    ["cust", "I said $100K before."],
    ["cust", "But finance actually approved $75K."],
    ["cust", "Or maybe it's $80K, I'd have to check."],
  ]);
  const run = (inputs: [CandidateClaim, SemanticClassification | null][], crm = emptyCRM()) =>
    decideCase(inputs.map(([c, k]) => ({ claim: c, classification: k, grounding: groundEvidence(c.evidence, t) })), crm, t);

  it("a correction: superseded value abstains, the new explicit value acts", () => {
    const old = claim("budget", usd(100000), [ev(t, "t1")]);
    const now = claim("budget", usd(75000), [ev(t, "t2")]);
    const { fields } = run([
      [old, cls(old.id, "SUPERSEDED", "EXPLICIT", "DIRECT")],
      [now, cls(now.id, "CURRENT", "EXPLICIT", "DIRECT")],
    ]);
    expect(fields.budget).toMatchObject({ action: "ACT", value: usd(75000), claimIds: [old.id, now.id] });
  });

  it("conflicting live values downgrade ACT to ASK; ASK shows the latest-stated value", () => {
    const a = claim("budget", usd(75000), [ev(t, "t2")]);
    const b = claim("budget", usd(80000), [ev(t, "t3")]);
    const { fields, records } = run([
      [a, cls(a.id, "CURRENT", "EXPLICIT", "DIRECT")],
      [b, cls(b.id, "CURRENT", "TENTATIVE", "DIRECT")],
    ]);
    expect(fields.budget.action).toBe("ASK");
    expect(fields.budget.value).toEqual(usd(80000));
    expect(fields.budget.reasons).toContain("CONFLICTING_CANDIDATES");
    // The trace shows the FINAL per-claim decision, not the pre-conflict one.
    expect(records.find((r) => r.claim.id === a.id)!.decision).toMatchObject({ action: "ASK", reasons: ["CONFLICTING_CANDIDATES"] });
  });

  it("duplicate claims with the same value do not conflict", () => {
    const a = claim("budget", usd(75000), [ev(t, "t2")]);
    const b = claim("budget", usd(75000), [ev(t, "t2", "finance actually approved $75K")]);
    const { fields } = run([
      [a, cls(a.id, "CURRENT", "EXPLICIT", "DIRECT")],
      [b, cls(b.id, "CURRENT", "EXPLICIT", "DIRECT")],
    ]);
    expect(fields.budget.action).toBe("ACT");
  });

  it("no claims → ABSTAIN with NO_CANDIDATE for every field", () => {
    const { fields } = run([]);
    for (const f of [fields.budget, fields.decisionMaker, fields.nextMeeting]) expect(f).toEqual({ action: "ABSTAIN", value: null, reasons: ["NO_CANDIDATE"], claimIds: [] });
  });

  it("a corroborating NO_OP plus a different live value → ASK (never a silent overwrite)", () => {
    const same = claim("budget", usd(100000), [ev(t, "t1")]);
    const diff = claim("budget", usd(75000), [ev(t, "t2")]);
    const { fields } = run(
      [
        [same, cls(same.id, "CURRENT", "EXPLICIT", "DIRECT")],
        [diff, cls(diff.id, "CURRENT", "EXPLICIT", "DIRECT")],
      ],
      emptyCRM({ budget: usd(100000) }),
    );
    expect(fields.budget).toMatchObject({ action: "ASK", value: usd(75000) });
  });

  describe("decisionMaker: INDIRECT claims don't compete with a DIRECT final-authority claim (guide v1.1 §4 step 4)", () => {
    const dt = transcript([
      ["cust", "Sarah is leading the evaluation."],
      ["cust", "James signs the contract."],
      ["cust", "Actually, Priya has final sign-off on this."],
      ["cust", "I'd also run it by Omar."],
    ]);
    const runDM = (inputs: [CandidateClaim, SemanticClassification][], crm = emptyCRM()) =>
      decideCase(inputs.map(([c, k]) => ({ claim: c, classification: k, grounding: groundEvidence(c.evidence, dt) })), crm, dt);
    const sarah = () => claim("decisionMaker", people(["Sarah", null]), [ev(dt, "t1")]);
    const james = () => claim("decisionMaker", people(["James", null]), [ev(dt, "t2")]);

    it("INDIRECT + DIRECT → ACT for the DIRECT person; the INDIRECT claim is kept as an ABSTAIN signal", () => {
      const s = sarah(), j = james();
      const { fields, records } = runDM([
        [s, cls(s.id, "CURRENT", "EXPLICIT", "INDIRECT")],
        [j, cls(j.id, "CURRENT", "EXPLICIT", "DIRECT")],
      ]);
      expect(fields.decisionMaker).toMatchObject({ action: "ACT", value: people(["James", null]), reasons: ["SUPPORTED"] });
      expect(records.find((r) => r.claim.id === s.id)!.decision).toMatchObject({ action: "ABSTAIN", reasons: ["OUTRANKED_BY_DIRECT"] });
    });

    it("the outranking holds even when the DIRECT claim itself must ASK (existing CRM conflict) and shows the DIRECT value", () => {
      const s = sarah(), j = james();
      const { fields } = runDM(
        [
          [j, cls(j.id, "CURRENT", "EXPLICIT", "DIRECT")],
          [s, cls(s.id, "CURRENT", "EXPLICIT", "INDIRECT")], // stated earlier but listed later: value must still be James
        ],
        emptyCRM({ decisionMaker: people(["Dana", null]) }),
      );
      expect(fields.decisionMaker).toMatchObject({ action: "ASK", value: people(["James", null]), reasons: ["CONFLICTS_WITH_EXISTING"] });
    });

    it("a DIRECT claim that corroborates the CRM (NO_OP) also outranks INDIRECT claims", () => {
      const s = sarah(), j = james();
      const { fields } = runDM(
        [
          [s, cls(s.id, "CURRENT", "EXPLICIT", "INDIRECT")],
          [j, cls(j.id, "CURRENT", "EXPLICIT", "DIRECT")],
        ],
        emptyCRM({ decisionMaker: people(["James Holt", "VP"]) }),
      );
      expect(fields.decisionMaker.action).toBe("NO_OP");
    });

    it("two different DIRECT claims still conflict → ASK with the latest-stated value", () => {
      const j = james(), p = claim("decisionMaker", people(["Priya", null]), [ev(dt, "t3")]);
      const { fields } = runDM([
        [j, cls(j.id, "CURRENT", "EXPLICIT", "DIRECT")],
        [p, cls(p.id, "CURRENT", "EXPLICIT", "DIRECT")],
      ]);
      expect(fields.decisionMaker).toMatchObject({ action: "ASK", value: people(["Priya", null]) });
      expect(fields.decisionMaker.reasons).toContain("CONFLICTING_CANDIDATES");
    });

    it("joint approval is one claim and does not conflict with itself", () => {
      const joint = claim("decisionMaker", people(["James", null], ["Priya", null]), [ev(dt, "t2"), ev(dt, "t3")]);
      const s = sarah();
      const { fields } = runDM([
        [joint, cls(joint.id, "CURRENT", "EXPLICIT", "DIRECT")],
        [s, cls(s.id, "CURRENT", "EXPLICIT", "INDIRECT")],
      ]);
      expect(fields.decisionMaker).toMatchObject({ action: "ACT", value: people(["James", null], ["Priya", null]) });
    });

    it("with no DIRECT claim, different INDIRECT claims still conflict as before", () => {
      const s = sarah(), o = claim("decisionMaker", people(["Omar", null]), [ev(dt, "t4")]);
      const { fields } = runDM([
        [s, cls(s.id, "CURRENT", "EXPLICIT", "INDIRECT")],
        [o, cls(o.id, "CURRENT", "EXPLICIT", "INDIRECT")],
      ]);
      expect(fields.decisionMaker).toMatchObject({ action: "ASK", value: people(["Omar", null]) });
      expect(fields.decisionMaker.reasons).toContain("CONFLICTING_CANDIDATES");
    });

    it("a DIRECT claim that was itself discarded (e.g. NEGATED or ungrounded) does not outrank anything", () => {
      const s = sarah(), j = james();
      const { fields } = runDM([
        [s, cls(s.id, "CURRENT", "EXPLICIT", "INDIRECT")],
        [j, cls(j.id, "NEGATED", "EXPLICIT", "DIRECT")],
      ]);
      expect(fields.decisionMaker).toMatchObject({ action: "ASK", value: people(["Sarah", null]), reasons: ["INDIRECT_SUPPORT"] });
    });

    it("the outranking rule is decisionMaker-only: a DIRECT and an INDIRECT budget with different values still conflict", () => {
      const bt = transcript([["cust", "We have $80K approved."], ["cust", "We have $50K approved for licenses and $40K for services."]]);
      const direct = claim("budget", usd(80000), [ev(bt, "t1")]);
      const derived = claim("budget", usd(90000), [ev(bt, "t2")]);
      const { fields } = decideCase(
        [
          { claim: direct, classification: cls(direct.id, "CURRENT", "EXPLICIT", "DIRECT"), grounding: groundEvidence(direct.evidence, bt) },
          { claim: derived, classification: cls(derived.id, "CURRENT", "EXPLICIT", "INDIRECT"), grounding: groundEvidence(derived.evidence, bt) },
        ],
        emptyCRM(),
        bt,
      );
      expect(fields.budget.action).toBe("ASK");
    });
  });

  it("claims for one field never affect another field", () => {
    const b = claim("budget", usd(75000), [ev(t, "t2")]);
    expect(reconcileField("decisionMaker", [{ claim: b, classification: null, grounding: groundEvidence(b.evidence, t), decision: { claimId: b.id, field: "budget", action: "ACT", reasons: ["SUPPORTED"] } }], t).decision.action).toBe("ABSTAIN");
  });
});
