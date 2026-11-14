# Run 2026-11-14T00-33-30-623Z_baseline-naive_example

> Synthetic benchmark. These numbers say nothing about performance on real sales conversations.
> ⚠️ 6 case(s) have **draft** labels that the owner has not reviewed. Treat results as provisional.
> ⚠️ `example` split: schema-illustration cases, NOT the benchmark.
> Benchmark split is not frozen.

| | |
|---|---|
| system | baseline-naive v1 |
| model (requested / reported) | claude-sonnet-5-5 / claude-sonnet-5-5 |
| effort | medium |
| policy | n/a (model decides) |
| prompt hashes | main=171a122f1f237e21 |
| split / cases / field-items | example / 6 / 18 |
| created | 2026-11-14T00:33:30.623Z |

## Headline
| metric | value |
|---|---|
| **ACT precision** | **4/5 (80.0%)** |
| autonomous coverage | 4/4 (100.0%) |
| unsafe write rate | 1/14 (7.1%) |
| human review rate | 0/18 (0.0%) |
| abstention rate | 13/18 (72.2%) |
| no-op rate | 0/18 (0.0%) |
| wrong-value writes | 0 |
| field-items affected by system errors | 0 |

## Gold × predicted action
| gold \ pred | ACT | ASK | ABSTAIN | NO_OP |
|---|---|---|---|---|
| ACT | 4 | 0 | 0 | 0 |
| ASK | 1 | 0 | 2 | 0 |
| ABSTAIN | 0 | 0 | 11 | 0 |
| NO_OP | 0 | 0 | 0 | 0 |

## Outcomes
- CORRECT_ACT: 4
- UNSAFE_ACT: 1
- MISSED_ASK: 2
- CORRECT_NO_CHANGE: 11

## Breakdowns
### By field
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| budget | 6 | 0/1 (0.0%) | 0/0 (n/a) | 1/6 (16.7%) | 0/6 (0.0%) | 5/6 (83.3%) |
| decisionMaker | 6 | 2/2 (100.0%) | 2/2 (100.0%) | 0/4 (0.0%) | 0/6 (0.0%) | 4/6 (66.7%) |
| nextMeeting | 6 | 2/2 (100.0%) | 2/2 (100.0%) | 0/4 (0.0%) | 0/6 (0.0%) | 4/6 (66.7%) |

### By source
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| generated | 18 | 4/5 (80.0%) | 4/4 (100.0%) | 1/14 (7.1%) | 0/18 (0.0%) | 13/18 (72.2%) |

### By label status
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| draft | 18 | 4/5 (80.0%) | 4/4 (100.0%) | 1/14 (7.1%) | 0/18 (0.0%) | 13/18 (72.2%) |

### By gold status
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| CURRENT | 8 | 4/5 (80.0%) | 4/4 (100.0%) | 1/4 (25.0%) | 0/8 (0.0%) | 3/8 (37.5%) |
| none | 10 | 0/0 (n/a) | 0/0 (n/a) | 0/10 (0.0%) | 0/10 (0.0%) | 10/10 (100.0%) |

### By gold certainty
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| CONDITIONAL | 1 | 0/0 (n/a) | 0/0 (n/a) | 0/1 (0.0%) | 0/1 (0.0%) | 1/1 (100.0%) |
| EXPLICIT | 6 | 4/5 (80.0%) | 4/4 (100.0%) | 1/2 (50.0%) | 0/6 (0.0%) | 1/6 (16.7%) |
| none | 10 | 0/0 (n/a) | 0/0 (n/a) | 0/10 (0.0%) | 0/10 (0.0%) | 10/10 (100.0%) |
| TENTATIVE | 1 | 0/0 (n/a) | 0/0 (n/a) | 0/1 (0.0%) | 0/1 (0.0%) | 1/1 (100.0%) |

### By case tag (an item appears under every tag of its case)
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| conditional | 3 | 0/0 (n/a) | 0/0 (n/a) | 0/3 (0.0%) | 0/3 (0.0%) | 3/3 (100.0%) |
| existing_value | 3 | 1/2 (50.0%) | 1/1 (100.0%) | 1/2 (50.0%) | 0/3 (0.0%) | 1/3 (33.3%) |
| explicit | 9 | 3/4 (75.0%) | 3/3 (100.0%) | 1/6 (16.7%) | 0/9 (0.0%) | 5/9 (55.6%) |
| explicit_but_insufficient | 3 | 1/1 (100.0%) | 1/1 (100.0%) | 0/2 (0.0%) | 0/3 (0.0%) | 2/3 (66.7%) |
| filler_words | 6 | 1/1 (100.0%) | 1/1 (100.0%) | 0/5 (0.0%) | 0/6 (0.0%) | 5/6 (83.3%) |
| irrelevant_info | 12 | 2/2 (100.0%) | 2/2 (100.0%) | 0/10 (0.0%) | 0/12 (0.0%) | 10/12 (83.3%) |
| joint_approval | 3 | 1/1 (100.0%) | 1/1 (100.0%) | 0/2 (0.0%) | 0/3 (0.0%) | 2/3 (66.7%) |
| messy_speech | 3 | 0/0 (n/a) | 0/0 (n/a) | 0/3 (0.0%) | 0/3 (0.0%) | 3/3 (100.0%) |
| mid_sentence_correction | 3 | 1/1 (100.0%) | 1/1 (100.0%) | 0/2 (0.0%) | 0/3 (0.0%) | 2/3 (66.7%) |
| multiple_numbers | 6 | 1/2 (50.0%) | 1/1 (100.0%) | 1/5 (20.0%) | 0/6 (0.0%) | 4/6 (66.7%) |
| multiple_stakeholders | 6 | 2/2 (100.0%) | 2/2 (100.0%) | 0/4 (0.0%) | 0/6 (0.0%) | 4/6 (66.7%) |
| pronouns | 3 | 1/1 (100.0%) | 1/1 (100.0%) | 0/2 (0.0%) | 0/3 (0.0%) | 2/3 (66.7%) |
| supersession | 6 | 2/3 (66.7%) | 2/2 (100.0%) | 1/4 (25.0%) | 0/6 (0.0%) | 3/6 (50.0%) |
| tentative | 6 | 0/0 (n/a) | 0/0 (n/a) | 0/6 (0.0%) | 0/6 (0.0%) | 6/6 (100.0%) |
| unconfirmed_rep_statement | 3 | 0/0 (n/a) | 0/0 (n/a) | 0/3 (0.0%) | 0/3 (0.0%) | 3/3 (100.0%) |

## Failures (3)
### MISSED_ASK (2)
- **budget-ex-01 · budget · MISSED_ASK**
  - gold: ASK USD 100,000 · CURRENT/CONDITIONAL
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: Answers the budget question directly, but the figure is hedged ('probably', 'around', 'don't quote me') and still pending finance approval. CONDITIONAL takes precedence over TENTATIVE, so ASK.
- **meeting-ex-02 · nextMeeting · MISSED_ASK**
  - gold: ASK 2026-03-19 15:00 ["Thursday at 3"] · CURRENT/TENTATIVE
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: Only the rep commits to the time. The customer backchannels ('Mm') and defers to legal, so the meeting is plausible but not agreed: TENTATIVE + INDIRECT → ASK. Call date Monday 2026-03-16 → Thursday = 2026-03-19.

### UNSAFE_ACT (1)
- **budget-ex-02 · budget · UNSAFE_ACT**
  - gold: ASK USD 120,000 · CURRENT/EXPLICIT
  - pred: ACT USD 120,000 · reasons: BASELINE_PROPOSED
  - gold rationale: 120K is explicitly approved and supersedes 150K. But the CRM already holds 150K, and the default policy never overwrites an existing value autonomously, so ASK.
  - quote: "We've got 120 approved now. That was signed off last week."

