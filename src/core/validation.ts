/**
 * Grounded v3: deterministic STRUCTURED-VALUE VALIDATION (DECISIONS.md D21, RUN2B_PLAN.md).
 *
 * Grounding proves a quote exists. It doesn't prove the structured value the model normalized FROM
 * that quote is faithful to it. This module checks normalized meeting values against the claim's
 * own evidence quotes and the call date, using general invariants from LABELING_GUIDE.md §2.3.
 *
 * Guarantees:
 *   - No model calls, no probabilities, nothing benchmark-specific.
 *   - Never invents or corrects a value. An unverifiable component (date and/or time) is set to null,
 *     and the original is kept for the trace. The value can only become LESS specific.
 *   - The policy treats an unverified claim as never ACT-able (reason VALUE_UNVERIFIED).
 *
 * Parsing is deliberately conservative. Only explicit, common forms are recognized. Anything not
 * recognized creates no constraint, so an unusual phrasing can't cause a failure here. The trade-off
 * is that a contradiction expressed in an unrecognized form isn't caught.
 *
 * Only `nextMeeting` is validated. Budget and decision-maker values pass through unchanged.
 */
import { CandidateClaim, Evidence, MeetingValue, Transcript, ValueValidation } from "./schemas";

export const VALIDATOR_VERSION = "meeting-v1";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]; // getUTCDay order
const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5, june: 6, jun: 6,
  july: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9, october: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12,
};
const HOUR_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};
const WEEKDAY_RE = WEEKDAYS.join("|");
const MONTH_RE = Object.keys(MONTHS).join("|");
const HOUR_WORD_RE = Object.keys(HOUR_WORDS).join("|");
const MERIDIEM_RE = "a\\.?m\\.?|p\\.?m\\.?";

type Issue = ValueValidation["issues"][number];

/** Ordinary business-hours reading of an hour said without AM/PM (LABELING_GUIDE §2.3: "at 2" = 14:00). */
export function businessHour(h: number): number {
  return h >= 1 && h <= 6 ? h + 12 : h % 24; // 1–6 → afternoon; 7–11 morning; 12 noon
}

/** One explicit date expression, e.g. "Monday the 10th" → {weekday: "monday", day: 10}. */
export type DateMention = { weekday: string | null; day: number | null; month: number | null };

export type TemporalFacts = {
  /** Each explicit date expression in the evidence. A value must match at least one of them completely. */
  mentions: DateMention[];
  nextWeekday: boolean;
  todayOrTomorrow: boolean;
  /** Every time (HH:MM, 24h) that an hour expression in the text can be read as. */
  times: Set<string>;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Extract explicit temporal expressions from evidence text. Pure and conservative. */
export function extractTemporalFacts(raw: string): TemporalFacts {
  let t = ` ${raw.toLowerCase().replace(/[\u2018\u2019]/g, "'")} `;
  const facts: TemporalFacts = { mentions: [], nextWeekday: false, todayOrTomorrow: false, times: new Set() };
  const consume = (re: RegExp, fn: (m: string[]) => void) => {
    t = t.replace(re, (...args) => {
      fn(args.slice(0, -2) as string[]);
      return " ";
    });
  };
  const day = (d: string) => (Number(d) >= 1 && Number(d) <= 31 ? Number(d) : null);
  const mention = (weekday: string | null, d: string | null, month: string | null) =>
    facts.mentions.push({ weekday, day: d === null ? null : day(d), month: month === null ? null : MONTHS[month] });

  facts.nextWeekday = new RegExp(`\\bnext\\s+(${WEEKDAY_RE})\\b`).test(t);
  facts.todayOrTomorrow = /\b(today|tomorrow)\b/.test(t);

  // Date expressions, most specific first. Each is consumed so its parts aren't counted twice and its
  // numbers aren't later read as hours. "s?" accepts plural weekdays; ",?" accepts "Thursday, the 19th".
  const WD = `(${WEEKDAY_RE})s?,?\\s+`;
  const ORD = "(\\d{1,2})(?:st|nd|rd|th)";
  const NUM = "(\\d{1,2})(?:st|nd|rd|th)?";
  const MON = `(${MONTH_RE})\\.?`;
  consume(new RegExp(`\\b${WD}${MON}\\s+${NUM}\\b`, "g"), (m) => mention(m[1], m[3], m[2]));
  consume(new RegExp(`\\b${WD}(?:the\\s+)?${NUM}\\s+(?:of\\s+)?${MON}\\b`, "g"), (m) => mention(m[1], m[2], m[3]));
  consume(new RegExp(`\\b${WD}(?:the\\s+)?${ORD}\\b`, "g"), (m) => mention(m[1], m[2], null));
  consume(new RegExp(`\\b${MON}\\s+${NUM}\\b`, "g"), (m) => mention(null, m[2], m[1]));
  consume(new RegExp(`\\b${NUM}\\s+(?:of\\s+)?${MON}\\b`, "g"), (m) => mention(null, m[1], m[2]));
  consume(new RegExp(`\\b${ORD}\\b`, "g"), (m) => mention(null, m[1], null));
  consume(new RegExp(`\\b(${WEEKDAY_RE})s?\\b`, "g"), (m) => mention(m[1], null, null));
  facts.mentions = facts.mentions.filter((x) => x.weekday !== null || x.day !== null);

  // Time expressions, most specific first. Each reading is added as HH:MM.
  const addTime = (h: number, min: number, meridiem: string | undefined) => {
    if (h < 0 || h > 23 || min < 0 || min > 59) return;
    let hour: number;
    if (meridiem?.startsWith("a")) hour = h % 12;
    else if (meridiem?.startsWith("p")) hour = (h % 12) + 12;
    else if (h > 12) hour = h; // already 24-hour
    else hour = businessHour(h);
    facts.times.add(`${pad(hour)}:${pad(min)}`);
  };
  consume(new RegExp(`\\b(\\d{1,2}):(\\d{2})\\s*(${MERIDIEM_RE})?(?![a-z])`, "g"), (m) => addTime(Number(m[1]), Number(m[2]), m[3]));
  consume(new RegExp(`\\b(\\d{1,2}|${HOUR_WORD_RE})\\s*(${MERIDIEM_RE}|o'?clock)(?![a-z])`, "g"), (m) => {
    const h = HOUR_WORDS[m[1]] ?? Number(m[1]);
    addTime(h, 0, m[2].startsWith("o") ? undefined : m[2]);
  });
  consume(new RegExp(`\\bat\\s+(${HOUR_WORD_RE})\\b`, "g"), (m) => addTime(HOUR_WORDS[m[1]], 0, undefined));
  consume(/\b(noon|midday)\b/g, () => facts.times.add("12:00"));
  // A standalone number 1–12 left after removing dates (e.g. "at 4", "around 3") is an hour.
  // Number WORDS aren't accepted standalone ("one thing", "two or three") because they're too common in prose.
  for (const m of t.matchAll(/(?<![\d$.,])\b(\d{1,2})\b(?![\d%,.]\d|k\b|\s*(?:k|percent|people|weeks?|days?|months?|years?|hours?|minutes?|seats?|users?|licenses?)\b)/g)) {
    const h = Number(m[1]);
    if (h >= 1 && h <= 12) addTime(h, 0, undefined);
  }
  return facts;
}

/** Day of week of an ISO date, as a lowercase full name. */
export function weekdayName(isoDate: string): string {
  return WEEKDAYS[new Date(`${isoDate}T12:00:00Z`).getUTCDay()];
}

/**
 * Validate a normalized meeting value against its evidence quotes and the call date.
 * Returns the (possibly less specific) value plus every failed rule.
 */
export function validateMeeting(value: MeetingValue, evidence: Evidence[], occurredAt: string): { value: MeetingValue; validation: ValueValidation } {
  // Quotes are joined with a separator that no pattern can span.
  const facts = extractTemporalFacts(evidence.map((e) => e.quote).join(" ¶ "));
  const issues: Issue[] = [];
  const dateIssue = (rule: Issue["rule"], detail: string) => issues.push({ component: "date", rule, detail });

  if (value.date !== null) {
    const [, month, day] = value.date.split("-").map(Number);
    const wd = weekdayName(value.date);
    if (value.date <= occurredAt) dateIssue("DATE_NOT_FUTURE", `${value.date} is not after the call date ${occurredAt}`);
    if (facts.mentions.length === 0 && !facts.todayOrTomorrow) {
      dateIssue("DATE_UNSUPPORTED", "no weekday, day of month, today or tomorrow in the evidence");
    }
    if (facts.nextWeekday && !facts.mentions.some((m) => m.day !== null)) {
      dateIssue("DATE_AMBIGUOUS_NEXT_WEEKDAY", '"next <weekday>" without a day of month must stay unresolved');
    }
    // The date must match at least one date mention completely (weekday, day and month where stated).
    // A self-contradictory mention ("<weekday> the N" where the Nth isn't that weekday) matches no date.
    if (facts.mentions.length > 0) {
      const mismatches = facts.mentions.map((m) => [
        ...(m.weekday !== null && m.weekday !== wd ? (["DATE_WEEKDAY_MISMATCH"] as const) : []),
        ...(m.day !== null && m.day !== day ? (["DATE_DAY_MISMATCH"] as const) : []),
        ...(m.month !== null && m.month !== month ? (["DATE_MONTH_MISMATCH"] as const) : []),
      ]);
      if (mismatches.every((x) => x.length > 0)) {
        // Report the closest mention(s): fewest conflicting attributes.
        const fewest = Math.min(...mismatches.map((x) => x.length));
        const reported = new Set(mismatches.filter((x) => x.length === fewest).flat());
        const said = facts.mentions.map((m) => [m.weekday, m.day && `day ${m.day}`, m.month && `month ${m.month}`].filter(Boolean).join(" ")).join("; ");
        for (const rule of reported) dateIssue(rule, `${value.date} (${wd}) matches no date mention: ${said}`);
      }
    }
  }
  if (value.time !== null && !facts.times.has(value.time)) {
    issues.push({ component: "time", rule: "TIME_UNSUPPORTED", detail: `${value.time} not supported; evidence reads as ${[...facts.times].join(", ") || "no time"}` });
  }

  const nullDate = issues.some((i) => i.component === "date");
  const nullTime = issues.some((i) => i.component === "time");
  const sanitized: MeetingValue = { ...value, date: nullDate ? null : value.date, time: nullTime ? null : value.time };
  return {
    value: sanitized,
    validation: { verified: issues.length === 0, issues, originalValue: issues.length > 0 ? value : null },
  };
}

const VERIFIED: ValueValidation = { verified: true, issues: [], originalValue: null };

/** Validate any candidate claim. Only meetings are checked; other fields pass unchanged. */
export function validateClaim(claim: CandidateClaim, transcript: Transcript): { claim: CandidateClaim; validation: ValueValidation } {
  if (claim.field !== "nextMeeting") return { claim, validation: VERIFIED };
  const { value, validation } = validateMeeting(claim.value, claim.evidence, transcript.occurredAt);
  return { claim: { ...claim, value }, validation };
}
