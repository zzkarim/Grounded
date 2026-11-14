# Grounded

**An experiment in reliable CRM automation.** When should an AI agent trust information extracted from a sales conversation enough to modify CRM state autonomously?

> This is an independent exploration of a technical problem relevant to AI revenue agents. It is not affiliated with any company, and it uses no real customer data. All benchmark transcripts are synthetic.

## The problem

LLMs are good at pulling "$100K" out of a sales call. The harder problem comes when a system *writes* that value into a system of record. These five sentences all contain "$100K" and mean five different things:

- "Our approved budget is $100K."
- "We could probably spend around $100K."
- "If finance approves it, we'll have $100K."
- "We don't have a $100K budget."
- "Our budget used to be $100K."

## The experiment

Three systems, one model, one frozen benchmark:

| System | What it does |
|---|---|
| `baseline-naive` | One prompt proposes CRM updates; every proposal is written. |
| `baseline-self-assess` | One prompt proposes updates and marks each AUTO or REVIEW. **Primary baseline.** |
| `grounded` | Call 1 extracts candidate values with exact quotes. Call 2 labels each one's status, certainty, and evidence sufficiency. **Deterministic code** then checks each quote against the transcript, compares with the existing CRM state, and decides ACT / ASK / ABSTAIN / NO_OP. |

The question is whether decomposition plus a deterministic policy beats asking the model to make the trust decision itself. The expected cost is lower autonomous coverage and more human review. The primary metric is **ACT precision**: of the autonomous writes, how many were correct.

See [SPEC.md](SPEC.md) for the design, [LABELING_GUIDE.md](LABELING_GUIDE.md) for the ground-truth rules, and [DECISIONS.md](DECISIONS.md) for the reasoning behind each choice.

## Status

- [x] Specification, labeling guide, decision log
- [x] Deterministic core: schemas, grounding, value comparison, policy, scoring (unit tested)
- [x] Both baselines, Grounded's two model calls, evaluation runner and reports
- [x] Six illustrative schema cases (`data/benchmark/examples/`, drafts, **not** the benchmark)
- [ ] Benchmark: 60 transcripts (30 dev / 30 held-out test), human-labeled, then frozen
- [ ] Baseline results → Grounded iteration on dev → final 3× test runs
- [ ] Demo and evaluation UI

**No results yet.** Nothing in this repo should be read as a measured result until the benchmark is frozen and runs are recorded under `data/runs/`.

## Running it

```bash
npm install
cp .env.example .env              # add ANTHROPIC_API_KEY; GROUNDED_MODEL sets the model for every system

npm test                          # deterministic tests (no API calls)
npm run typecheck && npm run lint
npm run validate-benchmark        # schema + gold-evidence grounding + label-consistency checks

# Real model calls (costs money). Writes an append-only run file + report to data/runs/<split>/
npm run eval -- --system grounded --split example
npm run report -- data/runs/example/<run>.json
```

The test split is refused unless it's frozen and `--final-test` is passed.

## Layout

```
src/core/      schemas, grounding, values (comparison), policy, scoring, transcript rendering. Pure, no I/O.
src/llm/       model config (single source of truth) and the provider abstraction (only SDK import)
src/systems/   baselines and Grounded
src/eval/      benchmark loading/validation, runner, markdown report
scripts/       CLI entry points
data/benchmark/{examples,dev,test}/   cases, one JSON file each
data/runs/     stored evaluation runs (append-only)
tests/         Vitest
```

## Limitations (known in advance)

- The benchmark is small and synthetic: no ASR noise, crosstalk, or real sales data. Results are not claims about real conversations.
- Only three CRM fields. A single conversation; no cross-call memory or calendar data.
- Gold labels are policy judgments written by one person, and Grounded's policy implements the same rubric. The benchmark tests semantic understanding plus rubric application, not whether the rubric is optimal.
- Model outputs vary between runs (sampling parameters are not settable), so final results are reported over 3 runs.
