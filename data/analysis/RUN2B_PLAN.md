# Run 2b plan: Grounded v3 (prepared 2026-11-14, NOT yet run)

## Hypothesis
A deterministic check of normalized meeting values against their own evidence prevents a demonstrated failure class: a structured value that contradicts the quoted words (for example, a resolved date that isn't the stated weekday) being written autonomously. It costs no autonomous coverage on faithful values.

## The single architectural change (DECISIONS.md D21)
```
LLM extraction → grounding → STRUCTURED-VALUE VALIDATION (new, deterministic) → LLM classification → policy + reconciliation
```
- `src/core/validation.ts` checks each `nextMeeting` candidate against its own evidence quotes and `occurredAt`.

| Rule | Fails when |
|---|---|
| `DATE_NOT_FUTURE` | the date ≤ call date |
| `DATE_UNSUPPORTED` | the date is set, but the evidence has no weekday, day of month, today or tomorrow |
| `DATE_WEEKDAY_MISMATCH` / `DATE_DAY_MISMATCH` / `DATE_MONTH_MISMATCH` | the date matches **no** explicit date mention completely (weekday, day, month as stated) |
| `DATE_AMBIGUOUS_NEXT_WEEKDAY` | "next <weekday>" without a day of month, but the date is set |
| `TIME_UNSUPPORTED` | the time can't be read from an explicit hour expression. A bare hour uses the business-hours reading (1–6 → pm, 7–11 → am, 12 → noon); am/pm and h:mm are honoured. |

- **On failure:** the failing component (date and/or time) → null. No correction, no model re-call. The original value is kept in the trace, and the claim gets `VALUE_UNVERIFIED`, which caps it at ASK.
- **Monotonic:** validation only removes specificity and adds an ASK reason. It never turns ASK into ACT or ABSTAIN into anything else. This is test-verified.
- **Versions:**
  - Grounded **v3**, policy **default-v3**.
  - Prompt hashes unchanged: extract `a1184542278c3360`, classify `0565ba90032f9826`.
  - Validator `meeting-v1`.
- **Unchanged:** both baselines (naive v2, self-assess v3), scoring v2, model `claude-sonnet-5-5` and effort `medium`, the frozen dev split, the test split.

## What it can and cannot fix
| Known Run 2a Grounded failure | Affected by v3? |
|---|---|
| **029 meeting**: unsafe ACT of a date that contradicts the stated weekday | **Yes.** It becomes ASK with date null; the time stays if supported. |
| 015 budget: derived total labeled DIRECT → unsafe ACT (CLASSIFICATION) | **No.** Budgets aren't validated. Deliberately not fixed; it's a separate rubric/specification question. |
| 015 meeting: resolvable date nulled by the extractor | **No.** The validator never fills in information. |
| 028 decisionMaker: candidate not extracted | **No.** That's extraction recall. |
| Contextual-signal recall (NONE distractors) | **No.** Diagnostic limitation, future work. |

Not things v3 can catch:
- a wrong week when only a weekday was said
- a misresolved relative phrase ("in two weeks")
- dates spelled in words
- a contradiction phrased in a form the parser doesn't recognize

## Expected impact (stated before running)
Applying the actual validator to the **stored** Grounded meeting claims from Runs 1 and 2a, offline:
- **Run 2a:** 1 of 23 claims fails, dev-gen-029, which would become ASK. No other claim is affected.
- **Run 1:** 2 of 23 fail: dev-gen-029, plus one superseded meeting claim (020) whose time came from the CRM rather than the evidence. That claim was already ABSTAIN and stays ABSTAIN.

So on dev, v3 should change about **one** decision: 029, unsafe ACT → ASK. If extraction behaves as in Run 2a, Grounded's unsafe writes go from 2 to 1 (only 015 remains). Coverage is expected to stay unchanged.

Run 2b produces *new* model outputs, so the actual result can differ. In particular, 029 only reaches the validator if the extractor again outputs a contradictory date. A faithful extraction (date null) would pass untouched.

## Why the change is general, not dev-specific
- The rules come from LABELING_GUIDE §2.3 (future meeting, explicit date expressions, the "next <weekday>" ambiguity rule, the business-hours reading). They aren't tuned to dev phrasing.
- No case ids, dates, or benchmark phrases appear in `validation.ts`. `tests/validation.test.ts` checks the source for these, including any 5-word phrase from any benchmark transcript.
- Every test example is written fresh. The weekday/date contradiction is tested with "Monday the 10th" on a calendar where the 10th is a Tuesday.
- All gold meeting values in the frozen dev and example splits pass the validator with their gold evidence (no false failures on labels).
- During development I *tightened* the date rule from token sets to whole-mention matching, so a rejected alternative's day ("the 9th is out… Thursday?") doesn't block a correct value. That change makes v3 *less* likely to downgrade, not more.

## Evidence caveat
The validator was **designed after observing dev failures** (029 in Runs 1 and 2a). Dev results after this change are not independent evidence of its value. Final evidence must come from the **held-out test split**, run once under frozen prompts, policy and architecture, 3× per system.

## Protocol
1. Commit and tag v3 before any run. Also commit the untracked 18:30 dev run files, which are a repeat of the Run 2a configuration.
2. Run Grounded v3 on dev. The baselines are unchanged; their Run 2a results remain the comparison, and they can be rerun for a same-session comparison if wanted.
3. Compare item by item with Grounded v2.1 (Run 2a), using scoring v2. Expected: only meeting items with failed validation differ in their deterministic outcome. Every other difference is model variation.
4. Record results in a new `RUN2B_ANALYSIS.md`. Earlier artifacts stay untouched.
