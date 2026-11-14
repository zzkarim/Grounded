# DEV run 1: failure analysis

> Synthetic, Claude-generated dev benchmark (30 transcripts, 90 field-items). One run per system. Nothing here describes real sales conversations.
> Analysis only. No prompts, policy, schemas, labels, scoring or model config were changed, and no system was re-run.

## Runs analysed

| System | Run file | Version | Prompt hash(es) |
|---|---|---|---|
| baseline-naive | `2026-11-14T02-34-15-517Z_baseline-naive_dev.json` | v1 | main `171a122f1f237e21` |
| baseline-self-assess | `2026-11-14T02-35-09-305Z_baseline-self-assess_dev.json` | v2 | main `e09fb7bcd546ac01` |
| grounded | `2026-11-14T02-42-29-562Z_grounded_dev.json` | v2, policy `default-v2` | extract `7dbf1f5f58939c9b`, classify `b7ae094e7da49750` |

- Model: `claude-sonnet-5-5`, requested and API-reported for every call. Effort `medium`.
- Errors and retries: 0 system errors and 0 retries in all three runs.
- Integrity: every run's recorded case-file hashes equal `FROZEN.json` and the current files on disk, and `benchmarkFrozen = true`.
- Independent re-score: every outcome was re-derived in a separate Python re-implementation of LABELING_GUIDE §5 value equality and the outcome rules. It agrees with the stored outcome on **270/270** field-items.

---

## 1. Headline metrics (recomputed from raw run files)

| | Naive | Self-assess | Grounded |
|---|---|---|---|
| Autonomous writes (pred ACT) | 41 | 25 | 32 |
| Correct autonomous writes | 31 | 25 | 31 |
| **ACT precision** | **31/41 (75.6%)** | **25/25 (100%)** | **31/32 (96.9%)** |
| Legitimate ACT opportunities (gold ACT) | 31 | 31 | 31 |
| Autonomous coverage | 31/31 (100%) | 25/31 (80.6%) | 31/31 (100%) |
| Unsafe writes (pred ACT, gold ≠ ACT) | 10 | 0 | 1 |
| Unsafe-write rate | 10/59 (16.9%) | 0/59 (0%) | 1/59 (1.7%) |
| Wrong-value writes (gold ACT, wrong value) | 0 | 0 | 0 |
| Reviews (pred ASK) | 0/90 | 27/90 (30.0%) | 24/90 (26.7%) |
| Correct ASK | 0 | 18 | 22 |
| Wrong-value ASK | 0 | 2 | 1 |
| Unnecessary ASK (gold ABSTAIN/NO_OP) | 0 | 1 | 1 |
| ACT downgraded to ASK | 0 | 6 | 0 |
| Missed ASK (gold ASK → no change) | 14 | 4 | 0 |
| Correct NO_OP (gold NO_OP → NO_OP) | 0/8 | 6/8 | 8/8 |
| Gold NO_OP → other | 8 → ABSTAIN | 2 → ABSTAIN | 0 |
| Correct no-change (gold ABSTAIN/NO_OP → ABSTAIN/NO_OP) | 35 | 34 | 34 |
| System errors | 0 | 0 | 0 |

These match the CLI headline exactly.

**Gold NO_OP handling.** All 8 gold NO_OP items scored as correct no-change for every system, because the CRM doesn't change either way. Naive never proposed a value equal to the CRM, so it has no NO_OPs.

---

## 2. Grounded's one unsafe write: dev-gen-029 · nextMeeting

**Context**
- Call date: 2026-04-16 (Thursday).
- Existing CRM nextMeeting: null.

```
[t3] hugo (rep):       Got it, we'll scope to forty. When should we review the implementation plan?
[t4] anika (customer): Let's do Tuesday the 22nd at 1.
[t5] hugo (rep):       Great, Tuesday the 22nd at 1 it is.
```

**Gold**
- Action and value: **ASK**, `{date: null, time: "13:00", asStated: "Tuesday the 22nd at 1"}`, CURRENT / EXPLICIT / DIRECT.
- Why: 2026-04-22 is a **Wednesday**. Under LABELING_GUIDE §2.3, a weekday/date contradiction makes the date null, so the value is underspecified → ASK. You explicitly confirmed this rule.

**Grounded**
- Extracted candidate `c2`: `{date: "2026-04-22", time: "13:00", timezone: null, asStated: "Tuesday the 22nd at 1"}`.
- Evidence:
  - [t3] hugo "When should we review the implementation plan?"
  - [t4] anika "Let's do Tuesday the 22nd at 1."
  - [t5] hugo "Great, Tuesday the 22nd at 1 it is."
- Grounding: all three quotes match their turns; there is customer evidence.
- Classification: CURRENT / EXPLICIT / DIRECT. The explanation reads: "Anika proposed and Hugo accepted a specific upcoming implementation plan review on Tuesday the 22nd at 1, a mutually agreed future meeting."
- Policy: ACT `[SUPPORTED]`. Rule 6's `UNDERSPECIFIED_VALUE` fires only when `date === null`, and the date was not null.
- Reconciliation: the only nextMeeting claim, so no conflict.
- Score: gold ASK, prediction ACT → **UNSAFE_ACT**. The value doesn't match gold either, because a concrete date was written where gold has null.

**Trace through the architecture**

| Step | Correct? | Notes |
|---|---|---|
| A. Candidate extracted | Yes, but the **value is wrong** | The right meeting was found, but the contradictory "Tuesday the 22nd" was normalized to 2026-04-22 instead of null. The shared field definition says "use date null if no specific day can be determined unambiguously". |
| B. Evidence | Yes | Exact quotes, correct speakers, and they support the meeting. |
| C. Certainty | Yes | EXPLICIT matches gold: an unhedged proposal and acceptance. |
| D. Status | Yes | CURRENT matches gold. |
| E. Sufficiency | Yes | DIRECT matches gold. A mutually agreed meeting is established; the date problem is about the value, not the relationship. |
| F. Reconciliation | Yes | Single claim. |
| G. Policy given its inputs | Yes | With `date ≠ null` and all labels EXPLICIT/DIRECT/CURRENT, rule 7 → ACT is the correct deterministic outcome. |

**Primary root cause: EXTRACTION**, specifically normalizing the extracted value (resolving the date).

Contributing cause: the architecture checks *grounding* (the quote exists) deterministically but not *normalization*. Nothing compares the resolved `date` with the weekday in `asStated`, so the policy trusts whatever the extractor normalized.

For comparison, on this item:
- Naive wrote `date: null`. It's still unsafe, because it wrote an underspecified meeting.
- Self-assess also resolved to 2026-04-22, but noted the weekday conflict in its reason and chose REVIEW.

---

## 3. Grounded coverage: all 31 gold ACT items

Grounded ACTed with a correct value on **31/31**. None was given the wrong value, ASKed, ABSTAINed or NO_OPed.

| Case | Field | Grounded wrote | Self-assess outcome |
|---|---|---|---|
| 001 | budget | USD 60,000 | correct ACT |
| 001 | nextMeeting | 2026-03-05, no time | **downgraded to ASK** |
| 002 | budget | USD 40,000–50,000 | correct ACT |
| 002 | decisionMaker | Lena Novak (VP Operations) | correct ACT |
| 002 | nextMeeting | 2026-03-11 11:00 | **downgraded to ASK** |
| 005 | budget | USD 25,000 | correct ACT |
| 005 | decisionMaker | (CFO) | correct ACT |
| 006 | nextMeeting | 2026-03-19, **time null** (gold 16:00), see §11.6 | **downgraded to ASK** |
| 007 | budget | EUR 45,000 | correct ACT |
| 007 | decisionMaker | Sophie Laurent (managing director) | correct ACT |
| 008 | decisionMaker | Tomás Rivera (Claims Director) | correct ACT |
| 009 | nextMeeting | 2026-03-16 09:30 | correct ACT |
| 010 | decisionMaker | Linda Park (COO) | correct ACT |
| 011 | budget | USD 55,000 | correct ACT |
| 012 | budget | USD 90,000 | correct ACT |
| 012 | decisionMaker | Carla Mendes (VP of Marketing) | correct ACT |
| 013 | nextMeeting | 2026-03-20 13:00 | **downgraded to ASK** |
| 014 | decisionMaker | Daniel Kim (CFO) | correct ACT |
| 017 | decisionMaker | Mike | **downgraded to ASK** |
| 018 | decisionMaker | Nadia Ellis (COO) | correct ACT |
| 018 | nextMeeting | 2026-04-24 10:00 | **downgraded to ASK** |
| 020 | budget | USD 75,000 | correct ACT |
| 021 | budget | USD 45,000 | correct ACT |
| 021 | decisionMaker | James Holt (VP of Operations) | correct ACT |
| 023 | budget | USD 115,000 | correct ACT |
| 023 | nextMeeting | 2026-04-08 14:00 | correct ACT |
| 026 | decisionMaker | Darius Reed (Director of Facilities) | correct ACT |
| 026 | nextMeeting | 2026-04-24 09:00 | correct ACT |
| 027 | budget | USD 75,000 | correct ACT |
| 030 | decisionMaker | Irene Walsh (Head of Procurement) | correct ACT |
| 030 | nextMeeting | 2026-04-17 14:00 | correct ACT |

**Why coverage is 31/31 but precision is 31/32.** Coverage counts correct ACTs over gold-ACT items (31/31). Precision counts correct ACTs over *all* ACTs, and that includes one ACT on a **gold-ASK** item (029, section 2). An unsafe write lowers precision without affecting coverage.

**Notes**
- **dev-gen-014:** this ACT depends on the owner-directed v2 rule. The evaluation lead's INDIRECT claim (Anil) was the **only** time `OUTRANKED_BY_DIRECT` fired in the whole run. Under policy v1 this item would have been ASK, giving 30/31.
- **dev-gen-021:** the classifier labeled Sarah NEGATED (in response to "Does Sarah decide?"), so the new rule didn't fire there.
- Capitalization differences in roles ("Head of Procurement" vs gold "head of procurement") are ignored by design (§5).

---

## 4. Self-assessing: the six lost ACTs

**All six are the same root cause: correct value, overly conservative REVIEW.** There are 0 missed extractions, 0 wrong values and 0 other.

| Case · field | Transcript (customer) | Gold | Self-assess value | Its stated reason for REVIEW |
|---|---|---|---|---|
| 001 · nextMeeting | "Thursday works. Mornings are best for me, so just send whatever morning slot your engineer has." | ACT 2026-03-05, no time | 2026-03-05 (REVIEW) | Exact time not set, invite still pending |
| 002 · nextMeeting | "Wednesday the 11th at 11 works. Send the invite…" | ACT 2026-03-11 11:00 | same (REVIEW) | AM/PM and timezone not stated |
| 006 · nextMeeting | "Thursday the 19th at 4 works. Send me the invite." | ACT 2026-03-19 16:00 | same (REVIEW) | AM/PM and timezone not stated; 16:00 assumed |
| 013 · nextMeeting | "Friday at 1 is fine. Send it over." | ACT 2026-03-20 13:00 | same (REVIEW) | "1" could be AM or PM; no timezone or format |
| 018 · nextMeeting | "The 24th works. Ten a.m. my time, Central." | ACT 2026-04-24 10:00 | same (REVIEW) | "The 24th" could be read differently |
| 017 · decisionMaker | Rep: "And Mike signs off on the final contract, right?" Customer: "Yep, that's right. Mike signs." | ACT Mike | Mike (REVIEW) | Only a first name, so identity should be confirmed |

Grouped by underlying hesitation:
- **Meeting time or timezone specificity:** 4 (001, 002, 006, 013)
- **Date-resolution doubt:** 1 (018)
- **Name completeness:** 1 (017)

**Interpretation.** These six are Grounded's entire coverage advantage. In every one the model understood the semantics and got the value right. The difference is the *standard for autonomy*:
- **Self-assess** applied its own stricter specificity bar: AM/PM certainty, timezone, a full name.
- **Grounded's policy** gates only on structural specificity (`date === null`).

The guide's conventions would have settled each doubt: "at 2" in business context = 14:00, time is optional, timezone isn't compared, and a first name is acceptable. But those conventions are **not** in the shared `FIELD_DEFINITIONS` that both model-facing systems receive. That only says "time is 24-hour, null if not stated or unclear". So part of this gap may come from how the spec was communicated to the systems, not only from their architecture (see section 11.7).

---

## 5. Self-assessing review quality (27 reviews)

| Bucket | Count | Items |
|---|---|---|
| Gold ASK → correct review | 18 | 009.bu, 010.bu, 010.ne, 011.de, 011.ne, 013.bu, 015.bu, 015.ne, 016.de, 020.ne, 022.bu, 022.ne, 024.bu, 024.de, 025.de, 026.bu, 028.ne, 030.bu |
| Gold ASK → wrong-value review | 2 | 024.ne (wrote 2026-04-23 for the ambiguous "next Thursday"; gold date null), 029.ne (2026-04-22; gold null) |
| Gold ACT → conservative review | 6 | 001.ne, 002.ne, 006.ne, 013.ne, 017.de, 018.ne |
| Gold ABSTAIN → unnecessary review | 1 | 025.ne (Rachel "out until the 15th… I'll ask her assistant for times after that") |
| Gold NO_OP → unnecessary review | 0 | — |

Both wrong-value reviews are safe, because a human sees them. In both, the model *noted* the ambiguity in its reason but still filled in a concrete date.

Self-assess also **missed 4 gold ASKs**, returning null: the INDIRECT decision makers 009.de (Sarah Kim, evaluation lead), 019.de (Greg Novak, "run it by"), 022.de (Aaron Webb, budget owner) and 028.de (Grace Liu, security). This is consistent with its v2 prompt ("final decision authority is different from leading the evaluation…"): it seems to have read that as "don't propose" rather than "propose for review". These items are safe, but the review signal is lost.

---

## 6. Grounded review quality (24 reviews)

| Bucket | Count | Items |
|---|---|---|
| Gold ASK → correct review | 22 | 009.bu, 009.de, 010.bu, 010.ne, 011.de, 011.ne, 013.bu, 015.ne, 016.de, 019.de, 020.ne, 022.bu, 022.de, 022.ne, 024.bu, 024.de, 024.ne, 025.de, 026.bu, 028.de, 028.ne, 030.bu |
| Gold ASK → wrong-value review | 1 | 015.bu (showed USD 40,000; gold 50,000) |
| Gold ACT → unnecessary review | 0 | — |
| Gold ABSTAIN → unnecessary review | 1 | 025.ne |
| Gold NO_OP → unnecessary review | 0 | — |

**They are not the same 24.** 23 of Grounded's reviews are on gold-ASK items; the 24th is on a gold-ABSTAIN item (025.ne). The one gold-ASK item Grounded did **not** review is **029.ne, which it ACTed** (section 2). The equal counts are a coincidence of one miss and one extra.

**015.bu (wrong-value review)**
- The transcript says "We've got forty approved for the licenses, and another ten approved for implementation services."
- Extraction produced three claims:
  - 40K (INDIRECT)
  - 10K (INDIRECT)
  - 50K sum (classified DIRECT; the guide's §2.1 would call a derived sum INDIRECT)
- They conflict, so the field becomes ASK, and its value is the "latest-stated" claim. All three claims cite only turn t2, so the tie-break falls back to array order and picks **40K**.
- The root cause is **RECONCILIATION**: the tie-break when claims share the same latest turn is arbitrary. It's made worse by a guide ambiguity about which component claims count as competing values (section 11.6).

**025.ne (unnecessary review)**
- Grounded classified "out until the 15th… I'll ask her assistant for times after that" as TENTATIVE/INDIRECT, a pending coordination action. Gold says NONE.
- Self-assess made the same call independently (section 10C).

---

## 7. Failure breakdown by field

| Field | System | ACT precision | Coverage | Unsafe writes | Review errors |
|---|---|---|---|---|---|
| budget | Naive | 10/13 | 10/10 | 3/20 | 5 missed ASK |
| | Self-assess | 10/10 | 10/10 | 0/20 | 0 |
| | Grounded | 10/10 | 10/10 | 0/20 | 1 wrong-value ASK (015) |
| decisionMaker | Naive | 12/15 | 12/12 | 3/18 | 5 missed ASK |
| | Self-assess | 11/11 | 11/12 | 0/18 | 1 downgraded, 4 missed ASK |
| | Grounded | 12/12 | 12/12 | 0/18 | 0 |
| nextMeeting | Naive | 9/13 | 9/9 | 4/21 | 4 missed ASK |
| | Self-assess | 4/4 | **4/9** | 0/21 | 5 downgraded, 2 wrong-value ASK, 1 unnecessary |
| | Grounded | 9/10 | 9/9 | **1/21** | 1 unnecessary ASK |

**nextMeeting is the hardest field for every system.** It produced:
- Grounded's only unsafe write
- 5 of self-assess's 6 lost ACTs, and all of its wrong-value reviews
- naive's highest unsafe count

---

## 8. Failure breakdown by tag

"Errors" here are all non-correct outcomes. Items are counted once per tag they carry, so tags overlap. Most tags appear in only 1–8 cases, so treat these as directions, not rates.

| Tag (cases) | Naive errors (unsafe) | Self-assess errors | Grounded errors (unsafe) |
|---|---|---|---|
| existing_value (11) | 9 (8) | 5 | 2 (1) |
| explicit_but_insufficient (6) | 10 (2) | 4 (3 missed ASK) | 0 |
| tentative (5) | 11 (1) | 3 (3 missed ASK) | 1 (0) |
| conditional (4) | 9 (2) | 2 | 0 |
| supersession (6) | 5 (5) | 2 | 1 (0) |
| multiple_numbers (8) | 6 (4) | 1 | 1 (0) |
| multiple_stakeholders (6) | 4 (3) | 2 | 0 |
| negation (5) | 4 (3) | 2 | 1 (0) |
| explicit (13) | 4 (2) | 5 (5 downgraded) | 0 |
| ambiguous_date (2) | 4 (3) | 2 (wrong-value ASK) | 1 (1) |
| unconfirmed_rep_statement (2) | 2 (0) | 2 | 0 |
| joint_approval (1) | 3 (2) | 1 | 0 |
| messy_speech (2), mid_sentence_correction (1), no_update (1) | 0 | 0 | 0 |

What can reasonably be read from this:
- **Naive's errors concentrate in `existing_value` and `supersession`.** 8 of its 10 unsafe writes involve a CRM value or a superseded one (overwrites).
- **Its errors under `tentative`, `conditional` and `explicit_but_insufficient` are mostly missed ASKs.** Naive simply didn't propose hedged or indirect values, which is safe but loses information.
- **Self-assess's errors split cleanly:**
  - over-caution on `explicit` meetings
  - dropping INDIRECT decision makers (`explicit_but_insufficient`)
- **Grounded's 4 non-correct items cover 6 different tags with ≤2 each.** There's no pattern to infer.
- **`ambiguous_date`** has 2 cases (024, 029), and every system mishandled at least one.
- **Inconclusive:** `joint_approval` and `mid_sentence_correction` (1 case each) and `messy_speech` (2).

---

## 9. Naive's ten unsafe writes

**All ten have the correct value and are on gold-ASK items.** Naive made **no** unsafe write on a gold-ABSTAIN item: it ignored every distractor (prices, thresholds, internal meetings, negated or historical values). Its unsafe writes break the *write policy*; they don't misread the facts.

| Group | Case · field | Gold | Naive wrote | Why unsafe under the guide |
|---|---|---|---|---|
| **Overwrote an existing CRM value (6)** | 013 · budget | ASK 65K | 65K | Overwrites CRM 50K |
| | 016 · decisionMaker | ASK Angela Wu | Angela Wu | Overwrites CRM Tom Reyes |
| | 020 · nextMeeting | ASK 04-03 15:00 | same | Overwrites CRM meeting 04-02 |
| | 024 · decisionMaker | ASK Maria Lopez + Ken Ito | same | Overwrites CRM Ken Ito alone |
| | 025 · decisionMaker | ASK Rachel Kim | same | Overwrites CRM Alan Brooks |
| | 030 · budget | ASK 95K | 95K | Overwrites CRM 120K |
| **Meeting with no resolvable date (3)** | 011 · nextMeeting | ASK date null | date null, "sometime next week" | No day to put in a CRM |
| | 024 · nextMeeting | ASK date null | date null, "next Thursday at 11" | Ambiguous date |
| | 029 · nextMeeting | ASK date null | date null, "Tuesday the 22nd at 1" | Weekday/date contradiction |
| **Derived (INDIRECT) value (1)** | 015 · budget | ASK 50K (sum) | 50K | Total not stated, only components |

**What the safety mechanisms solved on this set.** Mostly *policy* (no autonomous overwrite; no write without a date), not semantic extraction errors. Naive's other weakness was **silence**: 14 missed ASKs where hedged, conditional or indirect information was dropped entirely.

---

## 10. Case-by-case comparison: self-assess (S) vs Grounded (G)

Each comparison is per field-item against gold. "Correct" = CORRECT_ACT, CORRECT_ASK or CORRECT_NO_CHANGE.

**A. Grounded strictly better: 11**
- 6 conservative self-assess REVIEWs that Grounded correctly ACTed: 001.ne, 002.ne, 006.ne, 013.ne, 017.de, 018.ne.
- 4 INDIRECT decision makers self-assess dropped and Grounded correctly ASKed: 009.de, 019.de, 022.de, 028.de.
- 024.ne: self-assess reviewed with an invented date (04-23); Grounded reviewed with date null, as gold.

**B. Self-assess strictly better: 1**
- 015.bu: self-assess reviewed 50K, which is correct; Grounded reviewed 40K, the wrong value.

**C. Same mistake: 1**
- 025.ne (gold ABSTAIN): both reviewed a pending "times after the 15th".

**Both wrong, differently: 1**
- 029.ne (gold ASK): self-assess reviewed a wrong date (safe); Grounded **wrote** the wrong date (unsafe). On the safety dimension this is the single item where self-assess is clearly better.

**D. Both correct, different safe behaviour: 2**
- 006.de and 027.ne (gold NO_OP): Grounded NO_OP; self-assess returned null. Both are correct no-change.

All other 74 items are identical and correct for both.

---

## 11. Conclusions (no tuning proposed)

### 11.1 Executive summary
- **No wrong facts were written.** On this synthetic dev set all three systems identified values well: no system wrote a wrong value on any gold-ACT item, and none wrote a distractor.
- **The differences come from the trust decision:**
  - **Naive** wrote everything it found. That gave 10 unsafe writes, all correct values breaking the write policy (6 overwrites, 3 undated meetings, 1 derived sum), and it silently dropped 14 reviewable items.
  - **Self-assess** never wrote unsafely, but declined 6 correct autonomous writes because of self-imposed specificity doubts, and dropped 4 reviewable decision makers.
  - **Grounded** matched naive's coverage (31/31) with one unsafe write, a meeting date resolved during extraction.
- **Most single-item differences are within noise.** This is one run on 90 items: 1 item = 1.7 points of unsafe-write rate and about 3 points of precision.

### 11.2 Root cause of Grounded's unsafe write
- **EXTRACTION:** value normalization in dev-gen-029. The extractor resolved the contradictory "Tuesday the 22nd" (the 22nd is a Wednesday) to 2026-04-22 instead of null.
- **Correct:** evidence, classification (CURRENT/EXPLICIT/DIRECT), reconciliation and policy were all correct for their inputs.
- **Contributing:** no deterministic stage checks the *normalized value* against the quoted text. Grounding checks only that the quote exists.

### 11.3 Grounded's six-write coverage advantage
- **Not semantic.** All six were correct values that self-assess chose to REVIEW:
  - 4 over meeting time/timezone (AM/PM) doubts
  - 1 over "the 24th" resolution
  - 1 over a first-name-only decision maker
- **The mechanism is the decision standard.** Grounded's deterministic policy has no such doubts: it gates only on `date === null` and the semantic labels. The guide's conventions that settle these doubts are not in the shared field definitions either system receives.
- **Two caveats:**
  - For one of the six (006), Grounded wrote the meeting **without its time**, and it scored correct only because §5 compares time only when both sides have one.
  - Grounded's 31/31 also includes dev-gen-014, which depends on the policy v2 outranking rule. Self-assess also got 014 right, so it isn't one of the six.

### 11.4 Do Grounded's 24 reviews match the 24 gold ASKs?
**No. 23 of 24 overlap.** Grounded missed 029.ne (it ACTed) and added 025.ne (gold ABSTAIN). The equal counts are coincidental.

### 11.5 Top three genuine failure modes
1. **Meeting value normalization and specificity, across all systems.**
   - Grounded's only unsafe write (029).
   - Self-assess's 2 wrong-value reviews (024, 029) and 5 of its 6 lost ACTs.
   - 3 of naive's unsafe writes (undated meetings).
   - Date resolution is done by the model and isn't checked deterministically.
2. **Calibration of the one-shot trust decision (self-assess).**
   - Too conservative on fully agreed meetings: 5 of 9 gold-ACT meetings were sent to REVIEW.
   - Too exclusive on INDIRECT decision makers: 4 dropped instead of reviewed.
   - Zero unsafe writes, but 6 lost ACTs plus 4 lost review signals.
3. **No write policy (naive).** It overwrote existing CRM values 6 times, wrote undated meetings, and dropped hedged information instead of surfacing it.

Secondary observations:
- **Grounded's extraction didn't produce a candidate for 3 of 8 tempting distractors** (014 budget threshold, 014 internal meeting, 019 async deadline). The ABSTAIN outcome was correct, but the "preserve the signal" requirement isn't met for those three, and preserving signals isn't scored.
- **Reconciliation tie-breaking within a single turn is arbitrary** (015).

### 11.6 Evidence of scoring or benchmark problems
- **Lenient time matching (scoring rule, §5).** In 006, Grounded wrote a meeting with `time: null` where gold has 16:00, and it scored CORRECT_ACT. Under a strict rule (time must match when gold has one), Grounded would be precision 30/32 and coverage 30/31. This is the rule as designed, not a bug, but it does reward dropping information.
- **Component-sum ambiguity (guide).** §2.1 says gold is the *sum* (INDIRECT), but §4 step 4's "latest-stated competing value" is undefined when the components and the sum are all stated in the same turn and none of them is "the" stated value. 015's gold value is defensible, but the guide doesn't pin down what the systems should output.
- **025.ne label.** Both independent systems read "I'll ask her assistant for times after that" as a pending coordination item (INDIRECT → review), while gold says NONE (an availability constraint). This doesn't prove the label is wrong, but it's the only item where two systems agree against gold. The owner should check it against guide v1.1 §3.4's coordination rule. **Not changed.**
- **Benchmark difficulty or bias.**
  - Zero wrong-value writes across all systems suggests the dev set doesn't stress value extraction much: value identification may be near the ceiling for this model on these transcripts.
  - The transcripts were generated by a Claude model and the systems run on a Claude model. That could make the synthetic language unusually easy for them. This is a known limitation, now with some evidence behind it.
- **Terminology.** "Unsafe write" here means a write the rubric wouldn't allow autonomously. For naive, all ten had correct values. Report this precisely so "unsafe" isn't read as "wrong".
- **Single run.** Run-to-run variance is unmeasured.

No scoring bugs were found: the independent re-score agreed on 270/270 items.

### 11.7 Questions to answer before deciding whether Grounded v3 is warranted
1. **Variance:** do the 1 unsafe write and the 6-item coverage gap persist across repeated dev runs, or are they noise? With n=90, a single item is decisive.
2. **Normalization checking:** is a *general* deterministic check of normalized values against the quoted text (weekday vs resolved date) within the architecture's principles? Would it have prevented failures beyond 029, which is one item? It must not become a case-specific patch.
3. **Time-matching rule:** should §5 require the time to match when gold specifies one? Changing scoring after seeing results is high-risk, so any change needs an independent justification and must be recorded as post-hoc.
4. **Fairness of the shared field definitions:** do they under-communicate the guide's conventions (business-hours times, optional time, timezone ignored, first name acceptable) in a way that specifically handicaps self-assess's own trust decision? If so, fixing it is specification alignment that would apply to both systems. But it is now post-hoc, so it must be labelled as such.
5. **Should self-assess's dropping of INDIRECT decision makers be counted against it?** It reflects how it read its v2 prompt. Is "propose for review" what its prompt actually asked for?
6. **025.ne and 015.bu:** should the owner revisit either gold label or the component-sum rule? No change without explicit owner approval, and the dev split is frozen.
7. **Signal preservation:** should extraction recall for distractors (negative signals) become a measured metric, given the PRD says ABSTAIN must not discard useful information?
8. **Cost:** Grounded used about 1.9× the input tokens and 2.3× the output tokens of self-assess (193,907 / 21,687 vs 102,334 / 9,565). Does its advantage on this set (coverage +6, and 4 review signals self-assess dropped, against −1 safety item) justify that?
9. **Generalization:** will these failure modes appear in the held-out test split? We must not inspect it to find out. The answer comes only from the final frozen evaluation.
