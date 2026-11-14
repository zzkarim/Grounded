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

### D13. decisionMaker: INDIRECT claims don't compete with a DIRECT claim (2026-11-14, owner-directed, policy default-v2)
**Decision.** In field reconciliation for `decisionMaker`, if any surviving claim is DIRECT (it establishes final authority), INDIRECT claims (evaluation lead, "run it by", technical/security approver) become ABSTAIN with `OUTRANKED_BY_DIRECT` and don't trigger a conflict. Two different DIRECT claims still conflict → ASK. Joint approval is one multi-person claim.
**Why.** Guide v1 contradicted itself: §2.2/§8 said "Sarah owns technical approval, James signs" → ACT James, while §4 step 4 turned any two different live values into ASK. The INDIRECT claim describes a *different relationship* (involvement), not a rival answer to "who has final authority". "Surviving" includes NO_OP, so a reconfirmed CRM decision maker isn't displaced by an evaluation lead.
**Scope.** decisionMaker only. For budget and nextMeeting, an INDIRECT claim is still a candidate value for the *same* quantity (for example a derived component sum vs a stated total), so different values genuinely compete.
**Alternative rejected.** Dropping all INDIRECT claims whenever any other claim exists. Then two INDIRECT people with no DIRECT claim would resolve arbitrarily instead of ASKing.

### D14. Unaffirmed rep facts are NONE; unaccepted rep-proposed meetings stay INDIRECT (2026-11-14, owner-directed, guide v1.1 §3.4)
**Why.** A rep's factual claim about the customer's state ("you have about 200K") that the customer deflects gives no customer-derived evidence for the field, so ABSTAIN, with the value kept as a tempting wrong candidate. A proposed future coordination action (a meeting the rep books) is a plausible pending action a human may want to confirm, so ASK. No policy code change was needed: this is a semantic labeling rule, applied through sufficiency.

### D15. Prompts aligned to LABELING_GUIDE v1.1 before any dev run (2026-11-14, owner-directed)
**What.** The Grounded classifier prompt (grounded v2) and the self-assessing baseline prompt (baseline-self-assess v2) were updated to encode guide v1.1:
- decisionMaker hierarchy: lesser roles are not final authority, and don't make an identified final signer ambiguous; two final authorities without joint approval need review.
- An unaffirmed seller factual assertion does not establish the fact.
- An unaccepted seller-proposed meeting is a plausible pending item.
The naive baseline is unchanged (v1): it keeps only the shared field definitions.
**Why.** Specification alignment, not tuning. The changes were made **before any dev evaluation run existed** (no `data/runs/dev/`) and without consulting any model output. Without them, both model-facing systems would be scored against rules (guide v1.1) they had never been told.
**Fairness.** Both systems get the same semantics in their own architecture's terms. The classifier gets them as status/certainty/sufficiency labeling guidance and is still never told an action. The self-assessing baseline gets them as plain-language AUTO/REVIEW guidance, with no taxonomy, policy table, reason codes, or decomposition.
