/**
 * Shared by ALL systems (both baselines and Grounded), so every system gets the same task
 * definition (SPEC.md §7). Contains no examples or phrases taken from benchmark cases.
 */
import { CRMField, CRMState, FieldDecision, PolicyReason, SystemOutput, VALUE_SCHEMAS } from "@/core/schemas";
import { valuesEqual } from "@/core/values";
import type { LLMCallRecord } from "@/core/schemas";

export const FIELD_DEFINITIONS = `CRM fields (only these three exist):

1. budget: the money the customer organization has currently approved or committed for this purchase.
   Not budget: the seller's price or quote, competitor prices, current vendor spend, spending-approval thresholds,
   or general company/department budgets not stated to fund this purchase.
   Value: {"kind":"exact","amount":<number>,"currency":"<ISO code>"} or {"kind":"range","min":<n>,"max":<n>,"currency":"<ISO code>"}.
   Use full numbers (100K → 100000). Never turn a range into a midpoint. "$" means USD; if no currency is mentioned, use USD.

2. decisionMaker: the person(s) or role(s) with final approval / sign-off authority for this purchase.
   Value: {"people":[{"name":<string|null>,"role":<string|null>}]}. Each person needs a name, a role (job title), or both.
   List several people only when all of them are required to sign (joint approval).

3. nextMeeting: a mutually agreed, future, synchronous meeting (call/video/onsite) between the seller and the customer.
   Value: {"date":"YYYY-MM-DD"|null,"time":"HH:MM"|null,"timezone":<string|null>,"asStated":"<timing phrase as spoken>"}.
   Resolve relative dates against the call date; a weekday name means the first such day after the call date.
   Use date null if no specific day can be determined unambiguously; time is 24-hour, null if not stated or unclear.`;

export const NOT_PROPOSED: FieldDecision = { action: "ABSTAIN", value: null, reasons: ["NO_CANDIDATE"], claimIds: [] };

export function errorOutput(caseId: string, system: string, error: string, llmCalls: LLMCallRecord[], trace: unknown = null): SystemOutput {
  const failed: FieldDecision = { action: "ABSTAIN", value: null, reasons: ["SYSTEM_ERROR"], claimIds: [] };
  return {
    caseId,
    system,
    fields: { budget: failed, decisionMaker: failed, nextMeeting: failed },
    trace,
    llmCalls,
    error,
  };
}

/**
 * Baseline proposal → field decision. A proposal identical to the existing CRM value is recorded as
 * NO_OP for every system, since writing the same value changes nothing (DECISIONS.md D3).
 */
export function baselineDecision(
  field: CRMField,
  crm: CRMState,
  value: unknown,
  action: "ACT" | "ASK",
  reason: PolicyReason,
): FieldDecision {
  const existing = crm[field];
  const typed = VALUE_SCHEMAS[field].parse(value);
  if (existing !== null && valuesEqual(field, typed as never, existing as never)) {
    return { action: "NO_OP", value: typed, reasons: ["MATCHES_EXISTING"], claimIds: [] };
  }
  return { action, value: typed, reasons: [reason], claimIds: [] };
}
