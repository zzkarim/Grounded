/** Small builders for deterministic tests. Generic phrasing, not copied from benchmark cases. */
import type {
  BudgetValue,
  CandidateClaim,
  Certainty,
  ClaimStatus,
  CRMState,
  DecisionMakerValue,
  Evidence,
  EvidenceSufficiency,
  MeetingValue,
  SemanticClassification,
  Transcript,
} from "@/core/schemas";
import type { Transport, TransportResponse } from "@/llm/client";
import type { ModelConfig } from "@/llm/config";

export const REP = "rita";
export const CUST = "carl";

/** turns: [speaker, text][] where speaker is "rep" | "cust". Turn ids are t1, t2, ... */
export function transcript(turns: ["rep" | "cust", string][], occurredAt = "2026-03-09"): Transcript {
  return {
    id: "test-transcript",
    occurredAt,
    participants: [
      { id: REP, name: "Rita Rep", side: "rep", title: "AE" },
      { id: CUST, name: "Carl Customer", side: "customer", title: "Director" },
    ],
    turns: turns.map(([who, text], i) => ({ id: `t${i + 1}`, speakerId: who === "rep" ? REP : CUST, text })),
  };
}

/** Evidence for the WHOLE text of a turn, with the correct speaker. */
export function ev(t: Transcript, turnId: string, quote?: string): Evidence {
  const turn = t.turns.find((x) => x.id === turnId)!;
  return { turnId, speakerId: turn.speakerId, quote: quote ?? turn.text };
}

export const emptyCRM = (over: Partial<CRMState> = {}): CRMState => ({
  company: "Acme",
  budget: null,
  decisionMaker: null,
  nextMeeting: null,
  ...over,
});

export const usd = (amount: number): BudgetValue => ({ kind: "exact", amount, currency: "USD" });
export const people = (...ps: [string | null, string | null][]): DecisionMakerValue => ({
  people: ps.map(([name, role]) => ({ name, role })),
});
export const meeting = (date: string | null, time: string | null = null, asStated = "as stated"): MeetingValue => ({
  date,
  time,
  timezone: null,
  asStated,
});

let n = 0;
export function claim<F extends CandidateClaim["field"]>(
  field: F,
  value: Extract<CandidateClaim, { field: F }>["value"],
  evidence: Evidence[],
  id = `c${++n}`,
): CandidateClaim {
  return { id, field, value, evidence } as CandidateClaim;
}

export function cls(
  claimId: string,
  status: ClaimStatus,
  certainty: Certainty,
  sufficiency: EvidenceSufficiency,
): SemanticClassification {
  return { claimId, status, certainty, sufficiency, explanation: "test" };
}

export const TEST_CONFIG: ModelConfig = { model: "test-model", effort: "medium", maxTokens: 1000 };

/** A fake transport that returns queued responses in order and records what it was sent. */
export function scriptedTransport(responses: (Partial<TransportResponse> | Error)[]) {
  const sent: { system: string; user: string }[] = [];
  const transport: Transport = async ({ system, user }) => {
    sent.push({ system, user });
    const next = responses.shift();
    if (next === undefined) throw new Error("scriptedTransport: no more responses");
    if (next instanceof Error) throw next;
    return { text: null, stopReason: "end_turn", responseModel: "test-model-reported", usage: { inputTokens: 1, outputTokens: 1 }, ...next };
  };
  return { transport, sent };
}

export const json = (x: unknown): Partial<TransportResponse> => ({ text: JSON.stringify(x) });
