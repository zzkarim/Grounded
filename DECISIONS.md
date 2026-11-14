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

### D16. Scoring v2: exact meeting time (2026-11-14, AFTER DEV Run 1)
**Decision.** The scored value match requires an equal meeting `time`, null included (`scoringValuesEqual`), and runs record `scoringVersion: "v2"`. The policy's semantic equality (NO_OP and conflicts) is unchanged.
**Why.** In Run 1, Grounded wrote dev-gen-006's meeting without its known time (16:00) and got full credit. A system shouldn't get full credit for dropping known CRM information, or for inventing a time the transcript doesn't establish.
**Why the policy keeps the looser rule.** "Still on for Thursday", spoken without a time, *corroborates* a CRM meeting on Thursday at 10:00. Treating that as a conflicting overwrite would be wrong.
**Historical runs.** Run 1 files and DEV_RUN1_ANALYSIS.md are untouched and remain scored under v1. The counterfactual is in POST_RUN1_DECISIONS.md.

### D17. Budget components are NONE signals, not competitors (2026-11-14, AFTER DEV Run 1, guide v1.2)
**Decision.** A component amount is a part of the budget, labeled sufficiency NONE. The derived (or stated) total is the canonical candidate. No policy code change: rule 4 already discards NONE claims, so components never reach conflict detection.
**Rejected.** Deterministic arithmetic detection, where a claim equal to the sum of other claims marks them as components. It's fragile: coincidental sums, partially stated components, superseded parts. And it would make the policy guess at semantics that belong to classification.
**Consequence.** Grounded's classifier prompt (v2) doesn't state this rule. Aligning it is pending and will be recorded as post-Run-1 specification alignment.

### D18. A meeting candidate needs an agreement to meet or a specific proposed time (2026-11-14, AFTER DEV Run 1, guide v1.2)
**Why.** Run 1 exposed a boundary that v1.1 left implicit (dev-gen-025): "I'll ask her assistant for times" plus an availability constraint is not a pending meeting. The v1.1 pending-coordination exception requires an actual proposal with specific timing. The dev-gen-025 label (ABSTAIN) is unchanged.

### D19. Signal recall diagnostic (2026-11-14, AFTER DEV Run 1)
**Why.** The final-action metrics can't see whether ABSTAIN preserved negative or historical context, as the PRD requires. The diagnostic is Grounded-only (baselines have no candidate trace), kept outside run files and headline metrics, and computed from saved traces.

### D20. Run 2a: fair specification alignment of all prompts (2026-11-14, AFTER DEV Run 1, BEFORE Run 2a and before any Grounded v3 change)
**Why.** Run 1 showed that the conventions which define the benchmark's correct answers (LABELING_GUIDE §2) were not communicated equally. The shared field definitions even contradicted the guide ("time null if … unclear" vs "at 2" in business context = 14:00). Every self-assess lost ACT, Grounded's dropped 006 time, and both systems' 025 review trace back to that gap (POST_RUN1_DECISIONS.md §5).
**What changed.**
- Shared `FIELD_DEFINITIONS`, identical for all three systems:
  - meeting normalization: business-hours times, bare ordinals, "next <weekday>" → null, weekday/date contradiction → null, date without time is valid, timezone optional
  - meeting-candidate rule and the non-meetings list
  - budget components → sum, not competing values
  - first name is a valid name
  - final authority vs lesser roles
- Self-assess AUTO/REVIEW guidance:
  - completeness: date without time, timezone, first name
  - lesser-role stakeholders → review when no final authority is established
  - availability constraints and promises to find times are not meetings
**Versions.** baseline-naive v1→**v2** (definitions only), baseline-self-assess v2→**v3**, grounded v2→**v2.1** (definitions only). The Grounded extraction/classification instructions, grounding, policy (`default-v2`), reconciliation and model config are unchanged, and there is no value validation, so this is not v3.
**Not given to the baselines.** Status/certainty/sufficiency labels, quote validation, reconciliation, the policy table, reason codes, structured-value validation, the two-call architecture. `tests/prompts.test.ts` guards this.
**Purpose.** Run 2a measures the effect of equal information alone. Grounded v3 (structured-value validation) will be a separate, later run so its effect can be attributed.

### D21. Grounded v3: deterministic structured meeting-value validation (2026-11-14, AFTER DEV Run 2a, BEFORE Run 2b; policy default-v3)
**Problem.** In Runs 1 and 2a, dev-gen-029's extractor normalized a weekday plus day-of-month phrase to a date that falls on a different weekday. Grounding passed because the quote exists, classification accepted the claim, and the policy ACTed. Grounding proves a quote exists, not that the structured value derived from it is faithful. In Run 2a the self-assessing baseline made the same calendar error, despite an explicit prompt rule. This is a model-reasoning failure that a prompt doesn't reliably fix.
**Decision.** Add one deterministic stage, `src/core/validation.ts`, between grounding and classification. It checks each `nextMeeting` value against its own evidence quotes and the call date, with general invariants from LABELING_GUIDE §2.3:
- the date is future
- the date is anchored by an explicit date expression
- the date matches at least one date mention completely
- "next <weekday>" without a day of month stays null
- a time is supported by an explicit hour expression
**Failure handling.** Failing components are set to null (never corrected, no model re-call). The original is kept in the trace (`validation.originalValue`). The policy adds `VALUE_UNVERIFIED` to rule 6's ASK reasons, so an unverified claim can never ACT. `decideCase` validates any claim passed without a validation result, so no caller can skip it.
**Monotonic by construction.** Validation only nulls components and adds an ASK reason. Rules 1–4 (ABSTAIN) and the conflict/outranking logic are untouched. Test-verified: a decision is never more autonomous with validation than without it, given the same classification.
**Design choices.**
- *Date mentions, not loose token sets.* A value must match one whole mention ("Monday the 10th" = weekday Monday AND day 10). A rejected alternative ("the 9th is out… Thursday?") then doesn't block the chosen date, and a self-contradictory mention matches no date.
- *Conservative parsing.* Only explicit forms are recognized: full weekday names, ordinals, month+day, h:mm, an hour with am/pm or o'clock, a standalone 1–12 digit, "at <number word>", noon. Unrecognized phrasing creates no constraint: it can't cause a failure, but a contradiction phrased that way isn't caught.
- *The classifier sees the validated value.* This follows the pipeline order. It only affects claims that failed validation.
- *Meetings only.* Budget numeric checks are brittle for spoken numbers. Decision-maker name checks were proposed as a later extension.
**Out of scope (known remaining failures).** dev-gen-015's derived-total sufficiency (CLASSIFICATION), extraction recall (028), and contextual-signal recall. Prompts, baselines, scoring, model and the frozen benchmark are unchanged.
**Caveat.** The validator was designed after observing dev failures. Its rules come from the guide, not from dev phrasing (`tests/validation.test.ts` checks the source for benchmark text), but final evidence must come from the held-out test split.
