/**
 * Grounded v3 structured meeting-value validation (src/core/validation.ts, DECISIONS.md D21).
 * All examples are generic; none are taken from benchmark transcripts.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { groundEvidence } from "@/core/grounding";
import { decideCase } from "@/core/policy";
import { CandidateClaim, Certainty, ClaimStatus, EvidenceSufficiency, MeetingValue, ValueValidation } from "@/core/schemas";
import { businessHour, extractTemporalFacts, validateClaim, validateMeeting } from "@/core/validation";
import { loadSplit } from "@/eval/benchmark";
import { createClient } from "@/llm/client";
import { grounded } from "@/systems/grounded";
import { claim, cls, emptyCRM, ev, json, meeting, scriptedTransport, TEST_CONFIG, transcript, usd } from "./helpers";

const ev1 = (...quotes: string[]) => quotes.map((quote, i) => ({ turnId: `t${i + 1}`, speakerId: "carl", quote }));
const check = (call: string, quotes: string[], date: string | null, time: string | null) =>
  validateMeeting(meeting(date, time, "as stated"), ev1(...quotes), call);
const rules = (r: ReturnType<typeof check>) => r.validation.issues.map((i) => i.rule);

// Calendar used below (all verified with Date): 2026-03-02 Mon, 03-05 Thu, 03-09 Mon, 03-10 Tue,
// 03-11 Wed, 03-12 Thu, 03-13 Fri, 03-16 Mon, 03-19 Thu, 03-20 Fri, 04-13 Mon, 04-17 Fri, 05-27 Wed, 06-24 Wed.

describe("PASS: faithful normalizations are verified and unchanged", () => {
  it.each([
    ["Thursday at 2 → Thursday 14:00", "2026-03-09", ["Thursday at 2 works for us."], "2026-03-12", "14:00"],
    ["weekday + day of month, correct", "2026-03-16", ["Friday the 20th at 2 is good."], "2026-03-20", "14:00"],
    ["bare ordinal into next month", "2026-05-27", ["The 24th works."], "2026-06-24", null],
    ["date only, time null", "2026-03-09", ["Wednesday works, send whatever slot you like."], "2026-03-11", null],
    ["explicit pm", "2026-03-09", ["Tuesday at 4 p.m. then."], "2026-03-10", "16:00"],
    ["explicit am", "2026-03-09", ["Tuesday, 8am sharp."], "2026-03-10", "08:00"],
    ["business hours: morning hour", "2026-03-09", ["Friday at 9 works."], "2026-03-13", "09:00"],
    ["business hours: afternoon hour", "2026-03-09", ["Friday at 1 then."], "2026-03-13", "13:00"],
    ["hour and minutes", "2026-03-09", ["Thursday at 10:30?", "Sure, 10:30 Thursday."], "2026-03-12", "10:30"],
    ["number word + a.m.", "2026-03-09", ["Thursday, ten a.m. my time."], "2026-03-12", "10:00"],
    ["noon", "2026-03-09", ["Friday at noon works."], "2026-03-13", "12:00"],
    ["month + day", "2026-04-13", ["How about April 17 at 3?"], "2026-04-17", "15:00"],
    ["next <weekday> disambiguated by a day of month", "2026-03-09", ["Next Thursday, the 19th, at 11."], "2026-03-19", "11:00"],
    ["several weekdays mentioned; the chosen one is among them", "2026-03-09", ["Tuesday is out. Wednesday at 2 instead."], "2026-03-11", "14:00"],
    ["tomorrow", "2026-03-09", ["Tomorrow at 3 works."], "2026-03-10", "15:00"],
    ["a rejected alternative's day doesn't constrain the chosen date", "2026-03-02", ["Monday the 9th is out for me.", "Thursday at 2 then?"], "2026-03-05", "14:00"],
    ["weekday + month + day, all consistent", "2026-04-13", ["Friday, April 17th at 3."], "2026-04-17", "15:00"],
  ])("%s", (_, call, quotes, date, time) => {
    const r = check(call, quotes, date, time);
    expect(r.validation).toEqual({ verified: true, issues: [], originalValue: null });
    expect(r.value).toMatchObject({ date, time });
  });

  it("vague meetings with no date or time have nothing to verify", () => {
    expect(check("2026-03-09", ["Let's talk sometime next week."], null, null).validation.verified).toBe(true);
  });
});

describe("FAIL: unverifiable components are nulled, never corrected", () => {
  it("weekday + day of month that contradict: neither reading can be verified", () => {
    // 2026-03-10 is a Tuesday, so "Monday the 10th" is self-contradictory.
    const asDay = check("2026-03-02", ["Monday the 10th at 3 works."], "2026-03-10", "15:00");
    expect(rules(asDay)).toEqual(["DATE_WEEKDAY_MISMATCH"]);
    expect(asDay.value).toMatchObject({ date: null, time: "15:00" }); // time still supported, kept
    expect(asDay.validation.originalValue).toMatchObject({ date: "2026-03-10", time: "15:00" });
    const asWeekday = check("2026-03-02", ["Monday the 10th at 3 works."], "2026-03-09", "15:00");
    expect(rules(asWeekday)).toEqual(["DATE_DAY_MISMATCH"]);
    expect(asWeekday.value.date).toBeNull();
  });
  it("explicit day-of-month mismatch", () => {
    expect(rules(check("2026-05-27", ["The 24th works."], "2026-06-25", null))).toEqual(["DATE_DAY_MISMATCH"]);
  });
  it("a value must match one mention completely, not borrow parts from different mentions", () => {
    // Mentions: {Monday, 9th} and {Thursday}. Thursday the 9th? There's no such mention, and 2026-04-09 is a Thursday.
    expect(check("2026-04-02", ["Monday the 9th? Or Thursday?"], "2026-04-09", null).validation.verified).toBe(true); // matches {Thursday}
    expect(rules(check("2026-03-02", ["Monday the 9th? Or Thursday?"], "2026-03-11", null))).toEqual(["DATE_WEEKDAY_MISMATCH"]); // a Wednesday
  });
  it("explicit month mismatch", () => {
    expect(rules(check("2026-04-13", ["How about April 17?"], "2026-05-17", null))).toEqual(["DATE_MONTH_MISMATCH"]);
  });
  it('unresolved "next <weekday>" normalized to a concrete date', () => {
    const r = check("2026-03-09", ["Next Thursday at 11 works."], "2026-03-19", "11:00");
    expect(rules(r)).toEqual(["DATE_AMBIGUOUS_NEXT_WEEKDAY"]);
    expect(r.value).toMatchObject({ date: null, time: "11:00" });
  });
  it("past or same-day date", () => {
    expect(rules(check("2026-03-09", ["Thursday at 2."], "2026-03-05", "14:00"))).toEqual(["DATE_NOT_FUTURE"]);
    expect(rules(check("2026-03-09", ["Monday at 2."], "2026-03-09", "14:00"))).toEqual(["DATE_NOT_FUTURE"]);
  });
  it("date with no temporal anchor in the evidence", () => {
    expect(rules(check("2026-03-09", ["Sure, let's do that then."], "2026-03-12", null))).toEqual(["DATE_UNSUPPORTED"]);
  });
  it("time not present in the evidence", () => {
    const r = check("2026-03-09", ["Thursday works for me."], "2026-03-12", "14:00");
    expect(rules(r)).toEqual(["TIME_UNSUPPORTED"]);
    expect(r.value).toMatchObject({ date: "2026-03-12", time: null }); // date verified, kept
  });
  it('15:00 from "at 2", and 02:00 against the business-hours reading', () => {
    expect(rules(check("2026-03-09", ["Thursday at 2."], "2026-03-12", "15:00"))).toEqual(["TIME_UNSUPPORTED"]);
    expect(rules(check("2026-03-09", ["Thursday at 2."], "2026-03-12", "02:00"))).toEqual(["TIME_UNSUPPORTED"]);
  });
  it("explicit am contradicted by a pm time, and minutes that differ", () => {
    expect(rules(check("2026-03-09", ["Thursday, 9 am."], "2026-03-12", "21:00"))).toEqual(["TIME_UNSUPPORTED"]);
    expect(rules(check("2026-03-09", ["Thursday at 10:30."], "2026-03-12", "10:00"))).toEqual(["TIME_UNSUPPORTED"]);
  });
  it("prose numbers are not times", () => {
    expect(rules(check("2026-03-09", ["Thursday, we have two or three people joining."], "2026-03-12", "14:00"))).toEqual(["TIME_UNSUPPORTED"]);
    expect(rules(check("2026-03-09", ["Thursday, about 3 weeks after launch."], "2026-03-12", "15:00"))).toEqual(["TIME_UNSUPPORTED"]);
    expect(rules(check("2026-03-09", ["Thursday, we budgeted $5 per seat."], "2026-03-12", "17:00"))).toEqual(["TIME_UNSUPPORTED"]);
  });
  it("date numbers are not mistaken for hours", () => {
    expect(extractTemporalFacts("Friday the 9th works").times.size).toBe(0);
    expect(extractTemporalFacts("April 3 then").times.size).toBe(0);
  });
});

describe("helpers", () => {
  it("business-hours reading of a bare hour", () => {
    expect([1, 2, 6, 7, 9, 11, 12].map(businessHour)).toEqual([13, 14, 18, 7, 9, 11, 12]);
  });
  it("non-meeting claims pass through untouched", () => {
    const t = transcript([["cust", "We have $50K approved."]]);
    const c = claim("budget", usd(50000), [ev(t, "t1")]);
    expect(validateClaim(c, t)).toEqual({ claim: c, validation: { verified: true, issues: [], originalValue: null } });
  });
});

// ───────── Monotonicity: validation can only remove specificity and reduce autonomy ─────────

describe("MONOTONIC: validation never adds information or autonomy", () => {
  const call = "2026-03-02"; // Monday; 2026-03-10 is a Tuesday
  const t = transcript([["rep", "Monday the 10th at 3, or Thursday at 2?"], ["cust", "Thursday at 2 works. Monday the 10th at 3 is also fine."]], call);
  const values: MeetingValue[] = [
    meeting("2026-03-05", "14:00"), // valid (Thursday)
    meeting("2026-03-10", "15:00"), // contradicts "Monday the 10th"
    meeting("2026-03-05", "16:00"), // unsupported time
    meeting("2026-03-01", "14:00"), // past
    meeting(null, "14:00"),
    meeting("2026-03-05", null),
    meeting(null, null),
  ];
  const statuses: ClaimStatus[] = ["CURRENT", "NEGATED"];
  const certainties: Certainty[] = ["EXPLICIT", "TENTATIVE"];
  const sufficiencies: EvidenceSufficiency[] = ["DIRECT", "INDIRECT", "NONE"];
  const verifiedStub: ValueValidation = { verified: true, issues: [], originalValue: null };

  it("value: every component stays equal or becomes null; other fields unchanged", () => {
    for (const v of values) {
      const r = validateMeeting(v, [ev(t, "t1"), ev(t, "t2")], call);
      expect([v.date, null]).toContain(r.value.date);
      expect([v.time, null]).toContain(r.value.time);
      expect(r.value.timezone).toBe(v.timezone);
      expect(r.value.asStated).toBe(v.asStated);
      expect(r.validation.verified).toBe(r.value.date === v.date && r.value.time === v.time);
    }
  });

  it("decision: v3 ACT ⇒ unvalidated ACT; unvalidated ABSTAIN ⇒ v3 ABSTAIN; never ACT when unverified", () => {
    let n = 0;
    for (const v of values)
      for (const status of statuses)
        for (const certainty of certainties)
          for (const sufficiency of sufficiencies)
            for (const grounded of [true, false])
              for (const existing of [null, meeting("2026-03-05", "14:00"), meeting("2026-03-12", "09:00")]) {
                const evidence = grounded ? [ev(t, "t1"), ev(t, "t2")] : [{ ...ev(t, "t2"), quote: "never said" }];
                const c = claim("nextMeeting", v, evidence, "m");
                const base = { claim: c, classification: cls("m", status, certainty, sufficiency), grounding: groundEvidence(evidence, t) };
                const crm = emptyCRM({ nextMeeting: existing });
                const before = decideCase([{ ...base, validation: verifiedStub }], crm, t); // pre-v3 behaviour
                const after = decideCase([base], crm, t); // decideCase validates
                const a = before.fields.nextMeeting.action;
                const b = after.fields.nextMeeting.action;
                const ctx = JSON.stringify({ v, status, certainty, sufficiency, grounded, existing });
                if (b === "ACT") expect(a, ctx).toBe("ACT");
                if (a === "ABSTAIN") expect(b, ctx).toBe("ABSTAIN");
                if (!after.records[0].validation.verified) {
                  expect(b, ctx).not.toBe("ACT");
                  if (b === "ASK") expect(after.records[0].decision.reasons, ctx).toContain("VALUE_UNVERIFIED");
                }
                n++;
              }
    expect(n).toBe(values.length * 2 * 2 * 3 * 2 * 3);
  });
});

// ───────── Gold labels and production-code hygiene ─────────

describe("frozen gold meeting values all pass validation", () => {
  const cases = [...loadSplit("dev").cases, ...loadSplit("example").cases];
  const gold = cases.filter((c) => c.expected.nextMeeting.value !== null);
  it(`${gold.length} gold meeting values (every action) verify against their gold evidence`, () => {
    expect(gold.length).toBeGreaterThan(20);
    for (const c of gold) {
      const g = c.expected.nextMeeting;
      const r = validateMeeting(g.value!, g.evidence, c.transcript.occurredAt);
      expect(r.validation.issues, `${c.id}`).toEqual([]);
    }
  });
});

describe("validator source contains nothing benchmark-specific", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "src/core/validation.ts"), "utf8").toLowerCase();
  it("no case ids, dates or benchmark-only literals", () => {
    expect(src).not.toMatch(/dev-gen|-ex-\d|\b20\d\d-\d\d-\d\d\b|22nd/);
  });
  it("no 5-word phrase from any benchmark transcript", () => {
    const words = src.replace(/[^a-z0-9' ]/g, " ").split(/\s+/).join(" ");
    for (const c of [...loadSplit("dev").cases, ...loadSplit("example").cases, ...loadSplit("test").cases])
      for (const turn of c.transcript.turns) {
        const w = turn.text.toLowerCase().replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter(Boolean);
        for (let i = 0; i + 5 <= w.length; i++) expect(words.includes(w.slice(i, i + 5).join(" ")), `${c.id}: ${w.slice(i, i + 5).join(" ")}`).toBe(false);
      }
  });
});

// ───────── Pipeline integration (scripted model, no API) ─────────

describe("Grounded v3 pipeline", () => {
  const t = transcript([["rep", "Can we meet Monday the 10th at 3?"], ["cust", "Monday the 10th at 3 works. Send the invite."]], "2026-03-02");
  const input = { caseId: "unit", crm: emptyCRM(), transcript: t };
  const run = async (date: string) => {
    const s = scriptedTransport([
      json({ candidates: [{ field: "nextMeeting", value: { date, time: "15:00", timezone: null, asStated: "Monday the 10th at 3" }, evidence: [ev(t, "t1"), ev(t, "t2")] }] }),
      json({ classifications: [{ claimId: "c1", status: "CURRENT", certainty: "EXPLICIT", sufficiency: "DIRECT", explanation: "" }] }),
    ]);
    return { out: await grounded.run(input, createClient(s.transport, TEST_CONFIG)), sent: s.sent };
  };

  it("a contradictory normalized date cannot ACT, even with perfect semantic labels", async () => {
    const { out, sent } = await run("2026-03-10"); // a Tuesday
    expect(out.fields.nextMeeting).toMatchObject({ action: "ASK", value: { date: null, time: "15:00" } });
    expect(out.fields.nextMeeting.reasons).toEqual(expect.arrayContaining(["UNDERSPECIFIED_VALUE", "VALUE_UNVERIFIED"]));
    const rec = (out.trace as { records: { validation: ValueValidation; claim: CandidateClaim }[] }).records[0];
    expect(rec.validation.originalValue).toMatchObject({ date: "2026-03-10" }); // the model's value is preserved
    expect(sent[1].user).toContain('"date": null'); // classification sees the validated value
  });

  it("the weekday reading (the 9th) is also unverifiable: a self-contradictory mention matches no date", async () => {
    const { out } = await run("2026-03-09"); // a Monday, but the 9th, not the 10th
    expect(out.fields.nextMeeting).toMatchObject({ action: "ASK", value: { date: null } });
  });

  it("a faithful date passes through and can ACT", async () => {
    const t2 = transcript([["rep", "Can we meet Tuesday the 10th at 3?"], ["cust", "Tuesday the 10th at 3 works. Send the invite."]], "2026-03-02");
    const s = scriptedTransport([
      json({ candidates: [{ field: "nextMeeting", value: { date: "2026-03-10", time: "15:00", timezone: null, asStated: "Tuesday the 10th at 3" }, evidence: [ev(t2, "t1"), ev(t2, "t2")] }] }),
      json({ classifications: [{ claimId: "c1", status: "CURRENT", certainty: "EXPLICIT", sufficiency: "DIRECT", explanation: "" }] }),
    ]);
    const ok = await grounded.run({ caseId: "unit", crm: emptyCRM(), transcript: t2 }, createClient(s.transport, TEST_CONFIG));
    expect(ok.fields.nextMeeting).toMatchObject({ action: "ACT", value: { date: "2026-03-10", time: "15:00" }, reasons: ["SUPPORTED"] });
    const rec = (ok.trace as { records: { validation: ValueValidation }[] }).records[0];
    expect(rec.validation).toEqual({ verified: true, issues: [], originalValue: null });
  });
});
