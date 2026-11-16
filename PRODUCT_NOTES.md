# Product notes and known issues

Notes from building the product demo around the frozen experiment (`experiment-v1-complete`). Nothing here changed the frozen system: prompts, policy (`default-v3`), validator (`meeting-v1`), scoring, benchmark and run files are untouched. Frozen-system issues are **documented here, not fixed**.

## Known issues in the frozen system

### K1. meeting-v1 accepts a "today" meeting resolved to a later date

- **What.** If the evidence says "today" and the extractor resolves the meeting to a *later* calendar date (for example, the day after the call), meeting-v1 treats the date as supported and doesn't flag the mismatch.
  - In `extractTemporalFacts`, "today"/"tomorrow" only set a single `todayOrTomorrow` flag. That flag satisfies the `DATE_UNSUPPORTED` check.
  - It isn't checked against the actual date, and no date mention is produced.
  - So a date after the call passes every rule. The policy can then ACT on a date the quote doesn't support.
- **When found.** 2026-11-16, while designing the Ardent demo scenario. That was after the experiment was completed and tagged.
- **Status.** Not fixed, by design: the experiment is frozen.
  - Characterized in `tests/demoScenarios.test.ts` ("characterization of a known meeting-v1 gap").
  - The same-day direction works: a "today" meeting resolved to the call date is caught by `DATE_NOT_FUTURE`.
- **Effect on reported results.** None. No observed TEST (or DEV) result was retroactively altered or re-scored. On TEST, the validator's activations were the same-day case (034, `DATE_NOT_FUTURE`) and a harmless `DATE_UNSUPPORTED` (020). No written meeting date contradicted its evidence (FINAL_TEST_ANALYSIS.md §6).
- **Not observed in the demo recordings.** The Ardent recording resolved "today" to the call date, so meeting-v1 fired.
- **A fix, if the system were ever unfrozen:** make "today"/"tomorrow" produce date mentions equal to the call date / call date + 1, and require a match. That needs a new validator version, tests, and a new DECISIONS entry.

## Product-layer notes

- **Demo recordings** are real runs of the frozen pipeline, stored append-only in `data/demo/recordings/`, with every attempt listed in `data/demo/RECORDINGS.json`. They aren't experiment results and are never written to `data/runs/`.
- **Replay** feeds the recorded raw model responses back through the unchanged `grounded.run()` (`src/product/replay.ts`). Grounding, validation, policy and reconciliation re-execute on every replay, and the result must equal the recording or it's reported as an integrity failure.
- **Display formatting to handle in the UI (Phase 3).** The extractor may return IANA timezones (Corrigan recorded `America/New_York` for "Eastern"). The UI should display a short form. Comparisons ignore timezone, so no decision is affected.
- **The "~" display qualifier** is applied only to budgets classified TENTATIVE. Corrigan's ~$100K was classified CONDITIONAL/INDIRECT in its recording. The UI will show the qualifier from the actual labels ("conditional", "indirect"), not a hardcoded "~".
