# Run 2026-11-15T22-44-21-745Z_baseline-self-assess_test

> Synthetic benchmark. These numbers say nothing about performance on real sales conversations.




| | |
|---|---|
| system | baseline-self-assess v3 |
| model (requested / reported) | claude-sonnet-5-5 / claude-sonnet-5-5 |
| effort | medium |
| policy | n/a (model decides) |
| scoring | v2 |
| prompt hashes | main=10e0f80b92c3d685 |
| split / cases / field-items | test / 60 / 180 |
| created | 2026-11-15T22:44:21.745Z |

## Headline
| metric | value |
|---|---|
| **ACT precision** | **50/56 (89.3%)** |
| autonomous coverage | 50/59 (84.7%) |
| unsafe write rate | 6/121 (5.0%) |
| human review rate | 53/180 (29.4%) |
| abstention rate | 57/180 (31.7%) |
| no-op rate | 14/180 (7.8%) |
| wrong-value writes | 0 |
| field-items affected by system errors | 0 |

## Gold × predicted action
| gold \ pred | ACT | ASK | ABSTAIN | NO_OP |
|---|---|---|---|---|
| ACT | 50 | 9 | 0 | 0 |
| ASK | 6 | 42 | 2 | 0 |
| ABSTAIN | 0 | 2 | 48 | 0 |
| NO_OP | 0 | 0 | 7 | 14 |

## Outcomes
- CORRECT_ACT: 50
- UNSAFE_ACT: 6
- ACT_DOWNGRADED_TO_ASK: 9
- CORRECT_ASK: 39
- WRONG_VALUE_ASK: 3
- MISSED_ASK: 2
- UNNECESSARY_ASK: 2
- CORRECT_NO_CHANGE: 69

## Breakdowns
### By field
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| budget | 60 | 7/7 (100.0%) | 7/16 (43.8%) | 0/44 (0.0%) | 27/60 (45.0%) | 21/60 (35.0%) |
| decisionMaker | 60 | 21/24 (87.5%) | 21/21 (100.0%) | 3/39 (7.7%) | 13/60 (21.7%) | 16/60 (26.7%) |
| nextMeeting | 60 | 22/25 (88.0%) | 22/22 (100.0%) | 3/38 (7.9%) | 13/60 (21.7%) | 20/60 (33.3%) |

### By source
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| generated | 180 | 50/56 (89.3%) | 50/59 (84.7%) | 6/121 (5.0%) | 53/180 (29.4%) | 57/180 (31.7%) |

### By label status
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| reviewed | 180 | 50/56 (89.3%) | 50/59 (84.7%) | 6/121 (5.0%) | 53/180 (29.4%) | 57/180 (31.7%) |

### By gold status
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| CURRENT | 152 | 50/56 (89.3%) | 50/59 (84.7%) | 6/93 (6.5%) | 52/152 (34.2%) | 30/152 (19.7%) |
| HISTORICAL | 3 | 0/0 (n/a) | 0/0 (n/a) | 0/3 (0.0%) | 0/3 (0.0%) | 3/3 (100.0%) |
| NEGATED | 6 | 0/0 (n/a) | 0/0 (n/a) | 0/6 (0.0%) | 0/6 (0.0%) | 6/6 (100.0%) |
| none | 18 | 0/0 (n/a) | 0/0 (n/a) | 0/18 (0.0%) | 1/18 (5.6%) | 17/18 (94.4%) |
| SUPERSEDED | 1 | 0/0 (n/a) | 0/0 (n/a) | 0/1 (0.0%) | 0/1 (0.0%) | 1/1 (100.0%) |

### By gold certainty
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| CONDITIONAL | 8 | 0/0 (n/a) | 0/0 (n/a) | 0/8 (0.0%) | 7/8 (87.5%) | 1/8 (12.5%) |
| EXPLICIT | 134 | 50/56 (89.3%) | 50/59 (84.7%) | 6/75 (8.0%) | 32/134 (23.9%) | 34/134 (25.4%) |
| none | 18 | 0/0 (n/a) | 0/0 (n/a) | 0/18 (0.0%) | 1/18 (5.6%) | 17/18 (94.4%) |
| TENTATIVE | 20 | 0/0 (n/a) | 0/0 (n/a) | 0/20 (0.0%) | 13/20 (65.0%) | 5/20 (25.0%) |

### By case tag (an item appears under every tag of its case)
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| ambiguous_date | 18 | 5/6 (83.3%) | 5/6 (83.3%) | 1/12 (8.3%) | 8/18 (44.4%) | 4/18 (22.2%) |
| conditional | 21 | 7/7 (100.0%) | 7/7 (100.0%) | 0/14 (0.0%) | 10/21 (47.6%) | 4/21 (19.0%) |
| existing_value | 84 | 13/18 (72.2%) | 13/17 (76.5%) | 5/67 (7.5%) | 20/84 (23.8%) | 32/84 (38.1%) |
| explicit | 66 | 30/31 (96.8%) | 30/34 (88.2%) | 1/32 (3.1%) | 15/66 (22.7%) | 14/66 (21.2%) |
| explicit_but_insufficient | 33 | 7/8 (87.5%) | 7/7 (100.0%) | 1/26 (3.8%) | 9/33 (27.3%) | 15/33 (45.5%) |
| filler_words | 9 | 1/1 (100.0%) | 1/2 (50.0%) | 0/7 (0.0%) | 2/9 (22.2%) | 4/9 (44.4%) |
| historical | 18 | 4/4 (100.0%) | 4/4 (100.0%) | 0/14 (0.0%) | 7/18 (38.9%) | 6/18 (33.3%) |
| irrelevant_info | 30 | 6/8 (75.0%) | 6/8 (75.0%) | 2/22 (9.1%) | 3/30 (10.0%) | 17/30 (56.7%) |
| joint_approval | 12 | 3/4 (75.0%) | 3/4 (75.0%) | 1/8 (12.5%) | 6/12 (50.0%) | 2/12 (16.7%) |
| messy_speech | 9 | 2/2 (100.0%) | 2/3 (66.7%) | 0/6 (0.0%) | 3/9 (33.3%) | 1/9 (11.1%) |
| mid_sentence_correction | 12 | 4/4 (100.0%) | 4/6 (66.7%) | 0/6 (0.0%) | 4/12 (33.3%) | 2/12 (16.7%) |
| multiple_numbers | 51 | 16/18 (88.9%) | 16/21 (76.2%) | 2/30 (6.7%) | 13/51 (25.5%) | 18/51 (35.3%) |
| multiple_stakeholders | 63 | 20/22 (90.9%) | 20/25 (80.0%) | 2/38 (5.3%) | 25/63 (39.7%) | 14/63 (22.2%) |
| negation | 15 | 3/3 (100.0%) | 3/4 (75.0%) | 0/11 (0.0%) | 5/15 (33.3%) | 7/15 (46.7%) |
| no_update | 18 | 1/1 (100.0%) | 1/1 (100.0%) | 0/17 (0.0%) | 0/18 (0.0%) | 17/18 (94.4%) |
| pronouns | 12 | 5/5 (100.0%) | 5/6 (83.3%) | 0/6 (0.0%) | 4/12 (33.3%) | 3/12 (25.0%) |
| supersession | 45 | 10/13 (76.9%) | 10/12 (83.3%) | 3/33 (9.1%) | 14/45 (31.1%) | 15/45 (33.3%) |
| tentative | 48 | 12/14 (85.7%) | 12/14 (85.7%) | 2/34 (5.9%) | 22/48 (45.8%) | 8/48 (16.7%) |
| unconfirmed_rep_statement | 24 | 6/6 (100.0%) | 6/7 (85.7%) | 0/17 (0.0%) | 9/24 (37.5%) | 7/24 (29.2%) |

## Failures (22)
Failure details hidden (held-out split). Use `--show-failures` only for the final analysis.
