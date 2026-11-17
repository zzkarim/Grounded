# Grounded

**A trust layer for AI agents that update a CRM from sales conversations.** The model works out what a call means. Deterministic code decides what is allowed to change customer state.

> An independent exploration of a problem relevant to AI revenue agents. Not affiliated with any company. All conversations are synthetic, and nothing here measures performance on real sales calls.

## The problem

LLMs are good at pulling "$100K" out of a sales call. Writing it into a system of record is a different reliability bar. These all contain "$100K" and mean different things:

- "Our approved budget is $100K." (write it)
- "We're probably around $100K." (useful, but a person should confirm)
- "If finance approves it, we'll have $100K." (conditional)
- "Our budget used to be $100K." (history, not state)
- "We spend $100K on our current vendor." (context, not a budget)

Grounded separates **what the agent knows** from **what it is allowed to do**.

## How it works

```
Sales transcript + existing CRM
  1  MODEL  Extract candidate values, each with exact quotes
  2  CODE   Ground evidence: every quote must appear verbatim in the cited turn, from the cited speaker
  3  CODE   Validate structured values: a meeting's date/time must match its quote and fall after the call
  4  MODEL  Classify meaning: current? hedged / conditional? does it establish the field?  (labels only)
  5  CODE   Write policy: seven ordered rules turn labels + checks + existing CRM into an action
  6  CODE   Reconcile: one decision per CRM field
```

Each field (budget, decision maker, next meeting) gets exactly one of:

| Action | Shown as | Meaning |
|---|---|---|
| `ACT` | Written | Safe to write automatically |
| `ASK` | Needs review | Useful and plausible, but a person approves it |
| `ABSTAIN` | Not written | Don't touch the field (the claim stays in the audit trace) |
| `NO_OP` | Already current | The call confirms what the CRM already holds |

Three invariants are enforced in code, not requested in a prompt:
1. **The model never chooses the final action.**
2. **Existing CRM state is never overwritten autonomously.**
3. **Validation can remove unsupported specificity, never add it.**

## The demo

`npm run dev` and open http://localhost:3000.

- **Workspace** (`/workspace/corrigan`, `/meridale`, `/ardent`): three purpose-built calls. Each shows the transcript with evidence highlighting, three field decisions with plain-English reasons, everything the model extracted (including what wasn't written), a browser-local mock CRM with a review queue, and an audit trace through every MODEL and CODE stage.
  - **Corrigan Freight:** writes a signer and a meeting; a conditional ~$100K budget goes to review; vendor spend is heard but not written.
  - **Meridale Health:** confirms budget and signer (no change). An agreed reschedule still goes to review because it would overwrite the CRM.
  - **Ardent Biologics:** the model resolved "today at 3:30" to the call date. The validator removed the date and kept 3:30 PM, so the meeting goes to review.
- **Results** (`/results`): the frozen held-out evaluation.
- **How it works** (`/how-it-works`): the architecture and why prompting alone wasn't enough.

**The demo is replay-only and makes no model calls.** Each scenario was recorded once through the real frozen pipeline (`data/demo/recordings/`). On load, the recorded raw model responses are fed back through the unchanged `grounded.run()`, so grounding, validation, policy and reconciliation re-execute and must reproduce the recorded decisions. The "Verified replay" badge shows the versions and checks. Mock CRM and review state stay in your browser.

## The experiment

Three systems, one model (`claude-sonnet-5-5`, effort medium), one frozen held-out benchmark:

| System | Design |
|---|---|
| Naive | One model call; every extracted value is written |
| Self-assess | One model call; the model decides auto-write vs review |
| Grounded | Two model calls; deterministic code decides |

**Held-out TEST: 60 synthetic conversations, 180 field decisions, single final run** (`data/runs/test/`):

| | ACT precision | ACT coverage | Unsafe writes |
|---|---|---|---|
| Naive | 56/91 (61.5%) | 56/59 (94.9%) | 32/121 (26.4%) |
| Self-assess | 50/56 (89.3%) | 50/59 (84.7%) | 6/121 (5.0%) |
| Grounded | 54/59 (91.5%) | 54/59 (91.5%) | 4/121 (3.3%) |

### Honest interpretation

- **Both trust-aware designs are far safer than writing everything.**
- **Grounded vs self-assess is close and not conclusive.** On 21 items they disagree: 12 favour Grounded, 9 favour self-assess, from one run each.
- **The clearest finding is deterministic enforcement.** Self-assess was told not to overwrite existing CRM values and still auto-wrote 4 overwrites on TEST, with reasons acknowledging the replacement. Grounded made 0, because its policy can't express that action. That zero is a property of the policy, not proof that every overwrite case was tested.
- **The meeting validator (meeting-v1)** activated on 2 of 66 meeting candidates. It prevented 1 unsafe write (a same-day date) and blocked no correct writes.
- **Grounded's remaining errors are upstream.**
  - All 4 unsafe writes were classification errors: "needs to approve" read as final authority, competing signers, and a derived total read as stated.
  - All 5 lost writes were extraction errors: "seventy-five" became 75, and correct dates were nulled.
  - Deterministic policy can't recover information the model never represented correctly.
- **It's a write gate, not an account memory.** It kept 125/130 CRM-relevant signals but only 6/23 broader contextual ones (incumbent spend, internal deadlines, and so on).
- **It costs about 2× the one-call baseline:** 118 vs 60 calls, roughly $1.38 vs $0.68 estimated. Most of the measured safety came from deterministic code. Whether one call plus the same write gate would capture most of the benefit is an open, untested question.

### Provenance

- Systems frozen (`grounded-v3`) before the TEST benchmark was built.
- TEST labels frozen (`benchmark-test-v1`) before any prediction existed.
- Results committed and analysed under `experiment-v1-complete`.
- An independent re-score matched all 540 stored outcomes; the Results page re-scores them again with the frozen scoring code.
- During development, an early Grounded "advantage" turned out to come from unequal task specification. After aligning all prompts it disappeared (`data/analysis/DEV_RUN2A_ANALYSIS.md`).

Full analysis: [data/analysis/FINAL_TEST_ANALYSIS.md](data/analysis/FINAL_TEST_ANALYSIS.md).

### Limitations

- 60 synthetic, mostly short conversations (median 6 turns); only 7 have multiple customer speakers.
- Claude helped generate the benchmark, and a Claude model was evaluated.
- One final stochastic run per system; only 59 gold write opportunities.
- Many edge categories appear only once.
- Three CRM fields only. No real CRM, no cross-call memory.

## Running it

Node is installed user-locally here (`export PATH=~/.local/node/bin:$PATH`).

```bash
npm install
npm run dev                      # demo (replay-only, no API key needed)
npm test                         # unit tests: deterministic core, product layer, replay, results integrity
npm run typecheck && npm run lint
npm run build
```

Experiment tooling (real model calls; needs `ANTHROPIC_API_KEY` in `.env`):

```bash
npm run eval -- --system grounded --split dev       # TEST is refused without --final-test
npm run record-demo -- --scenarios <id>             # append-only demo recording
npm run check-demo-overlap                          # demo text vs benchmark overlap
```

## Repository

```
src/core/        Frozen deterministic core: schemas, grounding, validation, policy, scoring (pure, tested)
src/llm/         Model config (single source of truth) + the only SDK import
src/systems/     Frozen baselines and Grounded v3
src/eval/        Benchmark loading, runner, reports, signal recall
src/product/     Demo layer: presentation, replay, recordings, view models, results loader
src/components/  Workspace, Results, How it works UI
src/app/         Next.js routes
data/benchmark/  Frozen DEV and TEST ground truth (FROZEN.json hashes)
data/runs/       Stored evaluation runs (append-only)
data/analysis/   DEV and TEST analyses
data/demo/       Demo scenarios, recordings, RECORDINGS.json
```

Design and rules: [SPEC.md](SPEC.md) · [LABELING_GUIDE.md](LABELING_GUIDE.md) · [DECISIONS.md](DECISIONS.md) · [PRODUCT_NOTES.md](PRODUCT_NOTES.md) (known issues, including one frozen validator gap found after the experiment).
