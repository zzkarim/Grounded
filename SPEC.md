# Grounded — Specification

> An exploration of a technical problem relevant to AI revenue agents.
> Not an Ergo project. No access to Ergo systems, APIs, or data. All benchmark data is synthetic.

Status: **DRAFT — under review.** Items marked *(proposed)* are recommendations from `PROPOSAL.md` that have not yet been accepted.

## 1. Research question

How reliably can an AI agent determine when information extracted from a sales conversation is supported well enough to write into a CRM autonomously?

**Hypothesis.** A decomposed, evidence-aware pipeline will make fewer incorrect autonomous CRM writes than a one-prompt LLM baseline. It will also send more items to human review and leave fewer handled autonomously. The goal is to **measure** this precision/coverage tradeoff honestly, not to show that Grounded wins.

Grounded checks **grounding**: whether the transcript supports a proposed CRM value. It does **not** check whether the customer is telling the truth.

## 2. Scope

The MVP covers exactly three fields:

| Field | Meaning | Value representation *(proposed)* |
|---|---|---|
| `budget` | Money the customer org currently has approved or allocated for this purchase. This is not the price, a competitor quote, or a wish. | `{ amountUsd: number }` |
| `decisionMaker` | The person with final authority to approve the purchase. | `{ name: string, title?: string }` |
| `nextMeeting` | A specific, agreed future meeting with the customer. | `{ date: "YYYY-MM-DD", time?: "HH:MM" }`, resolved against the transcript's `occurredAt` date |

Input: the existing CRM state plus one transcript. Output: one decision per candidate update.

Out of scope: CRM integrations, auth, persistence beyond JSON files, vector DBs, LangChain, agent frameworks, queues, MCP, other fields, cross-conversation reasoning, calendar corroboration, and speaker-authority conflicts. The last three are stretch goals.

## 3. Certainty taxonomy

This describes how the speaker commits to a candidate value.

| Type | Definition | Example |
|---|---|---|
| `EXPLICIT` | Directly asserted as currently true. | "Our approved budget is $75K." |
| `TENTATIVE` | Asserted with hedging or uncertainty. | "We could probably spend around $75K." |
| `CONDITIONAL` | True only if some other event happens. | "If finance approves, we'll have $75K." |
| `NEGATED` | The speaker says the value is not true. | "We don't have a $75K budget." |
| `HISTORICAL` | Describes a past state, not the current one. | "We used to have a $75K budget." |
| `SUPERSEDED` *(proposed rename of CORRECTED)* | Was asserted, then replaced by later information in the same conversation. | "$75K initially, but finance reduced it to $50K." Here $75K is SUPERSEDED. $50K gets its own label (EXPLICIT). |

When more than one type applies, labelers and the model use this precedence *(proposed)*:
`NEGATED > SUPERSEDED > HISTORICAL > CONDITIONAL > TENTATIVE > EXPLICIT`.

Values that are NEGATED, HISTORICAL, or SUPERSEDED are **kept** as signals with their evidence. They are never written as the field value.

## 4. Evidence sufficiency

This is separate from certainty. It asks whether the evidence, taken at face value, states the **relationship the field requires**.

| Value | Meaning | Example (decisionMaker = Sarah) |
|---|---|---|
| `DIRECT` | The evidence states the field relationship itself. | "Sarah has final sign-off." |
| `INDIRECT` | The evidence is related but needs inference to reach the field relationship. | "Sarah is leading the evaluation." "I'll run it by Sarah." |
| `NONE` | The evidence does not support the field relationship for this value. | "Sarah from IT joined the call." |

Sufficiency is a semantic judgment made by the LLM. "Is this enough to write autonomously?" is a separate question, answered by the deterministic policy (§5). There are no numeric confidence scores anywhere.

## 5. Actions

| Action | Meaning |
|---|---|
| `ACT` | The evidence is sufficient to update the CRM field autonomously. |
| `ASK` | The information is plausible and useful, but a human should confirm it before the CRM changes. |
| `ABSTAIN` | The evidence does not justify writing this value. The signal and evidence are kept. Nothing is discarded. |

The ACT/ASK/ABSTAIN decision is made by **deterministic, unit-tested application code** (`policy.ts`). It takes the LLM's semantic labels and the deterministic grounding check as inputs. The LLM never decides the action in Grounded.

**Grounding rule.** Each evidence quote must be found, after whitespace and quote-character normalization, in the transcript turn it cites. If any quote fails this check, the result can never be ACT.

## 6. Benchmark schema (summary; full proposal in `PROPOSAL.md`)

Each **case** has one transcript and existing CRM state. It carries gold labels for **all three fields**:

- `id`, `source: handwritten | generated`, `split: dev | test`, `tags[]`, `labelStatus: draft | reviewed`
- `crm`: existing CRM state
- `transcript`: `{ occurredAt, participants[], turns[] }`
- `expected.<field>`: `{ action, value | null, certainty?, evidence?[], notes }`

The unit of scoring is a **field-item**: one (case, field) pair.

## 7. Metrics

Counts are reported alongside every percentage. With a small N, a single case moves a percentage by several points.

- **ACT precision** (primary) = correct ACTs / all ACTs. An ACT is correct only if the gold action is ACT **and** the value matches.
- **Coverage** = correct ACTs / gold-ACT field-items.
- **Review rate** = ASK / all field-items. **Abstention rate** = ABSTAIN / all field-items.
- **Unjustified writes** = ACTs where the gold action is ASK or ABSTAIN. These are reported separately from wrong-value writes.
- A 3×3 action confusion matrix plus value correctness.
- Breakdowns by field, gold certainty, source (handwritten vs generated), and tag.
- Variance across repeated runs. The model is not deterministic and temperature cannot be set on current models.

## 8. Experimental-integrity rules

1. Never fabricate evaluation results.
2. Never change benchmark labels because a system disagrees with them.
3. Never modify frozen benchmark cases without explicitly telling the owner.
4. Never hardcode phrases from benchmark cases into the implementation.
5. Never patch individual test-set failures with case-specific fixes. Iterate on `dev` only.
6. Clearly mark handwritten vs generated cases. LLM-drafted labels stay `draft` until a human reviews them.
7. Keep raw baseline outputs before improving Grounded. Raw model outputs are stored and never overwritten.
8. Report regressions as well as improvements.
9. Prefer honest failure analysis over a perfect-looking project.
10. Synthetic results are synthetic. Make no claims about real customer conversations.
