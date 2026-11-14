# DEV Run 2a analysis (fair specification alignment)

> Synthetic, Claude-generated dev benchmark (30 transcripts, 90 field-items). **One run per system.** Nothing here describes real sales conversations.
> Analysis only: no code, prompt, policy, benchmark, scoring or run file was changed, and no model was called. Comparisons with Run 1 use **Run 1 rescored under scoring v2** (POST_RUN1_DECISIONS.md §7), not Run 1's historical v1 headline.

## Runs

| System | Run file | Version | Prompt hash(es) |
|---|---|---|---|
| baseline-naive | `2026-11-14T17-58-07-508Z_baseline-naive_dev.json` | v2 | `0c85a4c4af3a9e75` |
| baseline-self-assess | `2026-11-14T17-58-40-036Z_baseline-self-assess_dev.json` | v3 | `10e0f80b92c3d685` |
| grounded | `2026-11-14T17-59-27-378Z_grounded_dev.json` | v2.1, policy `default-v2` | `a1184542278c3360` / `0565ba90032f9826` |

- All three runs: `claude-sonnet-5-5` (requested and reported), effort `medium`, `scoringVersion: v2`, `benchmarkFrozen: true`. Every run's case hashes equal `FROZEN.json`.
- No errors and no retries. All runs were made after prep commit `7d1fc66`.

---

## 1. Verification

Every number below was recomputed independently in Python from the stored field decisions, using a separate implementation of scoring v2. It agrees with the stored per-item outcomes on **270/270** items and with every expected CLI headline. **No discrepancies.**

| | Naive v2 | Self-assess v3 | Grounded v2.1 |
|---|---|---|---|
| ACT precision | 31/46 (67.4%) | 31/33 (93.9%) | 31/33 (93.9%) |
| Coverage | 31/31 | 31/31 | 31/31 |
| Unsafe writes | 15/59 (25.4%) | 2/59 (3.4%) | 2/59 (3.4%) |
| Wrong-value writes | 0 | 0 | 0 |
| Review (ASK) | 0 | 21 (all correct) | 21 (20 correct, 1 wrong value) |
| Abstain / NO_OP | 44 / 0 | 30 / 6 | 28 / 8 |
| Missed ASK | 9 | 1 | 1 |
| Errors | 0 | 0 | 0 |

---

## 2. All unsafe writes

### Naive (15)
All 15 have the **correct value** on gold-ASK items. The naive baseline has no review path, so every rubric-ASK item it proposes becomes a write.

| Case · field | Wrote | Why unsafe |
|---|---|---|
| 010 · meeting | 03-19 15:00 | Hedged acceptance ("should work… I'll confirm") |
| 011 · decisionMaker | James | "Run it by James", not final authority |
| 011 · meeting | date null | "Sometime next week": no date |
| 013 · budget | 65K | Overwrites CRM 50K |
| 015 · budget | 50K | Derived total (INDIRECT) |
| 015 · meeting | date null 14:00 | "Pencil in… I'll confirm", with no date written |
| 016 · decisionMaker | Angela Wu | Overwrites CRM Tom Reyes |
| 020 · meeting | 04-03 15:00 | Overwrites CRM meeting |
| 022 · meeting | date null | "Aim for early next month" |
| 024 · decisionMaker | Maria Lopez + Ken Ito | Overwrites CRM Ken Ito |
| 024 · meeting | date null 11:00 | Ambiguous "next Thursday" |
| 025 · decisionMaker | Rachel Kim | Overwrites CRM Alan Brooks |
| 026 · budget | 180K | Conditional on a future funds release |
| 029 · meeting | **2026-04-21** 13:00 | Contradictory "Tuesday the 22nd"; it picked the Tuesday (21st) |
| 030 · budget | 95K | Overwrites CRM 120K |

Grouped:
- **Overwrites of an existing CRM value:** 6
- **Undated or ambiguous meetings:** 4 (011, 015, 022, 024)
- **Tentative or conditional:** 2 (010, 026)
- **INDIRECT values:** 2 (011 decision maker, 015 budget)
- **Contradictory date resolved arbitrarily:** 1 (029)

### Self-assess (2)

| Case · field | Gold | Wrote | Why unsafe |
|---|---|---|---|
| 024 · decisionMaker | ASK Maria Lopez + Ken Ito (CRM: Ken Ito) | AUTO, same value | Overwrites an existing CRM value. Its own reason admits it: "This replaces the CRM entry that listed only Ken Ito, but the customer corrected it directly". That contradicts its prompt ("does not replace a different value already in the CRM"). |
| 029 · meeting | ASK date null 13:00 | AUTO **2026-04-22** 13:00 | "April 22, 2026 is a Tuesday, so weekday and date agree." **False:** it's a Wednesday. |

### Grounded (2), traced

**dev-gen-029 · nextMeeting**
- Transcript: Anika: "Let's do Tuesday the 22nd at 1." Hugo: "Great, Tuesday the 22nd at 1 it is." The call is on 2026-04-16, a Thursday.
- Gold: **ASK**, date null, 13:00. A weekday/date contradiction makes the date null.

| Stage | Result | Correct? |
|---|---|---|
| Extraction | `{date: "2026-04-22", time: "13:00"}` from t3, t4, t5 | **No.** The date contradicts the quoted weekday, and the shared definition now says such a contradiction → null. |
| Evidence | Exact quotes, correct speakers, grounded, customer evidence present | Yes |
| Classification | CURRENT / EXPLICIT / DIRECT. Explanation: "*April 22, 2026 is a Tuesday*, and 1 reads as 13:00" | The labels match gold, but the explanation repeats the same false calendar fact |
| Reconciliation | Single claim | Yes |
| Policy | ACT `[SUPPORTED]` (date non-null, so no `UNDERSPECIFIED_VALUE`) | Yes, given its inputs |

**Root cause: EXTRACTION** (value normalization: a calendar-arithmetic error), the same as Run 1.

**dev-gen-015 · budget**
- Transcript: "We've got forty approved for the licenses, and another ten approved for implementation services."
- Gold: **ASK** 50K, CURRENT / EXPLICIT / **INDIRECT** (guide §2.1: a derived total is INDIRECT).

| Stage | Result | Correct? |
|---|---|---|
| Extraction | A single candidate, 50K (the derived total). No separate component candidates. | Yes. This is the v1.2 component rule working (Run 1 extracted 40K, 10K and 50K). |
| Evidence | Exact quote of t2 | Yes |
| Classification | CURRENT / EXPLICIT / **DIRECT**: "states approved components… which sum to 50K… asserts them plainly as approved" | **No:** gold sufficiency is INDIRECT |
| Reconciliation | Single claim, no conflict | Yes |
| Policy | ACT `[SUPPORTED]` | Yes, given its inputs |

**Root cause: CLASSIFICATION.**

Contributing: specification communication. The shared definitions now say "the budget is their sum" as a plain statement. Neither they nor the classifier prompt say that a *derived* total is INDIRECT; that rule is only in LABELING_GUIDE §2.1.

So the Run 2a alignment fixed the component conflict but exposed a sufficiency gap. In Run 1, the separate component claims (the old failure) happened to keep this field at ASK.

---

## 3. Self-assess vs Grounded, item by item

Identical headlines, but **not identical decisions.**

| Group | Count | Items |
|---|---|---|
| **A.** Both correct, same behaviour | 82 | — |
| **B.** Both correct, different safe behaviour | 2 | 008 meeting, 027 meeting (gold NO_OP): Grounded NO_OP, self-assess returned null (ABSTAIN). The CRM is unchanged either way. |
| **C.** Grounded correct, self-assess wrong | 2 | **024 decisionMaker:** self-assess made an unsafe AUTO overwrite; Grounded ASKed through the deterministic `CONFLICTS_WITH_EXISTING` rule. **022 decisionMaker:** self-assess dropped Aaron Webb (budget owner); Grounded ASKed. |
| **D.** Self-assess correct, Grounded wrong | 3 | **015 budget:** self-assess REVIEWed 50K; Grounded made an unsafe ACT. **015 meeting:** self-assess REVIEWed 03-31 14:00; Grounded ASKed with date null (wrong value, safe). **028 decisionMaker:** self-assess REVIEWed Grace Liu; Grounded extracted no candidate (missed ASK). |
| **E.** Both wrong, same way | 1 | **029 meeting:** both made an unsafe ACT of 2026-04-22, each asserting it is a Tuesday |
| **F.** Both wrong, differently | 0 | — |

**The two unsafe writes each.**
- They share **029**: the same model error, made independently.
- Each has one the other avoided:
  - **Grounded** avoided 024 through its deterministic no-overwrite rule, an architectural feature working as intended.
  - **Self-assess** avoided 015 because it judged the derived sum worth reviewing. Grounded's classifier didn't.
- On review quality, self-assess was slightly better: 21/21 correct vs 20/21.

---

## 4. dev-gen-029: "Tuesday the 22nd at 1" (the 22nd is a Wednesday)

| System | Run 1 | Run 2a |
|---|---|---|
| Naive | ACT, date null (unsafe: undated) | ACT **2026-04-21** (resolved to the Tuesday; unsafe) |
| Self-assess | REVIEW 2026-04-22, reason: "April 22, 2026 is actually a Wednesday, so the weekday and date conflict" (wrong value, safe) | **AUTO** 2026-04-22, reason: "April 22, 2026 is a Tuesday, so weekday and date agree" (unsafe) |
| Grounded | Extracted 04-22 → CURRENT/EXPLICIT/DIRECT → ACT (unsafe) | Extracted 04-22 → CURRENT/EXPLICIT/DIRECT ("April 22, 2026 is a Tuesday") → ACT (unsafe) |

**The updated shared definition did not fix it.** "If a stated weekday and day of the month contradict each other, use date null" can only work if the model correctly sees that they contradict.
- In Run 2a, both systems that wrote 04-22 asserted the false calendar fact.
- Naive applied neither rule and picked the weekday.
- Self-assess got the calendar right in Run 1 and wrong in Run 2a. The same model, given almost the same input, gives inconsistent calendar facts. Day-of-week arithmetic is unreliable in this model's free-text reasoning, and a prompt rule doesn't change that.

---

## 5. dev-gen-006: meeting time

| | Grounded extracted | Scoring v2 outcome |
|---|---|---|
| Run 1 | 2026-03-19, **time null** | WRONG_VALUE_ACT (it was CORRECT_ACT under v1) |
| Run 2a | 2026-03-19 **16:00** | **CORRECT_ACT** |

The time is now preserved. "At 4" was resolved with the new business-hours rule, which is consistent with the Run 1 cause: the old definition said "null if … unclear". Self-assess also wrote 16:00, and now AUTO.

---

## 6. What changed from Run 1 (v2-rescored) to Run 2a

Attributions are hypotheses from a single run. "Likely" means the change matches the direction and content of a specific prompt change; it doesn't rule out sampling variation.

### Naive: 6 field-items changed (precision 31/41 → 31/46, unsafe 10 → 15)

| Item | Run 1 → Run 2a | Attribution |
|---|---|---|
| 010 meeting, 015 meeting, 022 meeting | missed ASK → **unsafe ACT** | **Likely shared rules.** The new meeting-candidate definition explicitly counts pending proposals and vague-but-agreed meetings as meetings, so naive now proposes them, and with no review path, writes them. |
| 011 decisionMaker (James, "run it by") | missed ASK → unsafe ACT | Unclear or stochastic. The new definition says lesser roles aren't final authority, which points the other way. |
| 026 budget (conditional 180K) | missed ASK → unsafe ACT | Stochastic. No relevant budget rule changed. |
| 029 meeting | unsafe (date null) → unsafe (04-21) | Stochastic. Neither run followed the contradiction rule. |

Equal information made naive *less* safe. Telling an extractor what counts as a candidate, without a trust decision, turns more candidates into writes.

### Self-assess: 15 changed (coverage 25/31 → 31/31, unsafe 0 → 2, missed ASK 4 → 1)

| Item | Change | Attribution |
|---|---|---|
| 001, 002, 006, 013, 018 meetings; 017 decisionMaker | downgraded to ASK → **correct ACT** | **Likely alignment.** Each matches the doubt it gave in Run 1 (§7). |
| 009, 019, 028 decisionMaker | missed ASK → **correct ASK** | **Likely AUTO/REVIEW guidance** (lesser-role stakeholders → review). 022 is still missed. |
| 024 meeting ("next Thursday") | wrong-value ASK → **correct ASK** (date null) | **Likely shared rule** |
| 025 meeting | unnecessary ASK → **correct ABSTAIN** | **Likely shared rule plus guidance** (availability and promises to find times aren't meetings) |
| 024 decisionMaker | correct ASK → **unsafe ACT** (overwrite) | **Unclear.** The prompt's no-overwrite clause didn't change. Possibly stochastic; possibly the new completeness wording made it more willing to AUTO. |
| 029 meeting | wrong-value ASK → **unsafe ACT** | **Stochastic calendar error** (it now claims Tuesday). The business-hours rule plausibly removed its *other* Run 1 doubt (AM/PM), which had kept it at REVIEW. |
| 006 decisionMaker, 008 meeting | ABSTAIN ↔ NO_OP | Stochastic, no score effect |

### Grounded: 5 changed (precision 30/32 → 31/33, coverage 30/31 → 31/31, unsafe 1 → 2)

| Item | Change | Attribution |
|---|---|---|
| 006 meeting | wrong-value ACT (time dropped) → **correct ACT** | **Likely shared rule** (business hours) |
| 025 meeting | unnecessary ASK → **correct ABSTAIN** (no candidate extracted) | **Likely shared rule** ("not meetings" list), at the cost of signal recall (§9) |
| 015 budget | wrong-value ASK (40K) → **unsafe ACT** (50K, DIRECT) | **Likely shared rule plus a classification gap** (§2) |
| 015 meeting | correct ASK (03-31) → **wrong-value ASK** (date null) | Unclear. "Tuesday" said on a Tuesday call is resolvable under the stated rule, and self-assess resolved it correctly. Possibly over-applying "date null whenever…". Safe. |
| 028 decisionMaker | correct ASK → **missed ASK** (no candidate) | Most likely stochastic. Other lesser-role decision makers (Sarah, James, Anil, Greg, Aaron) were still extracted. |

---

## 7. Self-assess coverage: the six previously lost ACTs

| Item | Run 1 doubt (its own reason) | Run 2a |
|---|---|---|
| 001 meeting | time not set, invite pending | **AUTO**, correct (2026-03-05, no time) |
| 002 meeting | AM/PM and timezone | **AUTO**, correct (11:00) |
| 006 meeting | AM/PM and timezone | **AUTO**, correct (16:00) |
| 013 meeting | "1" could be AM or PM | **AUTO**, correct (13:00) |
| 018 meeting | "the 24th" ambiguous | **AUTO**, correct (04-24 10:00) |
| 017 decisionMaker | first name only | **AUTO**, correct (Mike) |

**6/6 recovered**, and each recovery matches the specific convention that was added. This strongly supports the hypothesis that Grounded's Run 1 coverage advantage came from **unequal task specification**, not architecture. It's still a single run, but the item-level correspondence is exact.

---

## 8. Is Grounded v3 justified? (not implemented)

I prototyped the proposed meeting invariants (M0–M5, T1–T2 from POST_RUN1_DECISIONS §6) as a throwaway analysis in `/tmp`, outside the repo. I applied them to every meeting candidate in Grounded's Run 2a trace and to every gold meeting value, using the guide-derived rules with no tuning.

- **Would it prevent Grounded's unsafe writes?**
  - **029: yes.** M2 fails ("weekday wednesday not in [tuesday]"), so the date is nulled, `VALUE_UNVERIFIED` applies and the field becomes ASK. It would also have caught Run 1's identical failure.
  - **015 budget: no.** That's a budget sufficiency error, outside the validator's scope.
- **Would it make correct decisions less autonomous?** No, in this prototype. All 22 of Grounded's other meeting candidates pass, including every correct ACT and NO_OP, and all non-ABSTAIN gold meeting values pass with their gold evidence. Caveat: these transcripts are clean synthetic speech. Real ASR text, spelled-out dates or unusual phrasing could cause false failures. Those would be *safe* (ACT→ASK) but would cost coverage.
- **Does Run 2a strengthen or weaken the case?** It **strengthens the principle and weakens any claim of a metric advantage.**
  - *Stronger:* the calendar error recurred, in **both** model-based systems. It survived an explicit prompt rule, and the model stated a false fact with confidence. Checking that a resolved date matches a stated weekday is exactly what deterministic code does reliably and a model doesn't. That's a legitimate architectural capability (category B).
  - *Weaker:* it affects one dev item, and Grounded is currently tied with self-assess. v3 would add about one item of safety on this set. Present it as removing a failure class, not as making Grounded "win".
- **More important failure modes?** Comparable ones, each n=1:
  1. **Derived-total sufficiency (015 budget)** is also an unsafe write. It's a semantic/specification issue (the classifier isn't told a derived total is INDIRECT) and the validator won't touch it. Whether a derived total *should* require review is itself a rubric question for you; an approved 40 plus an approved 10 is arguably an approved 50.
  2. **Extraction recall for decision-relevant candidates** (028 decision maker lost → missed ASK).
  3. **Contextual-signal recall** (§9). This isn't a safety failure, but the PRD requires preserving it.

  Self-assess's 024 overwrite is the clearest evidence *for* Grounded's existing deterministic policy, not for v3.

---

## 9. Signal recall (Grounded diagnostic)

These figures match the diagnostic output you supplied and my own recomputation from the saved trace.

| | Run 1 (v2) | Run 2a (v2.1) |
|---|---|---|
| Overall | 67/71 (94.4%) | **63/71 (88.7%)** |
| NONE-sufficiency (deliberate distractors) | 3/6 | **1/6** |
| Gold-ABSTAIN signals | 5/8 | **3/8** |
| By action: ACT · ASK · NO_OP | 31/31 · 23/24 · 8/8 | 31/31 · 21/24 · 8/8 |
| By field: budget · decisionMaker · nextMeeting | 26/27 · 22/22 · 19/22 | 25/27 · 21/22 · 17/22 |

Missed in both runs: 014 budget, 014 meeting, 019 meeting, 029 meeting.

**Changed signals (all four were recalled in Run 1, missed in Run 2a):**

| Signal | Kind | What happened | Likely cause |
|---|---|---|---|
| 025 meeting ("out until the 15th") | contextual (NONE) | No candidate | **Plausibly specification:** the new definition lists exactly this ("availability constraints, promises to… ask about times") under "Not meetings" |
| 028 budget (seller's quote 85K) | contextual (NONE) | No candidate | **Stochastic:** "Not budget: the seller's price" was already in Run 1's definition |
| 028 decisionMaker (Grace Liu, security) | CRM-state (gold ASK) | No candidate | **Stochastic** (other INDIRECT decision makers retained) |
| 015 meeting ("Tuesday at 2") | CRM-state (gold ASK) | Candidate present, but date nulled, so not the same fact | Normalization variation (§6); not really a lost signal |

There's **no general collapse** in contextual extraction:
- Grounded produced **17 NONE-sufficiency candidates in both runs**. It still extracts plenty of distractors, just not the specific *labeled* ones.
- Total candidates went from 93 to 88.

**The measurement is small.** Contextual recall rests on **8 labeled items**, so 5/8 → 3/8 is two items. Run-to-run variance is unmeasured. Only 025 has a plausible specification cause.

### A. CRM-state extraction vs B. contextual-signal extraction

| | Run 1 | Run 2a |
|---|---|---|
| **A. CRM-state** (gold ACT/ASK/NO_OP values) | 62/63 (98.4%) | 60/63 (95.2%) |
| **B. Contextual** (gold ABSTAIN values: NONE/historical/negated) | 5/8 (62.5%) | 3/8 (37.5%) |

These are different objectives inside one extraction call:
- **A** rewards *precision of representation*: the right value, normalized exactly, with no false candidates.
- **B** rewards *breadth*: listing things that are explicitly *not* field values, so that later stages can label and preserve them.

The extraction prompt asks for B ("values… easy to confuse with the field"). The shared definitions, which that same prompt includes, now spell out in more detail what is **not** a meeting or budget. A model reading "availability constraints… are not meetings" has a reasonable incentive *not* to list one as a meeting candidate. The 025 change is consistent with that tension, though one item proves nothing.

Should one extraction stage optimize both? It can do both to a degree. But making representation rules more precise is likely to shift its trade-off silently, and the headline metrics can't see a loss in B, because a missing NONE candidate still yields the correct ABSTAIN. Any architectural response is out of scope here. The measurement implication isn't: **B can't be evaluated meaningfully on 8 labeled items.** If it matters, the benchmark needs more recorded contextual signals per case, which means a future benchmark version, not the frozen dev split.

---

## 10. Cost (saved usage metadata)

| | Calls | Input tokens | Output tokens | Summed call time |
|---|---|---|---|---|
| Self-assess v3 | 30 | 120,784 | 9,322 | 90 s |
| Grounded v2.1 | 59 | 217,232 | 21,010 | 190 s |
| **Grounded / self-assess** | **≈2.0×** | **≈1.80×** | **≈2.25×** | **≈2.1×** |

- **Approximate cost:** at `claude-sonnet-5-5` list prices ($2 / $10 per MTok input/output, per the SDK reference table), self-assess ≈ **$0.34** and Grounded ≈ **$0.64** for 30 transcripts, so **≈1.9×**. These are estimates from token counts, not billed amounts.
- **What the extra cost buys on this run:** Grounded is correct on 2 items where self-assess isn't, and self-assess on 3 where Grounded isn't. On *this* dev run, the extra cost bought no net improvement.

---

## 11. Conclusions

**1. What Run 2a established.**
- Equal specification **closed self-assess's coverage gap completely** (25/31 → 31/31). Each recovered item matches the specific convention added.
- The shared rules fixed Grounded's dropped 006 time, and both systems' 025 over-review.
- The rules **did not** fix 029: the weekday/date contradiction requires calendar facts the model gets wrong.
- Naive got *less* safe (10 → 15 unsafe): equal information without a trust mechanism produces more writes.
- No system wrote a wrong value on a gold-ACT item.

**2. Does Grounded currently outperform self-assess?** **No.**
- The headlines are identical (31/33 precision, 31/31 coverage, 2 unsafe, 21 reviews).
- Item-level: 2 items favour Grounded, 3 favour self-assess, and 1 shared failure.
- Grounded costs about 1.9× as much.

**3. Did the Run 1 coverage advantage survive alignment?** **No.** It came from unequal task specification.

**4. Remaining Grounded failure modes (exact).**
- **(a) Calendar arithmetic in date normalization:** 029, unsafe, EXTRACTION. Recurring.
- **(b) Derived-total sufficiency labeled DIRECT:** 015 budget, unsafe, CLASSIFICATION, with a specification-communication contributor.
- **(c) A lost decision-relevant candidate:** 028 decision maker, missed ASK, EXTRACTION recall.
- **(d) Over-nulling a resolvable date:** 015 meeting, wrong-value ASK, safe.
- **(e) Low contextual-signal recall:** 3/8. Diagnostic only.

**5. Is Grounded v3 justified?**
- **Yes, as a minimal, general safety invariant.** It isn't a metric lever. The calendar-normalization failure recurred across runs and across both model-based systems, survived an explicit prompt rule, and is exactly the kind of check deterministic code performs reliably. The prototype catches it with no false failures on this set. It legitimately belongs to Grounded's architecture.
- **Expect about one dev item of improvement.** v3 would not address (b)–(e). Unsafe write (b) needs a decision first, a rubric/specification one: should a derived total require review, and should the classifier be told?

**6. What not to conclude from one stochastic dev run.**
- That Grounded and self-assess are equivalent, or that either is better. They differ on 5 items, and each item is about 1.7 points of unsafe-write rate.
- That any single flip is caused by the prompt changes. Self-assess's 029 regression and 024 overwrite, and Grounded's 028 loss, may be sampling noise.
- That signal recall dropped meaningfully: it's 2 of 8 items.
- That results transfer to real conversations or to the held-out test split. The dev set is synthetic, written by the same model family, and has been looked at repeatedly.

**7. Recommended next experiment.**
- **Measure variance before changing anything.** Rerun the exact Run 2a configuration two more times for all three systems on dev: same commit, no changes. That gives three runs per system.
- Report per-item stability: which decisions flip between runs, and whether 029, 015, 024 and 028 are consistent failures or noise.
- Only then run **Run 2b**: Grounded v3 (validator only, everything else identical to v2.1), also 3 runs, compared item by item with the 2a runs.
- Separately, decide the **derived-total rubric question** before any change to the classifier prompt, and record any change as post-run specification alignment.
- Estimated cost of the variance runs: about 2 × (naive + self-assess + Grounded) ≈ 2 × $1.2 ≈ $2.40 at list prices. This is an estimate, not a measurement.
