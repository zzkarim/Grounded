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
   If approved components of this purchase are stated and no total is spoken, the budget is their sum.
   An individual component is not a competing value for the total budget.

2. decisionMaker: the person(s) or role(s) with final approval / sign-off authority for this purchase.
   Final authority is different from leading the evaluation, making a recommendation, owning the budget,
   or giving technical, security, or legal approval.
   Value: {"people":[{"name":<string|null>,"role":<string|null>}]}. Each person needs a name, a role (job title), or both.
   A first name alone is a valid name. List several people only when all of them are required to sign (joint approval).

3. nextMeeting: a mutually agreed, future, synchronous meeting (call/video/onsite) between the seller and the customer.
   There must be either an agreement or intention to meet (even if the timing is still incomplete),
   or a specific proposed meeting time that is still pending.
   Not meetings: availability constraints, promises to look for or ask about times, the customer's internal meetings,
   deadlines, and asynchronous deliverables.
   Value: {"date":"YYYY-MM-DD"|null,"time":"HH:MM"|null,"timezone":<string|null>,"asStated":"<timing phrase as spoken>"}.
   Date: resolve against the call date.
   - A weekday name means the first such day after the call date.
   - A bare day of the month ("the 9th") is that day in the current month if it is still in the future, otherwise next month.
   - "Next <weekday>" is ambiguous unless the conversation makes it clear: use date null.
   - If a stated weekday and day of the month contradict each other, use date null.
   - Use date null whenever no specific day can be determined unambiguously.
   Time: 24-hour. In business scheduling, an hour said without AM/PM takes its ordinary business-hours reading
   ("at 3" → 15:00, "at 9" → 09:00). Use null if no time is stated or it is genuinely unclear.
   A meeting with a specific date and no time is still a valid value. Timezone is optional (null if not stated).`;

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
