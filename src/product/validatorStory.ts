/**
 * A plain-language account of one meeting-v1 intervention, built from the trace: what the model
 * extracted, which deterministic check failed and why, what Grounded kept and what it REMOVED.
 * Validation never corrects or adds a value, so this has no "corrected to" field by design.
 * Pure and client-safe.
 */
import type { MeetingValue, ValueValidation } from "@/core/schemas";
import { formatDate, formatMeeting, formatTime, formatTimezone } from "./present";

/** The requirement each rule enforces, stated generally (LABELING_GUIDE §2.3). */
export const RULE_REQUIREMENT: Record<ValueValidation["issues"][number]["rule"], string> = {
  DATE_NOT_FUTURE: "Meeting date must be after the call date.",
  DATE_UNSUPPORTED: "A date must come from a weekday, a day of the month, “today” or “tomorrow” in the quote.",
  DATE_WEEKDAY_MISMATCH: "The date’s weekday must match the weekday in the quote.",
  DATE_DAY_MISMATCH: "The date’s day of the month must match the quote.",
  DATE_MONTH_MISMATCH: "The date’s month must match the quote.",
  DATE_AMBIGUOUS_NEXT_WEEKDAY: "“Next <weekday>” without a day of the month must stay unresolved.",
  TIME_UNSUPPORTED: "The time must be readable from an hour in the quote.",
};

export type ValidatorStory = {
  extractedText: string;
  checks: { rule: string; requirement: string; failure: string }[];
  keptText: string;
  removedText: string;
};

function failureFor(issue: ValueValidation["issues"][number], original: MeetingValue, occurredAt: string): string {
  if (issue.rule === "DATE_NOT_FUTURE" && original.date) {
    return original.date === occurredAt
      ? `${formatDate(original.date)} is the call date.`
      : `${formatDate(original.date)} is before the call date (${formatDate(occurredAt)}).`;
  }
  return issue.detail;
}

export function validatorStory(original: MeetingValue, kept: MeetingValue, issues: ValueValidation["issues"], occurredAt: string): ValidatorStory {
  const removed: string[] = [];
  if (original.date && !kept.date) removed.push(formatDate(original.date));
  if (original.time && !kept.time) removed.push(formatTime(original.time));
  const keptParts: string[] = [];
  if (kept.date) keptParts.push(formatDate(kept.date));
  if (kept.time) keptParts.push(`${formatTime(kept.time)}${kept.timezone ? ` ${formatTimezone(kept.timezone)}` : ""}`);
  return {
    extractedText: formatMeeting(original),
    checks: issues.map((i) => ({ rule: i.rule, requirement: RULE_REQUIREMENT[i.rule], failure: failureFor(i, original, occurredAt) })),
    keptText: keptParts.length ? keptParts.join(" · ") : "Nothing",
    removedText: removed.join(" · "),
  };
}
