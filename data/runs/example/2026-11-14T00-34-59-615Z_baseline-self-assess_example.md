# Run 2026-11-14T00-34-59-615Z_baseline-self-assess_example

> Synthetic benchmark. These numbers say nothing about performance on real sales conversations.
> ⚠️ 6 case(s) have **draft** labels that the owner has not reviewed. Treat results as provisional.
> ⚠️ `example` split: schema-illustration cases, NOT the benchmark.
> Benchmark split is not frozen.

| | |
|---|---|
| system | baseline-self-assess v1 |
| model (requested / reported) | claude-sonnet-5-5 / claude-sonnet-5-5 |
| effort | medium |
| policy | n/a (model decides) |
| prompt hashes | main=d93433a0612af1b8 |
| split / cases / field-items | example / 6 / 18 |
| created | 2026-11-14T00:34:59.615Z |

## Headline
| metric | value |
|---|---|
| **ACT precision** | **3/3 (100.0%)** |
| autonomous coverage | 3/4 (75.0%) |
| unsafe write rate | 0/14 (0.0%) |
| human review rate | 4/18 (22.2%) |
| abstention rate | 11/18 (61.1%) |
| no-op rate | 0/18 (0.0%) |
| wrong-value writes | 0 |
| field-items affected by system errors | 0 |

## Gold × predicted action
| gold \ pred | ACT | ASK | ABSTAIN | NO_OP |
|---|---|---|---|---|
| ACT | 3 | 1 | 0 | 0 |
| ASK | 0 | 3 | 0 | 0 |
| ABSTAIN | 0 | 0 | 11 | 0 |
| NO_OP | 0 | 0 | 0 | 0 |

## Outcomes
- CORRECT_ACT: 3
- ACT_DOWNGRADED_TO_ASK: 1
- CORRECT_ASK: 3
- CORRECT_NO_CHANGE: 11

## Breakdowns
### By field
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| budget | 6 | 0/0 (n/a) | 0/0 (n/a) | 0/6 (0.0%) | 2/6 (33.3%) | 4/6 (66.7%) |
| decisionMaker | 6 | 1/1 (100.0%) | 1/2 (50.0%) | 0/4 (0.0%) | 1/6 (16.7%) | 4/6 (66.7%) |
| nextMeeting | 6 | 2/2 (100.0%) | 2/2 (100.0%) | 0/4 (0.0%) | 1/6 (16.7%) | 3/6 (50.0%) |

### By source
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| generated | 18 | 3/3 (100.0%) | 3/4 (75.0%) | 0/14 (0.0%) | 4/18 (22.2%) | 11/18 (61.1%) |

### By label status
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| draft | 18 | 3/3 (100.0%) | 3/4 (75.0%) | 0/14 (0.0%) | 4/18 (22.2%) | 11/18 (61.1%) |

### By gold status
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| CURRENT | 8 | 3/3 (100.0%) | 3/4 (75.0%) | 0/4 (0.0%) | 4/8 (50.0%) | 1/8 (12.5%) |
| none | 10 | 0/0 (n/a) | 0/0 (n/a) | 0/10 (0.0%) | 0/10 (0.0%) | 10/10 (100.0%) |

### By gold certainty
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| CONDITIONAL | 1 | 0/0 (n/a) | 0/0 (n/a) | 0/1 (0.0%) | 1/1 (100.0%) | 0/1 (0.0%) |
| EXPLICIT | 6 | 3/3 (100.0%) | 3/4 (75.0%) | 0/2 (0.0%) | 2/6 (33.3%) | 1/6 (16.7%) |
| none | 10 | 0/0 (n/a) | 0/0 (n/a) | 0/10 (0.0%) | 0/10 (0.0%) | 10/10 (100.0%) |
| TENTATIVE | 1 | 0/0 (n/a) | 0/0 (n/a) | 0/1 (0.0%) | 1/1 (100.0%) | 0/1 (0.0%) |

### By case tag (an item appears under every tag of its case)
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| conditional | 3 | 0/0 (n/a) | 0/0 (n/a) | 0/3 (0.0%) | 1/3 (33.3%) | 2/3 (66.7%) |
| existing_value | 3 | 1/1 (100.0%) | 1/1 (100.0%) | 0/2 (0.0%) | 1/3 (33.3%) | 1/3 (33.3%) |
| explicit | 9 | 2/2 (100.0%) | 2/3 (66.7%) | 0/6 (0.0%) | 2/9 (22.2%) | 5/9 (55.6%) |
| explicit_but_insufficient | 3 | 0/0 (n/a) | 0/1 (0.0%) | 0/2 (0.0%) | 1/3 (33.3%) | 2/3 (66.7%) |
| filler_words | 6 | 1/1 (100.0%) | 1/1 (100.0%) | 0/5 (0.0%) | 1/6 (16.7%) | 4/6 (66.7%) |
| irrelevant_info | 12 | 1/1 (100.0%) | 1/2 (50.0%) | 0/10 (0.0%) | 3/12 (25.0%) | 8/12 (66.7%) |
| joint_approval | 3 | 1/1 (100.0%) | 1/1 (100.0%) | 0/2 (0.0%) | 0/3 (0.0%) | 2/3 (66.7%) |
| messy_speech | 3 | 0/0 (n/a) | 0/0 (n/a) | 0/3 (0.0%) | 1/3 (33.3%) | 2/3 (66.7%) |
| mid_sentence_correction | 3 | 1/1 (100.0%) | 1/1 (100.0%) | 0/2 (0.0%) | 0/3 (0.0%) | 2/3 (66.7%) |
| multiple_numbers | 6 | 1/1 (100.0%) | 1/1 (100.0%) | 0/5 (0.0%) | 2/6 (33.3%) | 3/6 (50.0%) |
| multiple_stakeholders | 6 | 1/1 (100.0%) | 1/2 (50.0%) | 0/4 (0.0%) | 1/6 (16.7%) | 4/6 (66.7%) |
| pronouns | 3 | 0/0 (n/a) | 0/1 (0.0%) | 0/2 (0.0%) | 1/3 (33.3%) | 2/3 (66.7%) |
| supersession | 6 | 2/2 (100.0%) | 2/2 (100.0%) | 0/4 (0.0%) | 1/6 (16.7%) | 3/6 (50.0%) |
| tentative | 6 | 0/0 (n/a) | 0/0 (n/a) | 0/6 (0.0%) | 2/6 (33.3%) | 4/6 (66.7%) |
| unconfirmed_rep_statement | 3 | 0/0 (n/a) | 0/0 (n/a) | 0/3 (0.0%) | 1/3 (33.3%) | 2/3 (66.7%) |

## Failures (1)
### ACT_DOWNGRADED_TO_ASK (1)
- **dm-ex-01 · decisionMaker · ACT_DOWNGRADED_TO_ASK**
  - gold: ACT Marcus (CFO) · CURRENT/EXPLICIT
  - pred: ASK Marcus (CFO) · reasons: BASELINE_REVIEW
  - gold rationale: Contract signature authority is stated plainly by the customer ('He' = Marcus). Sarah leads the evaluation, which is explicit but only INDIRECT for decision maker, and she is not the gold value.
  - quote: "That's Marcus, our CFO. He signs off on all vendor contracts." · model reason: Tom identifies the CFO Marcus as the signer for vendor contracts, but only a first name is given. Marcus's sign-off on all vendor contracts is probably the final approval for this purchase, but a human should confirm his full name. The 50K figure is a legal review threshold, not a budget, so budget stays null.}}

