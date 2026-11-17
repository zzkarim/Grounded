# Product notes and known issues

Notes from building the public demo around the frozen experiment (`experiment-v1-complete`).
- **Frozen-system limitations** are documented here and **not fixed**: prompts, policy `default-v3`, validator `meeting-v1`, scoring, benchmark and run files are untouched.
- **Product/demo limitations** belong to the demo layer only.

---

## Known frozen-system limitations

### K1. meeting-v1 accepts a "today" meeting resolved to a later date

- **What.** If the evidence says "today" and the extractor resolves the meeting to a *later* calendar date (for example, the day after the call), meeting-v1 treats the date as supported and doesn't flag the mismatch. In `extractTemporalFacts`, "today"/"tomorrow" only set a `todayOrTomorrow` flag. That flag satisfies `DATE_UNSUPPORTED`, but it isn't checked against the actual date, so a date after the call passes every rule. The policy can then ACT on a date the quote doesn't support.
- **When found.** 2026-11-16, while designing the Ardent demo scenario. That was after the experiment was completed and tagged.
- **Status.** Not fixed, by design.
  - Characterized in `tests/demoScenarios.test.ts`.
  - The same-day direction works: "today" resolved to the call date is caught by `DATE_NOT_FUTURE`, which is what the Ardent recording shows.
- **Effect on reported results.** None; no TEST or DEV result was altered or re-scored.
  - On TEST, the validator's activations were the same-day case (034, `DATE_NOT_FUTURE`) and a harmless `DATE_UNSUPPORTED` (020).
  - No written meeting date contradicted its evidence (FINAL_TEST_ANALYSIS.md §6).
- **A fix, if the system were ever unfrozen:** make "today"/"tomorrow" produce date mentions equal to the call date / call date + 1 and require a match. That needs a new validator version, tests, and a DECISIONS entry.

### K2. Limitations measured in the experiment (FINAL_TEST_ANALYSIS.md)

- **Classification errors** caused all 4 unsafe TEST writes: "needs/has to approve" read as final authority, competing signers, and a derived total read as stated.
- **Value-normalization errors** caused all 5 lost writes: spoken thousands ("seventy-five" → 75) and correct dates nulled. Deterministic stages can't recover them.
- **Contextual recall is low** (6/23). Grounded is a write gate, not an account memory.
- **The overwrite rule is absolute.** Every legitimate reschedule or correction of existing CRM data needs a person.
- **`occurredAt` is date-only,** so a same-day meeting can never be confirmed as future and always goes to review without a date.

---

## Product / demo limitations

- **Replay only.** The public demo never calls a model. Pages replay recorded model responses through the frozen pipeline: grounding, validation, policy and reconciliation re-execute on the server when a page is rendered or revalidated, and must reproduce the recording. You can't paste your own call into the deployed demo.
- **Three fixed scenarios.** Each was recorded once (`data/demo/RECORDINGS.json`), with no retries and none discarded. They were written to show mechanisms (written / review / already current / overwrite protection / validator) and avoid known failure phrasing. Failures are shown on the Results page instead.
- **Mock CRM is browser-local** (`localStorage`, key `grounded-demo:v1`). Nothing is persisted server-side, and "Reset demo" restores the recorded state.
- **Display-only formatting.** IANA timezones are shortened ("America/New_York" → "ET"). A hedged budget shows "~" only when the classifier labeled it tentative; Corrigan's was labeled conditional, so no "~".
- **Unknown workspace URLs** render the 404 page but with HTTP 200, because the partially prerendered shell is already streaming.
- **Layout.** At 1024px the CRM panel sits below the decisions. On phones the Results table scrolls horizontally.
- **The audit drawer** shows the six pipeline stages and recorded call metadata, not raw JSON.
