/**
 * Deterministic evidence grounding (SPEC.md §5, DECISIONS.md D4).
 *
 * This checks that quoted evidence really appears in the cited turn, spoken by the
 * cited speaker. It is NOT fact-checking: it verifies that the proposed CRM update is
 * traceable to what was said, not that what was said is true.
 */
import { Evidence, GroundingResult, Transcript } from "./schemas";

/**
 * Normalization is deliberately minimal: whitespace runs, curly quotes, and dash variants.
 * Matching stays case-sensitive and punctuation-sensitive so that paraphrases fail.
 */
export function normalizeForMatch(s: string): string {
  return s
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function groundEvidence(evidence: Evidence[], transcript: Transcript): GroundingResult {
  const turns = new Map(transcript.turns.map((t) => [t.id, t]));
  const sideOf = new Map(transcript.participants.map((p) => [p.id, p.side]));
  const failures: GroundingResult["failures"] = [];
  let hasCustomerEvidence = false;

  evidence.forEach((ev, evidenceIndex) => {
    const turn = turns.get(ev.turnId);
    if (!turn) return void failures.push({ evidenceIndex, reason: "UNKNOWN_TURN" });
    if (turn.speakerId !== ev.speakerId) return void failures.push({ evidenceIndex, reason: "SPEAKER_MISMATCH" });
    const quote = normalizeForMatch(ev.quote);
    if (quote.length === 0 || !normalizeForMatch(turn.text).includes(quote)) {
      return void failures.push({ evidenceIndex, reason: "QUOTE_NOT_IN_TURN" });
    }
    if (sideOf.get(turn.speakerId) === "customer") hasCustomerEvidence = true;
  });

  return {
    grounded: evidence.length > 0 && failures.length === 0,
    hasCustomerEvidence: failures.length === 0 && hasCustomerEvidence,
    failures,
  };
}
