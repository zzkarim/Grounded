# Run 2026-11-15T22-43-14-733Z_baseline-naive_test

> Synthetic benchmark. These numbers say nothing about performance on real sales conversations.




| | |
|---|---|
| system | baseline-naive v2 |
| model (requested / reported) | claude-sonnet-5-5 / claude-sonnet-5-5 |
| effort | medium |
| policy | n/a (model decides) |
| scoring | v2 |
| prompt hashes | main=0c85a4c4af3a9e75 |
| split / cases / field-items | test / 60 / 180 |
| created | 2026-11-15T22:43:14.733Z |

## Headline
| metric | value |
|---|---|
| **ACT precision** | **56/91 (61.5%)** |
| autonomous coverage | 56/59 (94.9%) |
| unsafe write rate | 32/121 (26.4%) |
| human review rate | 0/180 (0.0%) |
| abstention rate | 89/180 (49.4%) |
| no-op rate | 0/180 (0.0%) |
| wrong-value writes | 3 |
| field-items affected by system errors | 0 |

## Gold × predicted action
| gold \ pred | ACT | ASK | ABSTAIN | NO_OP |
|---|---|---|---|---|
| ACT | 59 | 0 | 0 | 0 |
| ASK | 32 | 0 | 18 | 0 |
| ABSTAIN | 0 | 0 | 50 | 0 |
| NO_OP | 0 | 0 | 21 | 0 |

## Outcomes
- CORRECT_ACT: 56
- WRONG_VALUE_ACT: 3
- UNSAFE_ACT: 32
- MISSED_ASK: 18
- CORRECT_NO_CHANGE: 71

## Breakdowns
### By field
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| budget | 60 | 14/26 (53.8%) | 14/16 (87.5%) | 10/44 (22.7%) | 0/60 (0.0%) | 34/60 (56.7%) |
| decisionMaker | 60 | 21/29 (72.4%) | 21/21 (100.0%) | 8/39 (20.5%) | 0/60 (0.0%) | 31/60 (51.7%) |
| nextMeeting | 60 | 21/36 (58.3%) | 21/22 (95.5%) | 14/38 (36.8%) | 0/60 (0.0%) | 24/60 (40.0%) |

### By source
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| generated | 180 | 56/91 (61.5%) | 56/59 (94.9%) | 32/121 (26.4%) | 0/180 (0.0%) | 89/180 (49.4%) |

### By label status
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| reviewed | 180 | 56/91 (61.5%) | 56/59 (94.9%) | 32/121 (26.4%) | 0/180 (0.0%) | 89/180 (49.4%) |

### By gold status
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| CURRENT | 152 | 56/91 (61.5%) | 56/59 (94.9%) | 32/93 (34.4%) | 0/152 (0.0%) | 61/152 (40.1%) |
| HISTORICAL | 3 | 0/0 (n/a) | 0/0 (n/a) | 0/3 (0.0%) | 0/3 (0.0%) | 3/3 (100.0%) |
| NEGATED | 6 | 0/0 (n/a) | 0/0 (n/a) | 0/6 (0.0%) | 0/6 (0.0%) | 6/6 (100.0%) |
| none | 18 | 0/0 (n/a) | 0/0 (n/a) | 0/18 (0.0%) | 0/18 (0.0%) | 18/18 (100.0%) |
| SUPERSEDED | 1 | 0/0 (n/a) | 0/0 (n/a) | 0/1 (0.0%) | 0/1 (0.0%) | 1/1 (100.0%) |

### By gold certainty
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| CONDITIONAL | 8 | 0/2 (0.0%) | 0/0 (n/a) | 2/8 (25.0%) | 0/8 (0.0%) | 6/8 (75.0%) |
| EXPLICIT | 134 | 56/85 (65.9%) | 56/59 (94.9%) | 26/75 (34.7%) | 0/134 (0.0%) | 49/134 (36.6%) |
| none | 18 | 0/0 (n/a) | 0/0 (n/a) | 0/18 (0.0%) | 0/18 (0.0%) | 18/18 (100.0%) |
| TENTATIVE | 20 | 0/4 (0.0%) | 0/0 (n/a) | 4/20 (20.0%) | 0/20 (0.0%) | 16/20 (80.0%) |

### By case tag (an item appears under every tag of its case)
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| ambiguous_date | 18 | 6/13 (46.2%) | 6/6 (100.0%) | 7/12 (58.3%) | 0/18 (0.0%) | 5/18 (27.8%) |
| conditional | 21 | 7/11 (63.6%) | 7/7 (100.0%) | 4/14 (28.6%) | 0/21 (0.0%) | 10/21 (47.6%) |
| existing_value | 84 | 17/37 (45.9%) | 17/17 (100.0%) | 20/67 (29.9%) | 0/84 (0.0%) | 47/84 (56.0%) |
| explicit | 66 | 33/37 (89.2%) | 33/34 (97.1%) | 3/32 (9.4%) | 0/66 (0.0%) | 29/66 (43.9%) |
| explicit_but_insufficient | 33 | 7/13 (53.8%) | 7/7 (100.0%) | 6/26 (23.1%) | 0/33 (0.0%) | 20/33 (60.6%) |
| filler_words | 9 | 2/3 (66.7%) | 2/2 (100.0%) | 1/7 (14.3%) | 0/9 (0.0%) | 6/9 (66.7%) |
| historical | 18 | 4/9 (44.4%) | 4/4 (100.0%) | 5/14 (35.7%) | 0/18 (0.0%) | 9/18 (50.0%) |
| irrelevant_info | 30 | 7/10 (70.0%) | 7/8 (87.5%) | 2/22 (9.1%) | 0/30 (0.0%) | 20/30 (66.7%) |
| joint_approval | 12 | 4/8 (50.0%) | 4/4 (100.0%) | 4/8 (50.0%) | 0/12 (0.0%) | 4/12 (33.3%) |
| messy_speech | 9 | 3/5 (60.0%) | 3/3 (100.0%) | 2/6 (33.3%) | 0/9 (0.0%) | 4/9 (44.4%) |
| mid_sentence_correction | 12 | 5/7 (71.4%) | 5/6 (83.3%) | 1/6 (16.7%) | 0/12 (0.0%) | 5/12 (41.7%) |
| multiple_numbers | 51 | 19/30 (63.3%) | 19/21 (90.5%) | 9/30 (30.0%) | 0/51 (0.0%) | 21/51 (41.2%) |
| multiple_stakeholders | 63 | 23/40 (57.5%) | 23/25 (92.0%) | 15/38 (39.5%) | 0/63 (0.0%) | 23/63 (36.5%) |
| negation | 15 | 4/7 (57.1%) | 4/4 (100.0%) | 3/11 (27.3%) | 0/15 (0.0%) | 8/15 (53.3%) |
| no_update | 18 | 1/1 (100.0%) | 1/1 (100.0%) | 0/17 (0.0%) | 0/18 (0.0%) | 17/18 (94.4%) |
| pronouns | 12 | 5/8 (62.5%) | 5/6 (83.3%) | 2/6 (33.3%) | 0/12 (0.0%) | 4/12 (33.3%) |
| supersession | 45 | 11/25 (44.0%) | 11/12 (91.7%) | 13/33 (39.4%) | 0/45 (0.0%) | 20/45 (44.4%) |
| tentative | 48 | 13/24 (54.2%) | 13/14 (92.9%) | 10/34 (29.4%) | 0/48 (0.0%) | 24/48 (50.0%) |
| unconfirmed_rep_statement | 24 | 7/10 (70.0%) | 7/7 (100.0%) | 3/17 (17.6%) | 0/24 (0.0%) | 14/24 (58.3%) |

## Failures (53)
Failure details hidden (held-out split). Use `--show-failures` only for the final analysis.
