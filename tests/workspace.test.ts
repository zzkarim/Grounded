/**
 * Workspace view model and mock CRM/review state, built from the REAL selected demo recordings
 * replayed through the frozen pipeline. No model calls.
 */
import { describe, expect, it } from "vitest";
import { CRM_FIELDS } from "@/core/schemas";
import {
  canApproveDirectly,
  demoReducer,
  initialState,
  isApprovableValue,
  parseStoredState,
  reviewId,
  type DemoState,
} from "@/product/demoState";
import { ACTION, formatMeeting, formatTimezone, presentAction } from "@/product/present";
import { loadWorkspaceData } from "@/product/workspaceData";

const corrigan = await loadWorkspaceData("corrigan");
const meridale = await loadWorkspaceData("meridale");
const ardent = await loadWorkspaceData("ardent");
const field = (d: typeof corrigan, f: string) => d.view.fields.find((x) => x.field === f)!;

describe("all selected recordings replay verified", () => {
  it.each([corrigan, meridale, ardent].map((d) => [d.view.scenario.id, d] as const))("%s", (_, d) => {
    expect(d.view.provenance.problems).toEqual([]);
    expect(d.view.provenance.ok).toBe(true);
    expect(d.view.provenance).toMatchObject({ systemVersion: "3", policyConfig: "default-v3", validatorVersion: "meeting-v1", model: "claude-sonnet-5-5" });
    expect(d.view.fields.map((f) => f.field)).toEqual(["budget", "decisionMaker", "nextMeeting"]);
  });
});

describe("Corrigan: actual recording, not the design intent", () => {
  it("budget: $100,000 Needs review, CONDITIONAL + INDIRECT (no '~' qualifier)", () => {
    const b = field(corrigan, "budget");
    expect(b.presentation.label).toBe("Needs review");
    expect(b.valueText).toBe("$100,000");
    expect(b.reasons.map((r) => r.code)).toEqual(["CONDITIONAL", "INDIRECT_SUPPORT"]);
    expect(b.qualifiers).toEqual(["Conditional", "Related, not conclusive"]);
  });
  it("decision maker: Rosalind Achebe (COO) Written", () => {
    const d = field(corrigan, "decisionMaker");
    expect(d.presentation.label).toBe("Written");
    expect(d.valueText).toBe("Rosalind Achebe (COO)");
    expect(d.primaryQuote?.quote).toBe("That would be Rosalind Achebe, our COO. She signs every vendor contract at this size.");
  });
  it("next meeting: Thu, Nov 12 · 2:00 PM ET Written (IANA timezone shown short)", () => {
    const m = field(corrigan, "nextMeeting");
    expect(m.presentation.label).toBe("Written");
    expect(m.valueText).toBe("Thu, Nov 12 · 2:00 PM ET");
    expect((m.value as { timezone: string }).timezone).toBe("America/New_York"); // stored value untouched
  });
  it("the $80K vendor spend is heard, not written, with its exact quote", () => {
    const heard = corrigan.view.ledger.heard;
    expect(heard.map((c) => c.valueText)).toEqual(["$80,000"]);
    expect(heard[0].quotes[0].quote).toBe("We pay about $80K a year for the routing tool we have today");
    expect(heard[0].final.reasons.map((r) => r.code)).toEqual(["NO_SUPPORT"]);
  });
});

describe("Meridale", () => {
  it("budget and decision maker are Already current", () => {
    expect(field(meridale, "budget")).toMatchObject({ action: "NO_OP", valueText: "$250,000" });
    expect(field(meridale, "decisionMaker")).toMatchObject({ action: "NO_OP", valueText: "Lucian" });
  });
  it("Friday at 10 needs review only because it conflicts with the CRM", () => {
    const m = field(meridale, "nextMeeting");
    expect(m).toMatchObject({ action: "ASK", conflict: true, valueText: "Fri, Nov 20 · 10:00 AM" });
    expect(m.reasons.map((r) => r.code)).toEqual(["CONFLICTS_WITH_EXISTING"]);
    expect(m.existing?.text).toBe("Wed, Nov 18 · 10:00 AM ET");
    expect(m.primary.explanation).toBe("Would overwrite an existing CRM value. Grounded requires a person.");
  });
  it("Matthias is heard as a supporting stakeholder; reconciliation (not policy) set him aside", () => {
    const m = meridale.view.claims.find((c) => c.valueText.startsWith("Matthias"))!;
    expect(m.group).toBe("heard");
    expect(m.policy.action).toBe("ASK"); // frozen decideClaim alone: INDIRECT → ASK
    expect(m.final).toMatchObject({ action: "ABSTAIN", changedByReconciliation: true });
    expect(m.final.reasons.map((r) => r.code)).toEqual(["OUTRANKED_BY_DIRECT"]);
  });
});

describe("Ardent: the validator demonstration", () => {
  it("budget $60,000 Written; decision maker Not written", () => {
    expect(field(ardent, "budget")).toMatchObject({ action: "ACT", valueText: "$60,000" });
    expect(field(ardent, "decisionMaker")).toMatchObject({ action: "ABSTAIN", claimIds: [] });
    expect(field(ardent, "decisionMaker").primary.code).toBe("NO_CANDIDATE");
  });
  it("meeting: model's date shown, then removed by meeting-v1; Needs review", () => {
    const m = field(ardent, "nextMeeting");
    expect(m.action).toBe("ASK");
    expect(m.valueText).toBe("Date not confirmed · 3:30 PM");
    expect(m.validatorChange).toMatchObject({ extractedText: "Thu, Nov 12 · 3:30 PM", keptText: "Date not confirmed · 3:30 PM", removed: ["date"] });
    expect(m.validatorChange!.issues.map((i) => i.label)).toEqual(["The proposed date was not after the call date"]);
    expect(m.primary.code).toBe("VALUE_UNVERIFIED");
  });
  it("the $25,000 from last year is heard, not written", () => {
    expect(ardent.view.ledger.heard.map((c) => c.valueText)).toEqual(["$25,000"]);
  });
  it("pipeline strip reports what validation removed (it never corrects)", () => {
    expect(ardent.view.stages.find((s) => s.id === "validate")).toMatchObject({ metric: "1 date removed", attention: true });
  });
});

describe("ledger comes only from trace records", () => {
  it.each([corrigan, meridale, ardent].map((d) => [d.view.scenario.id, d] as const))("%s", (_, d) => {
    const all = [...d.view.ledger.decision, ...d.view.ledger.heard].map((c) => c.claimId).sort();
    expect(all).toEqual(d.view.claims.map((c) => c.claimId).sort());
    for (const c of d.view.claims) for (const q of c.quotes) expect(d.view.turns.find((t) => t.id === q.turnId)!.text).toContain(q.quote);
  });
});

describe("presentation", () => {
  it("action labels", () => {
    expect([ACTION.ACT.label, ACTION.ASK.label, ACTION.ABSTAIN.label, ACTION.NO_OP.label]).toEqual(["Written", "Needs review", "Not written", "Already current"]);
    expect(presentAction({ action: "ABSTAIN", reasons: ["SYSTEM_ERROR"] }).label).toBe("Analysis failed");
  });
  it("timezones", () => {
    expect(formatTimezone("America/New_York")).toBe("ET");
    expect(formatTimezone("Eastern")).toBe("ET");
    expect(formatTimezone("America/Los_Angeles")).toBe("PT");
    expect(formatTimezone("Europe/Berlin")).toBe("Berlin time");
    expect(formatTimezone("CET")).toBe("CET");
    expect(formatMeeting({ date: "2026-11-12", time: "14:00", timezone: "America/New_York", asStated: "x" })).toBe("Thu, Nov 12 · 2:00 PM ET");
  });
});

// ───────────── Mock CRM + review ─────────────

const seeds = corrigan.seeds;
const fresh = initialState(seeds);
const acct = (s: DemoState, id: string) => s.accounts[id];

describe("mock CRM on load", () => {
  it("ACT writes the Grounded value with Grounded provenance", () => {
    expect(acct(fresh, "corrigan").crm.decisionMaker).toMatchObject({ provenance: "grounded", value: { people: [{ name: "Rosalind Achebe", role: "COO" }] } });
    expect(acct(fresh, "ardent").crm.budget).toMatchObject({ provenance: "grounded", value: { amount: 60000 } });
  });
  it("NO_OP leaves the value unchanged and marks it confirmed", () => {
    const b = acct(fresh, "meridale").crm.budget;
    expect(b).toMatchObject({ provenance: "initial", confirmed: true, value: { amount: 250000 } });
  });
  it("ASK leaves the CRM unchanged and creates a pending review", () => {
    const m = acct(fresh, "meridale").crm.nextMeeting;
    expect(m).toMatchObject({ provenance: "initial", value: { date: "2026-11-18" }, pendingReviewId: "meridale:nextMeeting" });
    expect(acct(fresh, "corrigan").crm.budget.value).toBeNull();
    expect(acct(fresh, "corrigan").reviews.map((r) => r.id)).toEqual(["corrigan:budget"]);
  });
  it("ABSTAIN leaves the CRM unchanged", () => {
    expect(acct(fresh, "ardent").crm.decisionMaker).toMatchObject({ value: null, provenance: "initial", confirmed: false, pendingReviewId: null });
  });
  it("seeds cover all three accounts", () => {
    expect(Object.keys(fresh.accounts).sort()).toEqual(["ardent", "corrigan", "meridale"]);
    for (const id of Object.keys(fresh.accounts)) expect(Object.keys(fresh.accounts[id].crm).sort()).toEqual([...CRM_FIELDS].sort());
  });
});

describe("review actions", () => {
  it("approval writes with reviewer provenance, not Grounded", () => {
    const s = demoReducer(fresh, { type: "approve", id: reviewId("corrigan", "budget") });
    expect(acct(s, "corrigan").crm.budget).toMatchObject({ provenance: "reviewer", value: { amount: 100000 }, pendingReviewId: null, edited: false });
    expect(acct(s, "corrigan").reviews[0].status).toBe("approved");
  });
  it("a conflicting meeting is replaced only after approval", () => {
    const s = demoReducer(fresh, { type: "approve", id: "meridale:nextMeeting" });
    expect(acct(s, "meridale").crm.nextMeeting).toMatchObject({ provenance: "reviewer", value: { date: "2026-11-20", time: "10:00" } });
  });
  it("reject leaves the CRM unchanged", () => {
    const s = demoReducer(fresh, { type: "reject", id: "meridale:nextMeeting" });
    expect(acct(s, "meridale").crm.nextMeeting).toMatchObject({ provenance: "initial", value: { date: "2026-11-18" }, pendingReviewId: null });
    expect(acct(s, "meridale").reviews[0].status).toBe("rejected");
  });
  it("an incomplete meeting (no date) cannot be approved directly", () => {
    const item = acct(fresh, "ardent").reviews[0];
    expect(item).toMatchObject({ field: "nextMeeting", needsCompletion: true });
    expect(canApproveDirectly(item)).toBe(false);
    expect(demoReducer(fresh, { type: "approve", id: item.id })).toBe(fresh);
  });
  it("Edit & approve requires a valid date, then records an edited reviewer value", () => {
    const id = "ardent:nextMeeting";
    const noDate = { date: null, time: "15:30", timezone: null, asStated: "today at 3:30" };
    expect(isApprovableValue("nextMeeting", noDate)).toBe(false);
    expect(demoReducer(fresh, { type: "approveEdited", id, value: noDate })).toBe(fresh);
    const s = demoReducer(fresh, { type: "approveEdited", id, value: { ...noDate, date: "2026-11-12" } });
    expect(acct(s, "ardent").crm.nextMeeting).toMatchObject({ provenance: "reviewer", edited: true, value: { date: "2026-11-12", time: "15:30" } });
  });
  it("a resolved item can't be resolved again", () => {
    const s = demoReducer(fresh, { type: "reject", id: "corrigan:budget" });
    expect(demoReducer(s, { type: "approve", id: "corrigan:budget" })).toBe(s);
  });
  it("reset restores every account", () => {
    let s = demoReducer(fresh, { type: "approve", id: "corrigan:budget" });
    s = demoReducer(s, { type: "reject", id: "meridale:nextMeeting" });
    expect(demoReducer(s, { type: "reset", seeds })).toEqual(fresh);
  });
});

describe("stored state", () => {
  it("round-trips valid state", () => {
    const s = demoReducer(fresh, { type: "approve", id: "corrigan:budget" });
    expect(parseStoredState(JSON.stringify(s), fresh)).toEqual(s);
  });
  it("rejects missing, malformed, stale or mismatched state", () => {
    expect(parseStoredState(null, fresh)).toBeNull();
    expect(parseStoredState("{", fresh)).toBeNull();
    expect(parseStoredState(JSON.stringify({ ...fresh, version: 2 }), fresh)).toBeNull();
    const stale = JSON.parse(JSON.stringify(fresh));
    stale.accounts.corrigan.reviews[0].proposed = { kind: "exact", amount: 1, currency: "USD" };
    expect(parseStoredState(JSON.stringify(stale), fresh)).toBeNull();
  });
});
