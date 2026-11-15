# Held-out TEST benchmark: manifest

**Frozen 2026-11-15T22:32:14Z, before any system was evaluated on TEST.** When the labels were finalized, no model or system output for TEST existed. No evaluation result appears in this document because none exists.

## Contents

| | |
|---|---|
| Transcripts / field-items | **60 / 180** (60 per field) |
| Source / label status | all `generated` (drafted by Claude) / all `reviewed` (owner-approved) |
| Labeling authority | LABELING_GUIDE.md **v1.3** |
| Difficulty | 12 easy · 28 moderate · 20 hard |
| Generation batches | A (ordinary calls) 20 · B (messy / distributed) 20 · C (extraction stress) 20 |
| Transcripts with existing CRM state | 28 (41 pre-filled field-items) |
| Multiple monetary values (tag) | 17 |
| Multiple stakeholders (tag) | 21 |

### Gold action distribution

| | ACT | ASK | ABSTAIN | NO_OP |
|---|---|---|---|---|
| **All 180** | 59 (32.8%) | 50 (27.8%) | 50 (27.8%) | 21 (11.7%) |
| budget | 16 | 20 | 16 | 8 |
| decisionMaker | 21 | 14 | 17 | 8 |
| nextMeeting | 22 | 16 | 17 | 5 |

### Coverage
- Every category in TEST_COVERAGE_PLAN.md is represented by at least one case: budget B1–B38, decision maker D1–D38, meeting M1–M45, speaker/evidence F1–F13, negative N1–N4. The matrix is in TEST_AUDIT.md.
- **37 categories have exactly one case.** They are **coverage probes only** and must not be reported as statistically meaningful category-level estimates.

## Freeze record

- `data/benchmark/FROZEN.json` → `splits.test`: SHA-256 of all 60 files `test-gen-001.json` … `test-gen-060.json`. They match the files on disk at freeze time.
- `frozenAt.test`: `2026-11-15T22:32:14.225Z`; `frozenAt.dev` (unchanged): `2026-11-14T02:26:14.048Z`.
- Combined TEST hash (SHA-256 over the sorted `file:sha256` lines): `5dc316e3116a0d47f96b9648a93fc57b781ca2abd804d9844080f39ef647c6fb`.
- `FROZEN.json` SHA-256 at freeze: `e2dcfe0900d659fe1da8a538ba89b72485202db3f558c9292b579c6740e4f998`.
- The eval runner refuses a modified, added or removed frozen file, and refuses the test split without `--final-test`.

## Frozen experiment configuration (to be evaluated)

| System | Version | Prompt hash(es) |
|---|---|---|
| baseline-naive | v2 | main `0c85a4c4af3a9e75` |
| baseline-self-assess | v3 | main `10e0f80b92c3d685` |
| grounded | v3, policy `default-v3`, validator `meeting-v1` | extract `a1184542278c3360`, classify `0565ba90032f9826` |

- Scoring **v2** (exact meeting time).
- Model **`claude-sonnet-5-5`**, effort **`medium`**, max tokens 16000, the same for every system.
- System source (`src/`) was last changed in commit `a6f0690` (Grounded v3, 2026-11-14), before TEST was created. It has no changes since.
- Planned protocol (SPEC.md §10): 3 runs per system on TEST with `--final-test`; results reported with counts and run-to-run variance.

## Provenance

- TEST was written from LABELING_GUIDE.md and SPEC.md only, without reading dev cases, run files or analyses. Overlap with DEV and the examples was checked automatically: max 5-word-shingle Jaccard 0.025, and 0 shared 8-word phrases.
- Gold-label changes before freezing are all recorded in TEST_COVERAGE_PLAN.md, DECISIONS.md (D22) and the LABELING_GUIDE v1.3 changelog:
  - the adversarial review pass (five transcript clarifications)
  - four ABSTAIN fields made to record historical/superseded claims
  - three owner decisions (029, 032, 034)
- No system had run on TEST when any of these were made.

## Known limitations

- **Synthetic conversations.** These are generated text, not real or transcribed calls, and say nothing about performance on real sales conversations.
- **Short transcripts:** median 6 turns (range 3–13).
- **Few multi-party calls:** only 7 of 60 transcripts have more than one customer speaker.
- **Singleton categories** (37) aren't statistically meaningful subgroups.
- **Generator/model-family similarity.** Claude generated the benchmark, and the systems under test run on a Claude model. The language may be unusually easy for them. The same author also generated DEV earlier, so independence from DEV isn't absolute even though no DEV content was consulted.
- **One gold claim per field.** Distractor and superseded claims that aren't the recorded gold value go unscored. Status counts for gold claims are dominated by CURRENT (CURRENT 154, NEGATED 6, HISTORICAL 3, SUPERSEDED 1).
- **Single labeler.** Claude drafted the labels and the owner reviewed them. There is no inter-annotator agreement measure.
