# Decision log

Each entry records what was decided, why, and the alternatives considered. Newest entries go at the bottom.

### D1. Status and certainty are separate axes (2026-11-13)
**Decision.** `ClaimStatus` (CURRENT/HISTORICAL/NEGATED/SUPERSEDED) is a separate field from `Certainty` (EXPLICIT/TENTATIVE/CONDITIONAL).
**Why.** "Corrected" and "historical" describe *which state* a claim is about, not *how strongly* it is asserted. "We probably used to have 100K" is both historical and tentative. A single enum would force an arbitrary choice.
**Alternative.** One six-value enum with precedence, which loses information.

### D2. Sufficiency is semantic only (2026-11-13)
**Decision.** `DIRECT/INDIRECT/NONE` describes whether the evidence establishes the field *relationship*. It never encodes "safe to write".
**Why.** If the LLM's sufficiency label meant "safe to write", the deterministic policy would just pass through the LLM's trust judgment, which is exactly what the experiment is trying to separate.

### D3. NO_OP is a fourth outcome (2026-11-13)
**Decision.** A supported value identical to the existing CRM value produces `NO_OP`, not ACT/ASK/ABSTAIN.
**Why.** It is not a write (so it must not inflate ACT counts), not an abstention (the evidence *does* support it), and there is nothing for a human to review. NO_OP applies regardless of certainty, because a tentative restatement of the current value changes nothing.
**For baselines** too, a proposal identical to the CRM value becomes NO_OP: writing the same value is a no-op in effect. This is an evaluation normalization applied to all systems equally, not Grounded's policy.

### D4. Evidence is `{turnId, speakerId, quote}`, checked per turn (2026-11-13)
**Why.** A whole-transcript substring check would accept a quote from the wrong speaker. That is the rep-says-$100K-customer-says-"No" failure. Per-turn checks give speaker attribution and UI highlighting for free. Normalization covers only whitespace, curly quotes, and dashes. Matching stays case-sensitive so paraphrases don't slip through.

### D5. Ungrounded → ABSTAIN, not ASK (2026-11-13)
**Why.** An ungrounded quote may be hallucinated. ASK would show a reviewer a fabricated quote as if it were evidence. The cost is that a correct value with a paraphrased quote gets dropped. Every grounding failure is logged, so this cost is measurable.

### D6. Pipeline/model errors → no write (2026-11-13)
**Decision.** Malformed or missing model output after one retry makes the affected claim (or the whole case) `ABSTAIN` with reason `CLASSIFICATION_MISSING` / `SYSTEM_ERROR`. Errors are counted separately in metrics.
**Why.** Fail-safe: an error must never become an ACT. ABSTAIN (rather than ASK) keeps "system broke" distinct from "evidence was ambiguous".

### D7. Grounded Call 2 classifies all candidates in one call, with the full transcript (2026-11-13)
**Why.** This keeps the spec'd two calls per transcript. The full transcript is the "relevant context": supersession and negation can appear many turns after the original statement, so a snippet window would miss them. The transcripts are short, so cost is not a concern.
**Alternative.** One call per candidate gives more independence, but N+1 calls and more cost. We can revisit it if dev failures show candidates contaminating each other's labels.

### D8. Baselines return at most one update per field (2026-11-13)
**Why.** Their output schema is `{budget, decisionMaker, nextMeeting}`, each nullable, so a "write" is unambiguous. If the schema allowed a list, two proposals for one field would need a tie-break rule we would have to invent.

### D9. Self-assessing baseline gets the high-level ACT definition (2026-11-13)
**Why.** Gold actions follow `LABELING_GUIDE.md`. A baseline that never saw *what "safe to write" means* would lose because it didn't know the rubric, not because of its architecture. It gets the field definitions plus one paragraph on AUTO vs REVIEW: current, plainly stated or confirmed by the customer, not hedged or conditional, not overwriting an existing CRM value. It does **not** get the status/certainty/sufficiency decomposition, the grounding check, or the policy table.

### D10. No server-side refusal fallback (2026-11-13)
**Why.** The SDK can rerun a refused request on a different model. That would silently mix models within one experiment run. Refusals are recorded as errors instead.

### D11. The gold rubric and the policy are the same rules (2026-11-13)
**Consequence.** The benchmark measures whether a system gets the *semantics* right and applies the rubric correctly. It does not test whether the rubric is the best possible policy. Gold labels are assigned by human judgment of the semantics, not by running `policy.ts`.

### D12. Illustrative cases live outside the benchmark (2026-11-13)
**Why.** The six schema-illustration cases were drafted by Claude (`source: "generated"`, `labelStatus: "draft"`). They live in `data/benchmark/examples/` with `split: "example"`, so they can't be mistaken for dev/test data.
