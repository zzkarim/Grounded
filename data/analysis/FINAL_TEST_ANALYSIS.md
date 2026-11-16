# Final held-out TEST analysis

> **Scope.** Post-hoc analysis of the single final evaluation on the frozen held-out TEST benchmark (`benchmark-test-v1`, frozen 2026-11-15T22:32Z before any TEST prediction existed).
> Results committed in `7402e1c`. No component was modified, no model was called, and nothing was rerun for this analysis.
> The benchmark is **synthetic** (60 Claude-generated transcripts, owner-reviewed), so none of this describes performance on real sales calls.

## Executive summary

| | ACT precision | ACT coverage | Unsafe writes | Wrong-value writes | Reviews (ASK) |
|---|---|---|---|---|---|
| **Naive** v2 | 56/91 (61.5%) | 56/59 (94.9%) | 32/121 (26.4%) | 3 | 0 |
| **Self-assess** v3 | 50/56 (89.3%) | 50/59 (84.7%) | 6/121 (5.0%) | 0 | 53 |
| **Grounded** v3 | **54/59 (91.5%)** | **54/59 (91.5%)** | **4/121 (3.3%)** | 1 | 55 |

- **Naive's problem is writing.** Writing every extracted value is unsafe: it made 32 unsafe writes and never abstained wrongly.
- **Grounded and self-assess are close.** Grounded had 4 more correct writes and 2 fewer unsafe ones, at about **2× the cost** (118 vs 60 calls; about $1.38 vs $0.68 at list-price estimates).
- **Where Grounded gained, and the mechanism:**
  - **Safety, from its deterministic no-overwrite rule.** 4 of self-assess's 6 unsafe writes overwrote an existing CRM value, despite its prompt forbidding that. Grounded had 0 unsafe writes on the 84 existing-CRM items.
  - **The same-day meeting caught by the v3 validator** is the fifth safety item.
  - **Coverage, from budgets.** Self-assess sent 9 correct budgets to review because spoken figures ("sixty-eight") never state "thousand". Grounded's pipeline has no place for that doubt and wrote 6 of them correctly, which is both a gain and a risk (see 039).
- **Grounded's own failures are mostly semantic classification.**
  - All 4 unsafe writes: "has to approve" labeled as final authority (×2), a hedged competing signer labeled INDIRECT, and a derived total labeled DIRECT. The last is the known DEV-015 failure, documented before TEST.
  - All 5 lost ACTs are value-normalization errors: colloquial-thousands scale (×3, shared by all systems) and consistent dates nulled (×2).
- **The difference is not statistically established.** Self-assess and Grounded disagree on 21 items (12 favour Grounded, 9 self-assess; sign test p ≈ 0.66), from one run each on 60 synthetic transcripts. The robust findings are qualitative: a deterministic write policy and value checks remove specific error classes that the one-shot model demonstrably produced (CRM overwrites, a same-day date). Semantic labeling errors remain in either design.

---

## 1. Verification

Every run used the frozen configuration:

| | |
|---|---|
| naive | v2 `0c85a4c4af3a9e75` |
| self-assess | v3 `10e0f80b92c3d685` |
| grounded | v3 `a1184542278c3360` / `0565ba90032f9826`, policy `default-v3`, validator `meeting-v1` |
| model | `claude-sonnet-5-5`, requested and API-reported, effort `medium` |
| scoring | v2 |

- `benchmarkFrozen: true`, and every run's case hashes equal `FROZEN.json`.
- Runs were created 22:43–22:45Z, after the 22:32Z freeze.
- An independent Python re-score (my own implementation of §5 equality and the outcome rules) agrees with the stored outcome on **540/540** items. Every headline count matches the CLI. **No discrepancies.**

| | ACT | ASK | ABSTAIN | NO_OP | Errors |
|---|---|---|---|---|---|
| Naive | 91 | 0 | 89 | 0 | 0 |
| Self-assess | 56 | 53 | 57 | 14 | 0 |
| Grounded | 59 | 55 | 45 | 21 | 0 |

## 2. Confusion breakdown

"(wv)" = correct action, wrong value.

| Gold → | Naive | Self-assess | Grounded |
|---|---|---|---|
| **ACT (59)** | ACT 56 · ACT(wv) 3 | ACT 50 · ASK 7 · ASK(wv) 2 | ACT 54 · ACT(wv) 1 · ASK(wv) 4 |
| **ASK (50)** | ACT 28 · ACT(wv) 4 · ABSTAIN 18 | ASK 39 · ASK(wv) 3 · ACT 5 · ACT(wv) 1 · ABSTAIN 2 | ASK 43 · ASK(wv) 1 · ACT 3 · ACT(wv) 1 · ABSTAIN 2 |
| **ABSTAIN (50)** | ABSTAIN 50 | ABSTAIN 48 · ASK 2 | ABSTAIN 43 · ASK 3 · ASK(wv) 4 |
| **NO_OP (21)** | ABSTAIN 21 (no change, scored correct) | NO_OP 14 · ABSTAIN 7 | NO_OP 21 |

There are no missing outputs. Wrong action vs wrong value:
- **Naive:** 32 wrong-action writes (all gold ASK) and 3 wrong-value writes.
- **Self-assess:** 6 wrong-action writes (all gold ASK), 0 wrong-value writes, and 5 wrong-value reviews.
- **Grounded:** 4 wrong-action writes (all gold ASK), 1 wrong-value write, and 5 wrong-value reviews.

No system ever wrote on a gold-ABSTAIN or gold-NO_OP item.

## 3. Grounded's four unsafe writes

| Case · field | Gold | Grounded | Where it diverged | Primary cause |
|---|---|---|---|---|
| **036 · decisionMaker** | ASK Lars (EXPLICIT/**INDIRECT**) | ACT Lars | "Lars needs to approve the vendor before we go further." Grounded, validated, labeled CURRENT/EXPLICIT/**DIRECT** ("establishes his approval authority"); the policy correctly ACTed on DIRECT | **CLASSIFICATION** |
| **050 · decisionMaker** | ASK Hiroshi Tanaka (INDIRECT) | ACT Hiroshi Tanaka | "Hiroshi Tanaka has to approve anything we buy in legal ops." Labeled DIRECT ("establishes final approval authority") | **CLASSIFICATION** |
| **039 · decisionMaker** | ASK Esther (TENTATIVE/DIRECT; competes with Kwame) | ACT Kwame Asante | Kwame: DIRECT, correct. Esther ("I'm pretty sure Esther signs off on vendor contracts…") was labeled TENTATIVE/**INDIRECT**, so policy v2's outranking set her aside as INDIRECT and Kwame ACTed. Under the gold labels the two DIRECT claims would compete → ASK | **CLASSIFICATION** (reconciliation correct given its inputs) |
| **057 · budget** | ASK 45,000 (derived total → INDIRECT) | ACT 45,000 | Extraction gave the correct derived total; labeled **DIRECT** ("sum to the 45K approved budget"). Known remaining failure, recorded in RUN2B_PLAN.md before TEST (DEV-015) | **CLASSIFICATION** |

For all four:
- Extraction, grounding and validation behaved as designed: correct candidates, valid quotes, and validation verified (not applicable to budget or decision-maker values).
- The policy did exactly what the rubric says, given its inputs.

The common thread is **sufficiency labeling of approval roles and derived values**: "has/needs to approve" read as final authority, and a hedged competing signer read as non-authoritative. Self-assess got 036 and 039 right in action, and 057 safely (as an ASK with a wrong value). Both systems wrote 050.

## 4. Grounded's five lost gold ACTs

| Case · field | Gold | Grounded | Divergence | Correct info in the trace? | Class |
|---|---|---|---|---|---|
| 018 · meeting | 2026-06-10 09:30 | ASK, date null 09:30 | Extractor nulled "Wednesday the 10th", although 2026-06-10 *is* a Wednesday. The classifier even noted "the date value of null is questionable" | No (date never extracted) | Wrong extracted value (over-nulling) |
| 060 · meeting | 2026-08-18 15:00 | ASK, date null 15:00 | Same: "Tuesday the 18th" nulled, although consistent | No | Wrong extracted value (over-nulling) |
| 022 · budget | 75,000 | ASK, USD **75** | "seventy-five, approved" extracted as 75. The classifier flagged unit ambiguity → INDIRECT → ASK | No | Wrong extracted value (scale) |
| 053 · budget | 70,000 | ASK, USD **70** | "seventy" → 70, and the program's "three hundred" → 300 (labeled INDIRECT instead of NONE) → conflicting candidates → ASK | No | Wrong extracted value (scale), plus classification |
| 039 · budget | range 80,000–95,000 | **ACT** USD 80–95 (wrong-value write) | Range extracted without scaling; labeled DIRECT; written | No | Wrong extracted value (scale); *written* |

- **None of these involved grounding, the validator or the policy.** The validator never adds information, so it can't repair a nulled date.
- **Scale errors are shared by all systems:** naive and self-assess also produced "80–95" and "70", and self-assess "45" (057). This is the model's normalization of thousands written as bare words, not a Grounded-specific defect. The systems differ only in what happens next. Self-assess usually reviewed, citing the missing unit; Grounded wrote 039.

## 5. Self-assess vs Grounded, item by item

| Group | n | Items |
|---|---|---|
| **A. Grounded correct, self-assess wrong** | **12** | Coverage: budgets 018, 020, 021, 046, 047, 055 (self REVIEWed over the unspoken unit). Safety: 010 meeting, 022 decision maker, 025 meeting, 047 decision maker (self **overwrote CRM**), 034 meeting (self wrote the same-day date). Missed review: 030 budget (self abstained on a conditional range) |
| **B. Self-assess correct, Grounded wrong** | **9** | Unsafe: 036 decision maker. Lost ACT: 018 and 060 meetings (over-nulled dates). Missed ASK: 050 budget. Unnecessary ASK: 009, 015, 041, 042 meetings (constraints or promises turned into dateless meetings), 044 decision maker |
| **C. Both wrong, same way** | 6 | 050 decision maker (both unsafe ACT), 024 decision maker (both reviewed Corinne, not the latest-stated Ravi), 053 budget (both ASK "70"), 018 decision maker and 029 decision maker (both unnecessary ASK), 036 budget (both missed ASK) |
| **D. Both wrong, differently** | 4 | 022 budget, 039 budget (Grounded wrote "80–95"; self reviewed it), 039 decision maker (Grounded unsafe; self wrong-value review), 057 budget (Grounded unsafe; self wrong-value review) |
| **E. Both correct, different safe behaviour** | 7 | 012, 025, 034 budget; 033 decision maker; 030, 046, 049 meeting. Gold NO_OP: Grounded NO_OP, self returned no change |

### Why +4 correct writes
| | |
|---|---|
| Grounded gained | 6 budgets self-assess reviewed purely over the unit (018, 020, 021, 046, 047, 055) |
| Grounded lost | 2 meetings to over-nulled dates (018, 060) |
| **Net** | **+4** |

The unit doubt is a *convention* question. Guide §2.1 treats "the 100 range" in a thousands context as 100,000, but the shared field definitions don't say that bare spoken numbers mean thousands. So, as in DEV Run 1, a coverage gap traces partly to an unstated convention, not to architecture.

The architectural part is real but double-edged. Grounded's labels have no place for "unit uncertain", so its deterministic policy writes whenever the labels say EXPLICIT/DIRECT. That gives coverage when extraction scales correctly, and a wrong-value write when it doesn't (039).

### Why −2 unsafe writes
| | |
|---|---|
| Self-assess-only unsafe (5) | **4 CRM overwrites** (010, 022, 025, 047). The prompt said AUTO must not replace an existing value; the model's reasons acknowledge the replacement ("…superseding the earlier Wednesday meeting") and write anyway. Plus 034, the same-day date |
| Grounded-only unsafe (3) | 036, 039 decision maker, 057: all classification |
| **Net** | **−2** |

- **The overwrite protection is a genuine architectural benefit.** It's deterministic, doesn't depend on the model following an instruction, and showed up in DEV Run 2a as well (dev-gen-024).
- **034 is a validator benefit**, with a caveat (§6).
- **Grounded's own unsafe writes are stochastic-looking semantic labeling errors** that a one-shot model also makes (050 shared).

## 6. Grounded v3 meeting validator (meeting-v1), held-out

- **Activations:** 2 of 66 meeting candidates.
- **034 (same-day meeting):** evidence "Can we hop on later today at 4?" / "Today at 4 works". The original value was 2026-06-30 16:00, which fails **`DATE_NOT_FUTURE`**, so it became date null 16:00 with `VALUE_UNVERIFIED` + `UNDERSPECIFIED_VALUE` → **ASK** (gold ASK). Without validation, the same claim (CURRENT/EXPLICIT/DIRECT, grounded, empty CRM, non-null date) would have been **ACT → an unsafe write prevented**. Naive and self-assess both wrote 2026-06-30.
- **020 (deadline):** evidence "I'll have feedback for you the day after." The original value was 2026-06-19, which fails `DATE_UNSUPPORTED` → date null. The claim was already NONE → ABSTAIN either way. No outcome effect. Strictly, this is a harmless false positive: the date was derivable from a prior turn the quote didn't include.

| Effect | Count |
|---|---|
| Unsafe writes prevented | **1** (034) |
| Correct ACTs downgraded | **0** |
| Correct ASK/ABSTAIN caused by validation | **1** (034) |
| False positives changing an outcome | **0** (one harmless, on 020) |
| False negatives identifiable from gold | **0** (no written or reviewed meeting date contradicted its evidence) |

- **Contradictions were handled upstream.** The weekday/date contradictions (032, 045) and ambiguous "next <weekday>" cases (028, 055) never reached the validator: Grounded's extractor (and self-assess) already produced date null. Naive wrote all four.
- **Did it generalize beyond DEV-029?** **Partially, and modestly.** The extractor didn't repeat the specific weekday/date failure on TEST, so that invariant had nothing to catch. A *different* invariant, the future date check, prevented one unsafe write, with no correct decision blocked.
- **Caveat:** 034's gold label (date null, ASK) was an owner decision made during TEST review, before evaluation. It coincides with the validator's pre-existing invariant. The decision was reasoned independently (date-only call metadata), but the agreement shouldn't be over-read as independent confirmation.
- **What the validator cannot do:** fix a date or scale error that removed or shrank information (018, 060, 022, 039, 053). It only removes specificity.

## 7. By field

| Field | System | ACT precision | Coverage | Unsafe | Reviews (correct / unnecessary / wrong value) |
|---|---|---|---|---|---|
| budget | Naive | 14/26 | 14/16 | 10/44 | 0 |
| | Self | 7/7 | **7/16** | 0/44 | 27 (17 / 0 / 1) |
| | Grounded | 13/15 | **13/16** | 1/44 | 19 (17 / 0 / 0) |
| decisionMaker | Naive | 21/29 | 21/21 | 8/39 | 0 |
| | Self | 21/24 | 21/21 | 3/39 | 13 (9 / 2 / 2) |
| | Grounded | 21/24 | 21/21 | 3/39 | 14 (10 / 3 / 1) |
| nextMeeting | Naive | 21/36 | 21/22 | 14/38 | 0 |
| | Self | 22/25 | 22/22 | 3/38 | 13 (13 / 0 / 0) |
| | Grounded | 20/20 | 20/22 | **0/38** | 22 (16 / 4 / 0) |

Grounded's advantage is concentrated in:
- **budget coverage:** the unit doubt; one wrong-value write is the price.
- **meeting safety:** CRM-overwrite protection plus the same-day validator.

**Decision makers are a tie** on headline numbers, with different errors on each side. Meeting coverage is slightly worse for Grounded (over-nulled dates), and it made 4 unnecessary meeting reviews.

## 8. By difficulty (descriptive only)

| | Self-assess (precision · coverage · unsafe) | Grounded |
|---|---|---|
| Easy (36 items) | 15/15 · 15/15 · 0 | 15/15 · 15/15 · 0 |
| Moderate (84) | 16/22 · 16/21 · 6 | 19/22 · 19/21 · 3 |
| Hard (60) | 19/19 · 19/23 · **0** | 20/22 · 20/23 · 1 (+1 wrong-value write) |

**The advantage does not grow with difficulty.** The two systems are identical on easy, Grounded is better on moderate (mostly overwrite cases), and mixed on hard: +1 coverage for Grounded, but self-assess had zero unsafe writes there.

## 9. By tag

Items = 3 × cases. Tags overlap, and small n means these describe, not estimate.

| Tag (cases) | Self: precision · coverage · unsafe | Grounded |
|---|---|---|
| existing_value (28) | 13/18 · 13/17 · **5** | 15/15 · 15/17 · **0** |
| multiple_numbers (17) | 16/18 · 16/21 · 2 | 19/21 · 19/21 · 2 |
| multiple_stakeholders (21) | 20/22 · 20/25 · 2 | 22/25 · 22/25 · 2 |
| supersession (15) | 10/13 · 10/12 · 3 | 10/12 · 10/12 · 1 |
| tentative (16) | 12/14 · 12/14 · 2 | 12/16 · 12/14 · 3 |
| conditional (7) | 7/7 · 7/7 · 0 | 7/7 · 7/7 · 0 |
| explicit_but_insufficient (11) | 7/8 · 7/7 · 1 | 7/9 · 7/7 · 2 |
| unconfirmed_rep_statement (8) | 6/6 · 6/7 · 0 | 6/7 · 6/7 · 1 |
| ambiguous_date (6) | 5/6 · 5/6 · 1 | 6/6 · 6/6 · 0 |
| negation (5) | 3/3 · 3/4 · 0 | 4/4 · 4/4 · 0 |
| historical (6) | 4/4 · 4/4 · 0 | 4/6 · 4/4 · 2 |

- **`existing_value` is the one clearly separated category**, and it maps directly to the deterministic no-overwrite rule.
- **Grounded is worse on `explicit_but_insufficient`, `tentative`, `unconfirmed_rep_statement` and `historical`** because of the approval-role classification errors (036, 050) and 057. The case sets overlap heavily.
- **Anecdotes only** (≤4 cases): joint_approval (Grounded 4/4, self 3/4 with one overwrite), pronouns, mid_sentence_correction, messy_speech, filler_words, and the 37 singleton coverage probes.

## 10. Signal recall (diagnostic, Grounded only)

**Overall 139/162 (85.8%).** By group:
- **A. CRM-action candidates (gold ACT/ASK/NO_OP): 125/130 (96.2%).** All 5 misses are value normalization. The candidate *was* extracted, but with the wrong scale (022, 039, 053) or a nulled date (018, 060).
- **B. Contextual or non-write signals (gold ABSTAIN with a recorded value): 14/32 (43.8%).**

| Breakdown | |
|---|---|
| By field | budget 46/54 · decision maker 47/50 · meeting 46/58. Contextual only: budget 5/10 · decision maker 4/7 · meeting 5/15 |
| By status | CURRENT 131/152 · NEGATED 6/6 · HISTORICAL 2/3 · SUPERSEDED 0/1 |
| By sufficiency | DIRECT 125/131 · INDIRECT 8/8 · **NONE 6/23** |
| By certainty | EXPLICIT 113/134 · TENTATIVE 18/20 · CONDITIONAL 8/8 |

**The 23 unrecalled signals, by pattern:**
- **13 distractors with no candidate at all:**
  - deadlines and deliverables (002, 023, 024, 047)
  - internal meetings (006, 031, 044)
  - company revenue and incumbent spend (006, 010, 044)
  - executives with no decision role (006 CEO, 010 CTO, 038 CFO)
- **3 contextual items turned into dateless meeting candidates:** availability constraints or promises (009, 015, 042). These are also three of Grounded's unnecessary ASKs.
- **5 scale errors:** 3 CRM (022, 039, 053) and 2 contextual (029 superseded "80", 056 historical "40").
- **2 over-nulled meeting dates** (018, 060).

**Answers:**
- **Uncertain but useful information is preserved: yes.** All 13 tentative or conditional ASK budgets were extracted and reached review, as were all INDIRECT stakeholders (8/8) and every negated value (6/6).
- **Distractors and context are mostly not preserved.** Only 6/23 NONE-sufficiency signals were extracted. Incumbent spend, revenue, internal dates and senior-but-irrelevant people usually vanish. This doesn't hurt write safety (a missing distractor still yields the correct ABSTAIN), but the PRD's "ABSTAIN must not discard information" goal isn't met for distractors. The extraction step favours CRM-relevant precision over listing context, as already seen on DEV. This is a diagnostic limitation of the frozen system, not grounds to change it.

## 11. Cost (stored usage; prices are estimates)

| | Calls | Input tokens | Output tokens | Per transcript (in / out) | Est. cost* | Summed call time |
|---|---|---|---|---|---|---|
| Naive | 60 | 192,835 | 8,697 | 3,214 / 145 | ≈ $0.47 | 131 s |
| Self-assess | 60 | 241,375 | 19,959 | 4,023 / 333 | ≈ $0.68 | 186 s |
| Grounded | 118 | 440,106 | 50,210 | 7,335 / 837 | ≈ $1.38 | 423 s |
| **Grounded / self** | **1.97×** | **1.82×** | **2.52×** | | **≈ 2.0×** | 2.3× |

*Estimated at the `claude-sonnet-5-5` list price this project has used throughout ($2 / $10 per million input / output tokens). These aren't billed amounts. No retries or errors.

Grounded's two model calls per transcript (59 extraction + 59 classification; one case had no candidates) roughly double the cost. Over these 60 transcripts, the extra ≈$0.70 went with +4 correct writes and −2 unsafe writes relative to self-assess. Most of the safety gain came from deterministic code (the no-overwrite rule and the validator), which needs no second model call.

## 12. Experimental history: DEV → TEST

1. **DEV Run 1.** Grounded appeared to have a coverage advantage over self-assess (31/31 vs 25/31).
2. **Analysis.** All 6 lost self-assess ACTs traced to conventions (business-hours times, "the Nth", first names, date-only meetings) that were in the labeling guide but not in the field definitions the systems received. The advantage was confounded by unequal task specification.
3. **DEV Run 2a**, after fair, symmetric specification alignment. Grounded and self-assess **tied** on every headline metric (31/33 precision, 31/31 coverage, 2 unsafe), with different item-level errors.
4. **Grounded v3.** Added deterministic meeting-value validation from a general invariant found on DEV: a normalized value must not contradict its own evidence. Architecture, prompts and policy were then frozen.
5. **TEST** (built from the specification after the systems were frozen; frozen before evaluation; one run):
   - Grounded: 91.5% precision, 91.5% coverage, 4 unsafe writes.
   - Self-assess: 89.3% precision, 84.7% coverage, 6 unsafe writes.

**What this establishes:** under a frozen, pre-registered protocol, the Grounded architecture performed **at least as well as** a fairly specified one-shot self-assessing baseline. On safety it was not worse, and the two specific error classes it removed (CRM overwrites, a non-future meeting date) are removed by deterministic code, not by luck. Both designs vastly outperform naive extraction-to-write (61.5% precision, 32 unsafe).

**What it does not establish:**
- that Grounded is reliably better than self-assess; the margin is a handful of items from one run
- any effect size that would transfer to real calls
- that the coverage gain is architectural rather than a consequence of an unstated unit convention
- that meeting-v1 materially improves safety beyond one case

## 13. Statistical and methodological cautions

- **Small sample:** 60 synthetic transcripts, 180 field-items, **59 gold ACT opportunities**, 121 non-ACT items. One item moves precision by about 1.7 points and the unsafe rate by about 0.8 points.
- **One stochastic run per system.** Model outputs vary between runs (sampling parameters aren't settable). A DEV repeat of Run 2a exists but isn't analyzed here, and run-to-run variance on TEST is unmeasured. The protocol in SPEC §10 called for 3 runs per system; this analysis covers the single committed run.
- **Differences are within noise.** Self-assess and Grounded disagree on 21 items: 12 favour Grounded and 9 self-assess, a two-sided sign test p ≈ 0.66. Unsafe writes unique to one system are 5 vs 3, p ≈ 0.73. Items within a transcript aren't independent either. These tests are reported as a caution, not as evidence of an effect.
- **Generator and model similarity.** Claude generated the benchmark (and DEV), and the systems run on a Claude model. The language may be unusually tractable for them.
- **Short, mostly two-party transcripts:** median 6 turns; only 7/60 have more than one customer speaker.
- **Thin categories.** 37 state-space categories have exactly one case; they're coverage probes, not subgroups.
- **One gold claim per field.** Distractor handling is only partly scored (signal recall is diagnostic only).
- **In favour of validity:** TEST was built after the systems were frozen, from the specification, without reading DEV content, and frozen before any evaluation. All gold changes before freezing (including three owner decisions) were documented and made without any TEST output. No component changed after the freeze.

## 14. Claims

### Supported
1. Naive extraction-to-write is unsafe: on this benchmark it wrote 32 of 121 non-writable items (26.4%), mostly values that are tentative, conditional, overwrite the CRM, or have no date.
2. Both trust-aware designs cut unsafe writes by roughly 5–8× versus naive (to 6 and 4 of 121) while keeping coverage of 85–92%.
3. A deterministic no-overwrite rule eliminated CRM-overwrite errors: 0 for Grounded vs 4 for the one-shot self-assessing model, which overwrote despite being told not to. The same pattern appeared on DEV.
4. A deterministic structured-value check caught a temporal error (a meeting dated on the call day) that both model-only systems wrote, with no false positive affecting any outcome.
5. Remaining Grounded errors are concentrated in semantic labeling (approval authority, derived totals) and model value normalization (scale of spoken thousands, over-nulled dates). Some of these are shared with the one-shot baseline.
6. Grounded costs about 2× the one-shot baseline in model calls and tokens.

### Unsupported or too strong
- "Grounded is significantly / reliably more accurate than a self-assessing LLM."
- "Grounded's coverage advantage comes from its architecture." It largely reflects an unstated number-unit convention.
- "The validator fixed the DEV failure mode." That failure didn't recur on TEST; the validator's one TEST save came from a different invariant.
- Any specific percentage as an expectation for real CRM automation, or for Ergo's systems.
- Any category-level claim from singleton or small-tag categories.
- "Grounded preserves all context when it abstains." Distractor recall is 6/23.

### Open questions
- Performance on **real sales calls**: ASR errors, crosstalk, long multi-party meetings, domain shorthand.
- **Run-to-run variance**: three or more runs per system on TEST, or a larger benchmark, to tell real differences from noise.
- **Another model family** (and a different generator than evaluator), to rule out generator/model similarity.
- Whether stating number-unit conventions explicitly to all systems would erase the coverage gap, as specification alignment did on DEV.
- Whether a separate context-extraction step improves distractor recall without hurting CRM-value precision.
- **Production costs** a benchmark can't measure: reviewer workload and acceptance of ASKs, the cost of a wrong write vs a review, latency.
- Cross-conversation state (supersession over time), calendar corroboration, and speaker-authority conflicts, which are all out of scope here.

## 15. Final frozen-system conclusion

On a frozen, held-out synthetic benchmark, both trust-aware designs were far safer than naive extraction-to-write. Grounded matched or slightly exceeded a fairly specified one-shot self-assessing model: 91.5% vs 89.3% ACT precision, 91.5% vs 84.7% coverage, and 4 vs 6 unsafe writes, from one run each. The most defensible advantage is not that the LLM "understands better". It is that deterministic code enforces write rules the one-shot model sometimes ignores: never overwrite existing CRM state autonomously, and never write a normalized value that contradicts its evidence. Grounded's remaining errors are semantic labeling and value normalization mistakes, often shared with the baseline, and it costs about twice as much. The differences are too small and the data too synthetic to claim a reliable effect; they motivate testing on real conversations with repeated runs, not a production conclusion.
