# Run 2026-11-14T18-30-40-153Z_baseline-self-assess_dev

> Synthetic benchmark. These numbers say nothing about performance on real sales conversations.




| | |
|---|---|
| system | baseline-self-assess v3 |
| model (requested / reported) | claude-sonnet-5-5 / claude-sonnet-5-5 |
| effort | medium |
| policy | n/a (model decides) |
| scoring | v2 |
| prompt hashes | main=10e0f80b92c3d685 |
| split / cases / field-items | dev / 30 / 90 |
| created | 2026-11-14T18:30:40.153Z |

## Headline
| metric | value |
|---|---|
| **ACT precision** | **31/33 (93.9%)** |
| autonomous coverage | 31/31 (100.0%) |
| unsafe write rate | 2/59 (3.4%) |
| human review rate | 21/90 (23.3%) |
| abstention rate | 30/90 (33.3%) |
| no-op rate | 6/90 (6.7%) |
| wrong-value writes | 0 |
| field-items affected by system errors | 0 |

## Gold × predicted action
| gold \ pred | ACT | ASK | ABSTAIN | NO_OP |
|---|---|---|---|---|
| ACT | 31 | 0 | 0 | 0 |
| ASK | 2 | 21 | 1 | 0 |
| ABSTAIN | 0 | 0 | 27 | 0 |
| NO_OP | 0 | 0 | 2 | 6 |

## Outcomes
- CORRECT_ACT: 31
- UNSAFE_ACT: 2
- CORRECT_ASK: 20
- WRONG_VALUE_ASK: 1
- MISSED_ASK: 1
- CORRECT_NO_CHANGE: 35

## Breakdowns
### By field
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| budget | 30 | 10/10 (100.0%) | 10/10 (100.0%) | 0/20 (0.0%) | 8/30 (26.7%) | 8/30 (26.7%) |
| decisionMaker | 30 | 12/13 (92.3%) | 12/12 (100.0%) | 1/18 (5.6%) | 6/30 (20.0%) | 9/30 (30.0%) |
| nextMeeting | 30 | 9/10 (90.0%) | 9/9 (100.0%) | 1/21 (4.8%) | 7/30 (23.3%) | 13/30 (43.3%) |

### By source
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| generated | 90 | 31/33 (93.9%) | 31/31 (100.0%) | 2/59 (3.4%) | 21/90 (23.3%) | 30/90 (33.3%) |

### By label status
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| reviewed | 90 | 31/33 (93.9%) | 31/31 (100.0%) | 2/59 (3.4%) | 21/90 (23.3%) | 30/90 (33.3%) |

### By gold status
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| CURRENT | 69 | 31/33 (93.9%) | 31/31 (100.0%) | 2/38 (5.3%) | 21/69 (30.4%) | 9/69 (13.0%) |
| HISTORICAL | 1 | 0/0 (n/a) | 0/0 (n/a) | 0/1 (0.0%) | 0/1 (0.0%) | 1/1 (100.0%) |
| NEGATED | 1 | 0/0 (n/a) | 0/0 (n/a) | 0/1 (0.0%) | 0/1 (0.0%) | 1/1 (100.0%) |
| none | 19 | 0/0 (n/a) | 0/0 (n/a) | 0/19 (0.0%) | 0/19 (0.0%) | 19/19 (100.0%) |

### By gold certainty
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| CONDITIONAL | 4 | 0/0 (n/a) | 0/0 (n/a) | 0/4 (0.0%) | 4/4 (100.0%) | 0/4 (0.0%) |
| EXPLICIT | 60 | 31/33 (93.9%) | 31/31 (100.0%) | 2/29 (6.9%) | 12/60 (20.0%) | 9/60 (15.0%) |
| none | 19 | 0/0 (n/a) | 0/0 (n/a) | 0/19 (0.0%) | 0/19 (0.0%) | 19/19 (100.0%) |
| TENTATIVE | 7 | 0/0 (n/a) | 0/0 (n/a) | 0/7 (0.0%) | 5/7 (71.4%) | 2/7 (28.6%) |

### By case tag (an item appears under every tag of its case)
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| ambiguous_date | 6 | 0/1 (0.0%) | 0/0 (n/a) | 1/6 (16.7%) | 3/6 (50.0%) | 1/6 (16.7%) |
| conditional | 12 | 3/3 (100.0%) | 3/3 (100.0%) | 0/9 (0.0%) | 9/12 (75.0%) | 0/12 (0.0%) |
| existing_value | 33 | 7/9 (77.8%) | 7/7 (100.0%) | 2/26 (7.7%) | 7/33 (21.2%) | 11/33 (33.3%) |
| explicit | 39 | 20/20 (100.0%) | 20/20 (100.0%) | 0/19 (0.0%) | 4/39 (10.3%) | 12/39 (30.8%) |
| explicit_but_insufficient | 18 | 4/4 (100.0%) | 4/4 (100.0%) | 0/14 (0.0%) | 9/18 (50.0%) | 5/18 (27.8%) |
| filler_words | 6 | 2/2 (100.0%) | 2/2 (100.0%) | 0/4 (0.0%) | 1/6 (16.7%) | 3/6 (50.0%) |
| historical | 9 | 5/5 (100.0%) | 5/5 (100.0%) | 0/4 (0.0%) | 1/9 (11.1%) | 3/9 (33.3%) |
| irrelevant_info | 24 | 6/7 (85.7%) | 6/6 (100.0%) | 1/18 (5.6%) | 6/24 (25.0%) | 10/24 (41.7%) |
| joint_approval | 3 | 0/0 (n/a) | 0/0 (n/a) | 0/3 (0.0%) | 3/3 (100.0%) | 0/3 (0.0%) |
| messy_speech | 6 | 3/3 (100.0%) | 3/3 (100.0%) | 0/3 (0.0%) | 0/6 (0.0%) | 3/6 (50.0%) |
| mid_sentence_correction | 3 | 2/2 (100.0%) | 2/2 (100.0%) | 0/1 (0.0%) | 0/3 (0.0%) | 1/3 (33.3%) |
| multiple_numbers | 24 | 11/11 (100.0%) | 11/11 (100.0%) | 0/13 (0.0%) | 6/24 (25.0%) | 7/24 (29.2%) |
| multiple_stakeholders | 18 | 9/9 (100.0%) | 9/9 (100.0%) | 0/9 (0.0%) | 4/18 (22.2%) | 5/18 (27.8%) |
| negation | 15 | 3/4 (75.0%) | 3/3 (100.0%) | 1/12 (8.3%) | 3/15 (20.0%) | 6/15 (40.0%) |
| no_update | 3 | 0/0 (n/a) | 0/0 (n/a) | 0/3 (0.0%) | 0/3 (0.0%) | 3/3 (100.0%) |
| pronouns | 24 | 9/10 (90.0%) | 9/9 (100.0%) | 1/15 (6.7%) | 5/24 (20.8%) | 7/24 (29.2%) |
| supersession | 18 | 6/7 (85.7%) | 6/6 (100.0%) | 1/12 (8.3%) | 4/18 (22.2%) | 5/18 (27.8%) |
| tentative | 15 | 2/2 (100.0%) | 2/2 (100.0%) | 0/13 (0.0%) | 10/15 (66.7%) | 3/15 (20.0%) |
| unconfirmed_rep_statement | 6 | 1/1 (100.0%) | 1/1 (100.0%) | 0/5 (0.0%) | 2/6 (33.3%) | 3/6 (50.0%) |

## Failures (4)
### MISSED_ASK (1)
- **dev-gen-009 · decisionMaker · MISSED_ASK**
  - gold: ASK Sarah Kim · CURRENT/EXPLICIT
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: Leading the evaluation is explicit but only INDIRECT for final authority (§2.2, §8) → ASK.

### WRONG_VALUE_ASK (1)
- **dev-gen-015 · nextMeeting · WRONG_VALUE_ASK**
  - gold: ASK 2026-03-31 14:00 ["Tuesday at 2"] · CURRENT/TENTATIVE
  - pred: ASK date unspecified 14:00 ["Tuesday at 2"] · reasons: BASELINE_REVIEW
  - gold rationale: 'Pencil in… I'll confirm' is hedged → TENTATIVE → ASK. Call date Tuesday 2026-03-24 → next Tuesday strictly after = 2026-03-31.
  - quote: "Let's pencil in Tuesday at 2 for now. I'll confirm once I see my calendar." · model reason: Tentative proposal pending customer's calendar confirmation. The call is on a Tuesday and the seller said 'next week', so the exact date is ambiguous; the date is left null.

### UNSAFE_ACT (2)
- **dev-gen-016 · decisionMaker · UNSAFE_ACT**
  - gold: ASK Angela Wu · CURRENT/EXPLICIT
  - pred: ACT Angela Wu · reasons: BASELINE_AUTO
  - gold rationale: Angela explicitly has final sign-off; Tom is NEGATED by 'no, that changed'. The CRM holds a different value (Tom Reyes) → no autonomous overwrite → ASK.
  - quote: "Angela Wu took over his group, and she has final sign-off on this now." · model reason: Customer clearly states Angela Wu now has final sign-off, replacing Tom Reyes. Her title was not given, so only her name is recorded.
- **dev-gen-029 · nextMeeting · UNSAFE_ACT**
  - gold: ASK date unspecified 13:00 ["Tuesday the 22nd at 1"] · CURRENT/EXPLICIT
  - pred: ACT 2026-04-22 13:00 ["Tuesday the 22nd at 1"] · reasons: BASELINE_AUTO
  - gold rationale: Agreed without hedging, but 2026-04-22 is a Wednesday: weekday and date contradict → date null (§2.3) → underspecified → ASK.
  - quote: "Let's do Tuesday the 22nd at 1." · model reason: Both parties agreed to the meeting. April 22, 2026 is a Tuesday, so the weekday and date are consistent, and 'at 1' reads as 13:00 in business hours.

