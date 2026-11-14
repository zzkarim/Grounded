/**
 * Grounded (SPEC.md §4–7): two model calls, then deterministic code.
 *
 *   Call 1 (extract)   transcript + CRM → candidate claims with evidence {turnId, speakerId, quote}.
 *                      Recall-oriented: includes negated/historical/hedged/distractor values.
 *   Call 2 (classify)  candidates + full transcript + CRM → status, certainty, sufficiency, explanation.
 *                      Labels semantics only; it is told it does NOT decide the CRM action.
 *   Code               schema validation → grounding → existing-state comparison → policy.
 */
import { z } from "zod";
import { groundEvidence } from "@/core/grounding";
import { decideCase } from "@/core/policy";
import {
  BudgetValue,
  CandidateClaim,
  Certainty,
  ClaimStatus,
  DecisionMakerValue,
  Evidence,
  EvidenceSufficiency,
  MeetingValue,
  SemanticClassification,
} from "@/core/schemas";
import { renderCRM, renderTranscript } from "@/core/transcript";
import { promptHash } from "@/llm/client";
import { errorOutput, FIELD_DEFINITIONS } from "./shared";
import type { System } from "./types";

/**
 * v2   (2026-11-14): classifier prompt aligned to LABELING_GUIDE v1.1 before any dev run (D15). Run 1 version.
 * v2.1 (2026-11-14, after Run 1, before Run 2a): ONLY the shared field definitions changed (D20).
 *      Same extraction/classification instructions, grounding, policy and reconciliation. Not v3.
 */
export const GROUNDED_VERSION = "2.1";

// ───────── Call 1: extraction ─────────

export const ExtractionOutput = z.object({
  candidates: z.array(
    z.discriminatedUnion("field", [
      z.object({ field: z.literal("budget"), value: BudgetValue, evidence: z.array(Evidence).min(1) }),
      z.object({ field: z.literal("decisionMaker"), value: DecisionMakerValue, evidence: z.array(Evidence).min(1) }),
      z.object({ field: z.literal("nextMeeting"), value: MeetingValue, evidence: z.array(Evidence).min(1) }),
    ]),
  ),
});

export const EXTRACT_SYSTEM_PROMPT = `You extract candidate CRM values from a B2B sales call transcript. You do NOT decide what gets written to the CRM; a later step evaluates each candidate.

${FIELD_DEFINITIONS}

Instructions:
- List every candidate value for these three fields that the conversation mentions or that someone might reasonably take from it. That includes values that are negated, past, later corrected, hedged, conditional, only proposed by the seller, or easy to confuse with the field (for example a price mistaken for a budget, or an internal meeting mistaken for a seller meeting). Later steps filter them; missing a candidate here cannot be fixed later.
- One candidate per distinct value per field. If the same value is mentioned several times, give one candidate citing the relevant turns.
- Evidence: for each candidate, cite the turn(s) that state, confirm, deny, hedge, or correct it. Each evidence item has the turnId, the speakerId of the person who spoke that turn, and a quote copied EXACTLY, character for character, as a contiguous span of that turn's text (it may be part of a sentence). Do not paraphrase, fix typos, or join text from different turns into one quote. If a customer responds to something the seller said, cite both turns.
- If nothing in the conversation relates to a field, return no candidates for it.`;

// ───────── Call 2: semantic classification ─────────

export const ClassificationOutput = z.object({
  classifications: z.array(
    z.object({
      claimId: z.string(),
      status: ClaimStatus,
      certainty: Certainty,
      sufficiency: EvidenceSufficiency,
      explanation: z.string(),
    }),
  ),
});

export const CLASSIFY_SYSTEM_PROMPT = `You label the meaning of candidate CRM values extracted from a B2B sales call. You do NOT decide whether anything is written to the CRM; deterministic code makes that decision from your labels. Label each candidate accurately, independently of whether writing it would be good or bad.

${FIELD_DEFINITIONS}

For each candidate, read its evidence in the context of the WHOLE transcript (later turns may correct or negate earlier ones) and assign three independent labels:

status (is the candidate about the current state?):
- CURRENT: presented as true now (for meetings: an upcoming meeting).
- HISTORICAL: describes a past state, with no newer value named to replace it.
- NEGATED: a speaker states this value is not true (including a customer answering "no" to the seller).
- SUPERSEDED: was stated earlier or was true before, and is explicitly replaced by a newer value.
- If several apply: NEGATED > SUPERSEDED > HISTORICAL > CURRENT.

certainty (how strongly is it asserted?):
- EXPLICIT: plainly asserted as fact, or a meeting proposal accepted without hedging.
- TENTATIVE: hedged, approximate, guessed, a reported belief, or only stated/proposed by the seller without the customer clearly confirming it.
- CONDITIONAL: depends on an event that has not happened yet (an approval, sign-off, or decision still pending).
- If several apply: CONDITIONAL > TENTATIVE > EXPLICIT.

sufficiency (does the evidence establish the field relationship, taken at face value?):
- DIRECT: states exactly the relationship the field requires (approved/committed budget for this purchase; final approval authority; a mutually agreed seller-customer meeting).
- INDIRECT: relevant, but reaching the field relationship needs inference or the evidence only partly establishes it (e.g. a person involved in the decision without final authority stated).
- NONE: does not support this value for this field (e.g. a price is not a budget; a deadline is not a meeting).
Sufficiency is about the field relationship only. An explicit statement can still be INDIRECT or NONE.

decisionMaker roles:
- Leading or running the evaluation, making a recommendation, owning the budget, being someone the speaker must "run it by", or giving technical, security, or legal approval is not final purchase/sign-off authority. Such a person is INDIRECT, even when stated explicitly.
- Label each person by their own role. A person with a lesser role stays INDIRECT; do not upgrade them to DIRECT, and do not downgrade someone who is explicitly the final signer/approver because other stakeholders are involved.
- DIRECT means the person is explicitly established as having final purchase/sign-off authority. If two different people are each stated to have final authority, label both DIRECT. If the customer says several people must all sign (joint approval), that is one candidate listing all of them.

Speakers:
- Only customer-side speakers can establish a value. A seller statement counts only if the customer clearly affirms it; backchannels or deflections are not affirmation.
- A factual assertion made only by the seller about the customer's current state (for example a budget figure or who signs), which the customer does not affirm or support (they deflect, change the subject, or say nothing that supports it), does not establish the fact: sufficiency NONE, certainty TENTATIVE.
- A future meeting proposed by the seller that the customer neither accepts nor rejects is a plausible pending coordination action, not an unsupported fact: certainty TENTATIVE, sufficiency INDIRECT.

Return exactly one classification per candidate id, with a one-sentence explanation.`;

// ───────── System ─────────

export const grounded: System = {
  name: "grounded",
  version: GROUNDED_VERSION,
  promptHashes: {
    extract: promptHash(EXTRACT_SYSTEM_PROMPT, ExtractionOutput),
    classify: promptHash(CLASSIFY_SYSTEM_PROMPT, ClassificationOutput),
  },
  async run(input, llm) {
    const context = `Current CRM record:\n${renderCRM(input.crm)}\n\n${renderTranscript(input.transcript)}`;

    // Call 1
    const extraction = await llm.generate({ label: "grounded.extract", system: EXTRACT_SYSTEM_PROMPT, user: context, schema: ExtractionOutput });
    if (!extraction.ok) return errorOutput(input.caseId, "grounded", `extraction failed: ${extraction.error}`, extraction.calls);

    const claims: CandidateClaim[] = extraction.data.candidates.map((c, i) => ({ ...c, id: `c${i + 1}` }) as CandidateClaim);
    const calls = [...extraction.calls];

    // Call 2 (skipped when there is nothing to classify)
    let classifications = new Map<string, SemanticClassification>();
    let error: string | null = null;
    if (claims.length > 0) {
      const user = `${context}\n\nCandidates:\n${JSON.stringify(claims, null, 2)}`;
      const res = await llm.generate({ label: "grounded.classify", system: CLASSIFY_SYSTEM_PROMPT, user, schema: ClassificationOutput });
      calls.push(...res.calls);
      if (res.ok) classifications = indexClassifications(res.data.classifications, claims);
      else error = `classification failed: ${res.error}`;
    }

    // Deterministic stage: grounding → existing-state comparison + policy
    const { records, fields } = decideCase(
      claims.map((claim) => ({
        claim,
        classification: classifications.get(claim.id) ?? null,
        grounding: groundEvidence(claim.evidence, input.transcript),
      })),
      input.crm,
      input.transcript,
    );
    return { caseId: input.caseId, system: "grounded", fields, trace: { records }, llmCalls: calls, error };
  },
};

/**
 * Exactly one classification per claim id. Missing or duplicated ids → no classification for
 * that claim (policy then ABSTAINs with CLASSIFICATION_MISSING). Unknown ids are ignored.
 */
export function indexClassifications(
  raw: z.infer<typeof ClassificationOutput>["classifications"],
  claims: CandidateClaim[],
): Map<string, SemanticClassification> {
  const known = new Set(claims.map((c) => c.id));
  const counts = new Map<string, number>();
  for (const c of raw) counts.set(c.claimId, (counts.get(c.claimId) ?? 0) + 1);
  return new Map(raw.filter((c) => known.has(c.claimId) && counts.get(c.claimId) === 1).map((c) => [c.claimId, c]));
}
