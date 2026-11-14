# Post-Run-1 decisions (2026-11-14)

Everything in this document was decided **after** DEV Run 1 and in response to it.

Unchanged by these decisions:
- the Run 1 raw files under `data/runs/dev/`
- `DEV_RUN1_ANALYSIS.md`, which stays a historical record scored under scoring v1
- the frozen dev cases
- the test split
- all model prompts, the policy, and the model configuration

No model calls were made.

---

## 1. Meeting-time scoring (implemented: scoring v2)

**Problem.** Semantic equality compares meeting time only when both sides have one. In Run 1, Grounded wrote dev-gen-006's meeting **without** its known time (gold 16:00) and was scored CORRECT_ACT.

**Decision.** Scoring uses **exact match** (`scoringValuesEqual` in `src/core/values.ts`). For `nextMeeting`, the date and the time must both be equal, with null equal to null.

| Gold time | Predicted time | v1 (Run 1) | v2 |
|---|---|---|---|
| 16:00 | 16:00 | match | match |
| 16:00 | null | match | **no match** (dropped known information) |
| 16:00 | 15:00 | no match | no match |
| null | null | match | match |
| null | 14:00 | match | **no match** |

**The gold-null / predicted-time case.** I recommend "no match" and implemented it.
- A null gold time means the transcript doesn't establish a time: none was stated, or AM/PM is genuinely unclear (guide §2.3).
- Writing 14:00 writes a detail into a system of record that nothing in the conversation supports. That's the exact failure Grounded exists to prevent.
- Strict equality is symmetric, needs no special cases, and treats "dropped a known detail" and "invented a detail" the same way.

**Unchanged:**
- **Timezone and `asStated`** are still ignored. Timezone strings ("Central", "CT", "Central Time") can't be compared reliably without a normalization table, and the guide never made them part of value identity.
- **Budget and decision-maker scoring.**
- **The policy's semantic equality**, used for NO_OP and conflict detection. "Still on for Thursday", said without a time, should still *corroborate* a CRM meeting on Thursday at 10:00, not be treated as an overwrite.

**Versioning.**
- `SCORING_VERSION = "v2"` is recorded in new runs as `EvaluationRun.scoringVersion` (optional in the schema).
- Run 1 files have no such field and therefore mean v1.
- The report prints the scoring version.

**Open question, not implemented.** By the same principle, should a decision-maker prediction that drops a gold *role* (gold `Marcus (CFO)`, predicted `Marcus`) still count as an exact match? Today it does, because names match first. You scoped this decision to meeting time.

---

## 2. Component budgets (guide v1.2 §2.1; no policy code change)

**Decision.**
- Budget components ("40 approved for licenses and another 10 for implementation") are *parts* of the budget, not candidates for it. A component claim has sufficiency **NONE** and is kept only as a signal.
- The canonical candidate is the derived total (INDIRECT), or the stated total if one is given.
- "Latest stated" (§4 step 4) resolves only genuinely competing claims about the same CRM value. It never chooses between a component and its aggregate.

**Why no policy change.** Policy rule 4 already discards NONE claims before conflict detection, so correctly labeled components never compete.

**Rejected:** deterministic arithmetic detection, where a claim equal to the sum of others marks those others as components. Coincidental sums, partially stated components and superseded parts make it fragile, and it would put semantic interpretation into the policy.

**Consequences.**
- dev-gen-015's frozen label is already consistent (ASK 50K, INDIRECT). No case change.
- Grounded v2's classifier prompt doesn't state this rule. In Run 1 it labeled the components INDIRECT, which caused the conflict and the 40K wrong-value review. Aligning the prompt is pending (§5, §6) and must be recorded as post-Run-1 specification alignment.

---

## 3. dev-gen-025 meeting semantics (guide v1.2 §2.3/§3.4; label unchanged)

> Rep: "When could we get in front of Rachel?"
> Customer: "She's out until the 15th, so nothing before then. I'll ask her assistant for times after that."

**I agree with your interpretation: ABSTAIN stays.**
- v1.1's pending-coordination exception covers an *actual proposed meeting* that the customer hasn't accepted, as in dev-gen-028 ("I'll also send an invite for Tuesday at 11") or meeting-ex-02.
- Here, nobody proposes a time, and the customer doesn't agree to meet. They promise an asynchronous action (asking an assistant for times) and give an availability constraint ("nothing before the 15th").
- The rep's question expresses intent to meet, but intent isn't a proposal, and the customer's reply doesn't accept one.

**Clarified rule (guide §2.3).** A meeting candidate requires either:
- (a) an explicit agreement to meet, even with vague timing (dev-gen-011 "let's talk sometime next week", dev-gen-022 "let's aim for early next month"), or
- (b) a specific proposed time, even if not yet accepted.

A promise to find or check times creates no candidate on its own. It only lowers the certainty of an existing proposal. An availability constraint is NONE.

**Caveat.** This boundary is fine-grained. In Run 1, *both* model systems independently read 025 as a pending item. After this clarification, systems still won't know the rule until their prompts are aligned (§5).

**Consistency check.** I re-checked every dev and example meeting label against the clarified rule. All non-ABSTAIN gold meetings satisfy (a) or (b), and no frozen label conflicts.

---

## 4. Signal recall (implemented: diagnostic, Grounded only)

**Definition** (`src/eval/signalRecall.ts`, `npm run signal-recall -- <run.json>`):
- **Gold signals:** every (case, field) whose gold `value` is non-null. That's the ACT/ASK/NO_OP value, or the tempting wrong value an ABSTAIN records (guide §6). Fields with gold value null record no claim and are excluded.
- **Recalled:** Grounded's saved trace contains ≥1 candidate claim for that field whose value is the *same fact*, by the semantic equality the policy uses. The question is whether the signal was preserved, not whether it was written exactly, and the classification or decision doesn't matter.
- **Separate from the headline.** It isn't stored in run files and isn't part of the headline metrics. Baselines are excluded because they expose no candidate trace.
- **Limitation.** Gold records one claim per field, so unlabeled distractors (for example 023's seller quote, incumbent spend and RFP threshold) aren't counted. There are only 1 HISTORICAL and 1 NEGATED gold signals and 0 SUPERSEDED, so the status breakdown is thin.

**Computed from Grounded Run 1's saved output** (no model calls):

| | Recall |
|---|---|
| **Overall** | **67/71 (94.4%)** |
| Gold-ABSTAIN signals (negative context) | 5/8 (62.5%) |
| Status: CURRENT / HISTORICAL / NEGATED | 65/69 · 1/1 · 1/1 |
| Sufficiency: DIRECT / INDIRECT / NONE | 57/58 · 7/7 · **3/6 (50%)** |
| Gold action: ACT / ASK / NO_OP / ABSTAIN | 31/31 · 23/24 · 8/8 · 5/8 |
| Field: budget / decisionMaker / nextMeeting | 26/27 · 22/22 · 19/22 |

Not recalled:
- dev-gen-014 budget (25K purchasing threshold, NONE)
- dev-gen-014 nextMeeting (internal architecture review, NONE)
- dev-gen-019 nextMeeting ("by Friday" deliverable, NONE)
- dev-gen-029 nextMeeting: a meeting *was* extracted, but with date 2026-04-22, which is not the same fact as gold's date null

The weak spot is NONE-sufficiency distractors. The extraction prompt asks for them explicitly ("easy to confuse with the field"), yet half were skipped.

---

## 5. Fairness of the self-assessing baseline (analysis only; nothing changed)

Every lost self-assess ACT traces back to a convention that **is in LABELING_GUIDE.md but not in the shared `FIELD_DEFINITIONS`**, which all three systems receive.

The shared text even says time is "null if not stated or unclear", while the guide says "at 2" in business context = 14:00. That gap plausibly also caused **Grounded's** 006 time drop. So the missing conventions affected both architectures, not only the baseline.

### A: task or answer definitions every system should know
These determine what the correct value or the correct action *is* under this benchmark.

| Convention (guide) | In shared definitions? | Run 1 effect |
|---|---|---|
| "At N" in business context → afternoon/24h time; null only if genuinely unclear (§2.3) | No (says "null if … unclear") | Self-assess 002, 006, 013 REVIEWed over AM/PM; Grounded nulled 006's time |
| "The Nth" → current or next month, whichever is in the future (§2.3) | No | Self-assess 018 REVIEWed |
| "Next <weekday>" is ambiguous → date null; weekday/date contradiction → date null (§2.3) | Only "unambiguously" | 024/029 wrong-value reviews (self-assess); 029 unsafe write (Grounded) |
| A date without a time is a complete meeting; timezone is optional (§2.3, §4) | No | Self-assess 001 REVIEWed |
| A first name alone is a valid decision-maker value (§2.2) | No | Self-assess 017 REVIEWed |
| Budget components → derived total; components aren't candidates (§2.1 v1.2) | No | Grounded 015 wrong-value review |
| Meeting candidate needs agreement or a specific proposal (§2.3 v1.2) | No | 025, both systems |
| When no final approver is identified, a lesser-role stakeholder is a reviewable candidate (§2.2, §4) | Partly: self-assess v2 says lesser roles aren't final authority, but not that they're worth reviewing | Self-assess dropped 4 INDIRECT decision makers (judgment call, see below) |

### B: architectural capabilities Grounded may legitimately keep
- Deterministic quote grounding and speaker checks.
- (Proposed) deterministic structured-value validation (§6).
- The status/certainty/sufficiency decomposition and the separate classification call.
- The deterministic policy table, reason codes, and reconciliation/outranking mechanics.

The comparison is meant to test exactly these.

### Recommendation
1. **Shared definitions.** Add the A-conventions about *value representation* to the shared `FIELD_DEFINITIONS`: business-hours times, "the Nth" resolution, "next <weekday>" and contradictions → null, components → total, what makes a meeting candidate, first name valid. Apply identically to **all three** systems, the naive baseline included, because these define values, not safety.
2. **Self-assess rubric.** Add the A-conventions about *completeness for writing* (a date without time is complete; timezone optional; first name sufficient) to the self-assess AUTO definition. This extends D9, which already gives it the high-level ACT definition. Grounded gets these implicitly from its policy table, and naive writes everything anyway.
3. **Judgment call for you:** whether to tell self-assess that lesser-role stakeholders are REVIEW candidates when no final approver is identified. It is part of the rubric (gold ASK), but it edges toward handing over Grounded's decision logic. I lean towards including a neutral phrasing.
4. **Hand over nothing from list B.**
5. **Process.** All of this is post-hoc, so record it as post-Run-1 specification alignment and rerun **all three** systems under scoring v2 (Run 2), keeping Run 1 as history. If you want attributable results, make the shared-definition alignment one run (Run 2a, all systems) and Grounded v3 a separate run (Run 2b, §6). That way the source of any improvement is clear.
6. **Expected effect.** Self-assess's coverage gap is likely to narrow. That isn't a problem: it means the comparison measures architecture rather than unequal information.

---

## 6. Proposed Grounded v3: deterministic structured-value validation (not implemented)

**Gap.** Grounding proves the quote exists. Nothing proves the *normalized value* agrees with the quote. In dev-gen-029, "Tuesday the 22nd" was normalized to 2026-04-22, a Wednesday, and the policy trusted it.

### Pipeline position
```
Call 1 extract → grounding → VALUE VALIDATION (new, deterministic) → Call 2 classify → policy
```
- Validation needs only the claim value, its **grounded** evidence quotes, and the call date.
- It runs on grounded claims (ungrounded ones ABSTAIN anyway).
- It adds no LLM call.
- It uses the evidence quotes, not the model-written `asStated`, as the source of truth, because `asStated` is itself model output.

### What gets validated (meetings: v3 scope)
Each check runs only when the relevant token appears in the evidence quotes.

| # | Invariant | Fails when |
|---|---|---|
| M0 | A non-null date is supported by some temporal expression | No weekday, day ordinal, month+day, "today/tomorrow" anywhere in the evidence |
| M1 | Future | date ≤ call date |
| M2 | Weekday agreement | the evidence names weekday(s) and the date's weekday isn't one of them |
| M3 | Day-of-month agreement | the evidence names an ordinal ("the 22nd") and the date's day isn't one of them |
| M4 | Month agreement | the evidence names a month and the date's month differs |
| M5 | Ambiguity rule | the evidence says "next <weekday>" without disambiguation, but the date is non-null (guide §2.3) |
| T1 | Time support | the time is non-null but no hour expression in the evidence (digits, "one"…"twelve", "noon") has the same hour mod 12 |
| T2 | Meridiem agreement | the evidence says am/a.m. and hour ≥ 12, or pm and hour < 12 |

### On failure
- Do **not** re-resolve the value in code. That would mean code doing language understanding.
- Do **not** call the model again.
- Instead, **null the unverifiable component**: the date for M0–M5, the time for T1–T2. Keep the original extracted value and the failed invariants in the trace.
- Add policy reason `VALUE_UNVERIFIED`, which caps the claim at ASK. For 029: date → null, then ASK, which is what the guide prescribes for a contradiction.

**Safety property (testable).** Validation can only make a value *less* specific and a decision *less* autonomous: ACT→ASK, never ASK→ACT, never adding information.

**How it generalizes.** It catches any normalization error that contradicts the quoted words (weekday, ordinal, month, meridiem, unsupported time, past date). It does **not** catch errors the words can't reveal, such as the wrong week when only "Thursday" was said and the resolution rule was misapplied. M2 plus the "first such weekday after the call" rule can be extended to that case if wanted.

### Other fields (not in minimal v3)
- **Decision maker:** a cheap, general check that every name in the value appears in the transcript. It would catch hallucinated people. A reasonable v3.1.
- **Budget:** checking the number against the evidence is brittle for spoken numbers ("one-fifteen", "a hundred and eighty"), so false failures would cost coverage. Defer. A currency-symbol check (€/£/"euros" vs ISO code) is cheap and safe if wanted.
- **Reconciliation (optional, separate):** break "latest stated" ties within one turn by the quote's character offset instead of array order. Component labeling (§2) removes 015's trigger, but genuine same-turn competitors would still be ordered arbitrarily.

### Tests v3 needs
- A validator table test for each invariant, pass and fail. For example:
  - "Tuesday the 22nd" vs a Wednesday → fail
  - "Wednesday the 22nd" → pass
  - "Tuesday at 10… no, Wednesday at 2" with Wednesday → pass
  - "next Thursday" with a date → fail
  - "ten a.m." → 10:00 pass, 22:00 fail
  - "at 2" → 14:00 pass, 15:00 fail
  - a past date → fail
  - no temporal token with a date → fail
- **Monotonicity:** across generated inputs, the validated decision is never more autonomous and the validated value never more specific than without validation.
- **Pipeline integration** with a scripted LLM: a contradictory extracted date gives field ASK with date null and `VALUE_UNVERIFIED`; a consistent one is unaffected.
- **No false failures on gold:** every gold meeting value in examples and dev passes validation with its gold evidence. These are gold labels, not model outputs, but don't tune the validator's token rules to make specific dev cases pass. Write the rules from the guide first.

---

## 7. Exactly what changed after Run 1

| Change | Files | Affects Run 1 artifacts? |
|---|---|---|
| Scoring v2: exact meeting time; `scoringVersion` recorded in new runs; report shows it | `src/core/values.ts` (`scoringValuesEqual`, `compareForScoring`), `src/core/scoring.ts` (`SCORING_VERSION`), `src/core/schemas.ts` (optional `scoringVersion`), `src/eval/runner.ts`, `src/eval/report.ts` | No: stored items and metrics untouched |
| Guide v1.2: component budgets (§2.1), meeting-candidate rule (§2.3/§3.4), scoring exact match (§5), two §8 rows, changelog | `LABELING_GUIDE.md` | No label changes |
| SPEC: scoring v2 + signal-recall diagnostic | `SPEC.md` §9 | — |
| Decisions D16–D19 | `DECISIONS.md` | — |
| Signal-recall diagnostic | `src/eval/signalRecall.ts`, `scripts/signal-recall.ts`, `npm run signal-recall` | Read-only over Run 1 |
| Tests (+12): scoring v2, policy equality unchanged, signal recall, historical run files still parse | `tests/values.test.ts`, `tests/scoring.test.ts`, `tests/signalRecall.test.ts` | — |

**Not changed:** prompts, policy (`default-v2`), model config, frozen dev cases, test split, Run 1 raw files, `DEV_RUN1_ANALYSIS.md`.

### Counterfactual: Run 1 rescored under scoring v2

This is computed in memory from the stored outputs. It is not a new run and doesn't replace the historical results.

| System | ACT precision | Coverage | Unsafe writes | Wrong-value writes |
|---|---|---|---|---|
| Naive | 31/41 (75.6%), unchanged | 31/31, unchanged | 10/59, unchanged | 0, unchanged |
| Self-assess | 25/25 (100%), unchanged | 25/31 (80.6%), unchanged | 0/59, unchanged | 0, unchanged |
| Grounded | 31/32 → **30/32 (93.8%)** | 31/31 → **30/31 (96.8%)** | 1/59, unchanged | 0 → **1** |

The only changed item is dev-gen-006 nextMeeting, Grounded: CORRECT_ACT → WRONG_VALUE_ACT. No Run 1 prediction invented a time where gold had none.

Guide v1.2's semantic clarifications (§2, §3) change no gold labels, so they have no counterfactual effect on scores.
