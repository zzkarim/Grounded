/**
 * The two one-prompt baselines (SPEC.md §7).
 *
 * baseline-naive        One call proposes CRM updates; every proposal is written (ACT).
 * baseline-self-assess  One call proposes updates AND marks each AUTO (→ ACT) or REVIEW (→ ASK).
 *                       The PRIMARY baseline: it tests whether the model can make the trust
 *                       decision itself in one shot.
 *
 * Both get the same field definitions as Grounded. Neither gets Grounded's decomposition,
 * grounding check, or policy. Their quotes are recorded for inspection but not checked.
 */
import { z } from "zod";
import { BudgetValue, CRM_FIELDS, CRMField, DecisionMakerValue, FieldDecision, MeetingValue } from "@/core/schemas";
import { renderCRM, renderTranscript } from "@/core/transcript";
import { promptHash } from "@/llm/client";
import { baselineDecision, errorOutput, FIELD_DEFINITIONS, NOT_PROPOSED } from "./shared";
import type { System } from "./types";

// ───────── Naive ─────────

const naiveUpdate = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ value, evidenceQuote: z.string() }).nullable();

export const NaiveOutput = z.object({
  budget: naiveUpdate(BudgetValue),
  decisionMaker: naiveUpdate(DecisionMakerValue),
  nextMeeting: naiveUpdate(MeetingValue),
});

export const NAIVE_SYSTEM_PROMPT = `You keep a B2B sales CRM up to date from sales call transcripts.

You will receive the current CRM record and a call transcript. Propose updates to the CRM fields based on the conversation.

${FIELD_DEFINITIONS}

For each field, return the updated value with a short quote from the transcript that supports it,
or null if the conversation gives no reason to update that field.`;

// ───────── Self-assessing ─────────

const selfAssessUpdate = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ value, evidenceQuote: z.string(), decision: z.enum(["AUTO", "REVIEW"]), reason: z.string() }).nullable();

export const SelfAssessOutput = z.object({
  budget: selfAssessUpdate(BudgetValue),
  decisionMaker: selfAssessUpdate(DecisionMakerValue),
  nextMeeting: selfAssessUpdate(MeetingValue),
});

/** High-level ACT definition only: no decomposition, no policy table (DECISIONS.md D9). */
export const SELF_ASSESS_SYSTEM_PROMPT = `You keep a B2B sales CRM up to date from sales call transcripts. Your updates may be written to the CRM automatically, so incorrect automatic updates are costly.

You will receive the current CRM record and a call transcript. Propose updates to the CRM fields based on the conversation.

${FIELD_DEFINITIONS}

For each field, return the updated value with a short quote from the transcript that supports it, and decide:
- "AUTO": safe to write without human review. The customer clearly states or confirms this value as the current fact (not hedged, not conditional on something that has not happened, not past or superseded information), it matches the field definition exactly, and it does not replace a different value already in the CRM.
- "REVIEW": a plausible, useful update that a human should confirm before it is written.
Return null for a field if the conversation gives no reason to update it.`;

// ───────── Shared runner ─────────

type Proposal = { value: unknown; evidenceQuote: string; decision?: "AUTO" | "REVIEW" } | null;

function makeBaseline(
  name: string,
  system: string,
  schema: z.ZodType<Record<CRMField, Proposal>>,
  toDecision: (p: NonNullable<Proposal>) => { action: "ACT" | "ASK"; reason: "BASELINE_PROPOSED" | "BASELINE_AUTO" | "BASELINE_REVIEW" },
): System {
  return {
    name,
    version: "1",
    promptHashes: { main: promptHash(system, schema) },
    async run(input, llm) {
      const user = `Current CRM record:\n${renderCRM(input.crm)}\n\n${renderTranscript(input.transcript)}`;
      const res = await llm.generate({ label: `${name}.main`, system, user, schema });
      if (!res.ok) return errorOutput(input.caseId, name, res.error, res.calls);
      const fields = {} as Record<CRMField, FieldDecision>;
      for (const f of CRM_FIELDS) {
        const p = res.data[f];
        if (p === null) fields[f] = NOT_PROPOSED;
        else {
          const { action, reason } = toDecision(p);
          fields[f] = baselineDecision(f, input.crm, p.value, action, reason);
        }
      }
      return { caseId: input.caseId, system: name, fields, trace: res.data, llmCalls: res.calls, error: null };
    },
  };
}

export const baselineNaive = makeBaseline("baseline-naive", NAIVE_SYSTEM_PROMPT, NaiveOutput as never, () => ({
  action: "ACT",
  reason: "BASELINE_PROPOSED",
}));

export const baselineSelfAssess = makeBaseline("baseline-self-assess", SELF_ASSESS_SYSTEM_PROMPT, SelfAssessOutput as never, (p) =>
  p.decision === "AUTO" ? { action: "ACT", reason: "BASELINE_AUTO" } : { action: "ASK", reason: "BASELINE_REVIEW" },
);
