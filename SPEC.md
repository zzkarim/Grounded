# Grounded — Specification

> An exploration of a technical problem relevant to AI revenue agents.
> Not an Ergo project. No access to Ergo systems, APIs, or data. All benchmark data is synthetic.

Status: **v1 — approved design (2026-11-13).** The labeling details live in `LABELING_GUIDE.md`, which takes precedence on labeling questions. Decision rationale lives in `DECISIONS.md`.

## 1. Research question

When should an AI agent trust information extracted from a sales conversation enough to modify CRM state autonomously?

**Key experimental question.** Does decomposing the task into extraction → evidence grounding → semantic classification → deterministic action policy outperform asking the same model to make the trust decision in one call?

**Hypothesis.** Grounded makes fewer unsafe autonomous writes than both baselines, at the cost of more human review and lower autonomous coverage. The goal is to *measure* this honestly, not to show that Grounded wins.

Grounded checks **grounding**: whether what was said supports the update. It does **not** check whether the customer is telling the truth.

## 2. Scope

The input is one transcript plus the existing CRM state. There are exactly three fields: `budget`, `decisionMaker`, `nextMeeting`.

The output is, per field, one of `ACT | ASK | ABSTAIN | NO_OP`, with a value, evidence, and reasons.

Out of scope: other fields, CRM integrations, auth, databases, vector stores, agent frameworks, queues, MCP, calendar corroboration, cross-conversation reasoning, and speaker-authority conflicts.

## 3. Field semantics (summary; full rules in LABELING_GUIDE §2)

| Field | Definition | Value |
|---|---|---|
| budget | Current customer-stated **approved or committed** budget for this purchase | `{kind:"exact", amount, currency}` or `{kind:"range", min, max, currency}`. Never an invented midpoint. |
| decisionMaker | Named person(s) or identified role(s) with **final** approval / sign-off authority | `{people: [{name|null, role|null}]}`. Multiple people only for explicit joint approval. |
| nextMeeting | **Mutually agreed future synchronous** seller–customer meeting with specific timing | `{date|null, time|null, timezone|null, asStated}`, resolved against the call date |

## 4. Claim semantics

Each candidate claim has three independent semantic labels:

- **Status:** `CURRENT | HISTORICAL | NEGATED | SUPERSEDED`. Is this about the current state? Precedence: `NEGATED > SUPERSEDED > HISTORICAL > CURRENT`.
- **Certainty:** `EXPLICIT | TENTATIVE | CONDITIONAL`. How strongly is it asserted? Precedence: `CONDITIONAL > TENTATIVE > EXPLICIT`.
- **Sufficiency:** `DIRECT | INDIRECT | NONE`. Does the evidence establish the *field relationship*?

A correction ("I said $100K before, but finance actually approved $75K") produces two claims: $100K `SUPERSEDED`, and $75K `CURRENT`/`EXPLICIT`/`DIRECT`.

There are no numeric confidence scores anywhere.

## 5. Evidence grounding

Every Grounded claim carries one or more `{turnId, speakerId, quote}` items. Deterministic code checks each one:
1. The turn exists.
2. The speaker matches the turn's actual speaker.
3. The quote is a substring of the turn text, after normalizing whitespace, curly quotes, and dashes. Case-sensitive.

If **any** evidence item fails, the claim is ungrounded and can never ACT. A claim also needs at least one evidence item from a **customer-side** speaker to ACT.

## 6. Deterministic action policy (default configuration)

Per claim, evaluated in order:

| # | Condition | Decision | Reason |
|---|---|---|---|
| 1 | Classification missing or invalid | ABSTAIN | `CLASSIFICATION_MISSING` |
| 2 | Any evidence fails grounding | ABSTAIN | `UNGROUNDED_EVIDENCE` |
| 3 | Status ≠ CURRENT | ABSTAIN | `STATUS_NEGATED` / `STATUS_HISTORICAL` / `STATUS_SUPERSEDED` |
| 4 | Sufficiency = NONE | ABSTAIN | `NO_SUPPORT` |
| 5 | Value equals existing CRM value | NO_OP | `MATCHES_EXISTING` |
| 6 | Any of: existing CRM value differs · TENTATIVE · CONDITIONAL · INDIRECT · no customer evidence · meeting date null | ASK | all that apply: `CONFLICTS_WITH_EXISTING`, `TENTATIVE`, `CONDITIONAL`, `INDIRECT_SUPPORT`, `NO_CUSTOMER_EVIDENCE`, `UNDERSPECIFIED_VALUE` |
| 7 | Otherwise | ACT | `SUPPORTED` |

Per field (reconciliation):
- `decisionMaker` only: if any surviving claim (ACT, ASK or NO_OP) has `DIRECT` sufficiency, `INDIRECT` claims are signals, not competing values. They become ABSTAIN (`OUTRANKED_BY_DIRECT`) and stay in the trace.
- If two or more remaining ACT/ASK claims have different values, the ACT ones become ASK (`CONFLICTING_CANDIDATES`). For `decisionMaker` this means two different DIRECT claims conflict. Joint approval is one claim listing all signers.
- Field action: ACT if any claim ACTs; else ASK, using the latest-evidenced ASK value; else NO_OP; else ABSTAIN (`NO_CANDIDATE` if there were no claims at all).
- The claims behind an ABSTAIN, including negated and historical values with their evidence, are kept in the output trace.

`LABELING_GUIDE.md` §4 is the human-readable version of the same rubric. Alternative configurations (CONSERVATIVE / BALANCED / AGGRESSIVE) will be explicit code rule changes, added only after the base policy is complete and tested.

## 7. Systems under test

All systems use one fixed model, set in `src/llm/config.ts` (env `GROUNDED_MODEL`, default `claude-sonnet-5-5`). Effort is also fixed and recorded.

| System | Calls | Who decides the action |
|---|---|---|
| `baseline-naive` | 1 | Nobody. Every proposed update is a write (ACT). |
| `baseline-self-assess` (**primary baseline**) | 1 | The model, choosing AUTO→ACT or REVIEW→ASK |
| `grounded` | 2: extraction, then semantic classification | Deterministic code (§5–6) |

All three get the same field definitions. Only `baseline-self-assess` gets a short AUTO/REVIEW rubric, written as a high-level version of the ACT definition. No system sees benchmark labels, case ids, or examples taken from the benchmark.

Across all systems, a proposed value identical to the existing CRM value is recorded as NO_OP, because writing the same value changes nothing.

## 8. Benchmark

- 60 transcripts. **dev:** 15 handwritten + 15 generated-and-reviewed. **test** (held out): 15 + 15.
- Every case is labeled for all three fields per `LABELING_GUIDE.md`.
- Files: `data/benchmark/{dev,test}/<id>.json`. The six schema-illustration cases live in `data/benchmark/examples/` and are **not** part of the benchmark.
- Freezing: `data/benchmark/FROZEN.json` records per-file SHA-256 hashes. The runner refuses to use a modified frozen split, and refuses the test split without an explicit final-test flag.

## 9. Metrics

The scoring unit is one field-item (case × field). Every metric is reported as `numerator / denominator (percent)`.

| Metric | Definition |
|---|---|
| **ACT precision** (primary) | correct ACTs / predicted ACTs. Correct = gold ACT **and** value matches. |
| Autonomous coverage | correct ACTs / gold ACTs |
| Unsafe write rate | predicted ACTs on items whose gold action ≠ ACT / items whose gold action ≠ ACT |
| Human review rate | predicted ASK / all items |
| Abstention rate | predicted ABSTAIN / all items |
| (also reported) | wrong-value ACTs, NO_OP rate, system errors, gold × predicted action matrix |

Breakdowns: by field, by case tag, by gold status and gold certainty, by source (handwritten/generated), and by label status (draft/reviewed).

Every per-item outcome is stored, so failures can be listed and grouped.

**Value matching for scoring is exact** (scoring v2, after DEV Run 1). Budget and decision maker use LABELING_GUIDE §5 equality. A meeting must match on `date` **and** `time`, null included. The policy keeps the looser "same fact" equality for NO_OP and conflict detection. Each run records `scoringVersion`; runs without it were scored with v1, where meeting time was compared only when both sides had one.

**Diagnostic (not a headline metric): signal recall, Grounded only.** This is the share of gold-recorded claims (gold `value` non-null, including ABSTAIN's tempting wrong values) that Grounded extracted as candidates, matched by semantic equality. It is computed from saved traces with `npm run signal-recall -- <run.json>` and measures whether negative or historical context is preserved, independent of write decisions.

## 10. Evaluation protocol

- Development uses **dev** only: one run per change by default.
- Before the final test evaluation, freeze the prompts, policy, and architecture (git tag). Then run each system **3×** on test, because model output varies and sampling parameters are not available on current models.
- Each run stores: timestamp, the requested and API-reported model, system and version, prompt hashes, policy configuration, effort, case file hashes, raw model outputs, per-item outcomes, raw counts, and computed metrics.
- Test-set failure details are hidden by default in reports.

## 11. Experimental-integrity rules (non-negotiable)

- Never fabricate metrics. Every reported number must be reproducible from a stored run file.
- Never silently modify ground-truth labels. Never modify frozen test data.
- Never hardcode benchmark phrases into production logic. No case-specific patches.
- Never tune on held-out test failures.
- Never hide regressions.
- Always distinguish handwritten from generated cases. Always preserve raw baseline results.
- Synthetic results are synthetic. Make no claims about real conversations or Ergo's systems.
