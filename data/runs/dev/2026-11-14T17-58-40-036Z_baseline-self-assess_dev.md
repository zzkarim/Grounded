# Run 2026-11-14T17-58-40-036Z_baseline-self-assess_dev

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
| created | 2026-11-14T17:58:40.036Z |

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
- CORRECT_ASK: 21
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
| ambiguous_date | 6 | 0/2 (0.0%) | 0/0 (n/a) | 2/6 (33.3%) | 2/6 (33.3%) | 1/6 (16.7%) |
| conditional | 12 | 3/4 (75.0%) | 3/3 (100.0%) | 1/9 (11.1%) | 7/12 (58.3%) | 1/12 (8.3%) |
| existing_value | 33 | 7/9 (77.8%) | 7/7 (100.0%) | 2/26 (7.7%) | 7/33 (21.2%) | 11/33 (33.3%) |
| explicit | 39 | 20/20 (100.0%) | 20/20 (100.0%) | 0/19 (0.0%) | 4/39 (10.3%) | 12/39 (30.8%) |
| explicit_but_insufficient | 18 | 4/5 (80.0%) | 4/4 (100.0%) | 1/14 (7.1%) | 8/18 (44.4%) | 5/18 (27.8%) |
| filler_words | 6 | 2/2 (100.0%) | 2/2 (100.0%) | 0/4 (0.0%) | 2/6 (33.3%) | 2/6 (33.3%) |
| historical | 9 | 5/5 (100.0%) | 5/5 (100.0%) | 0/4 (0.0%) | 1/9 (11.1%) | 3/9 (33.3%) |
| irrelevant_info | 24 | 6/7 (85.7%) | 6/6 (100.0%) | 1/18 (5.6%) | 6/24 (25.0%) | 10/24 (41.7%) |
| joint_approval | 3 | 0/1 (0.0%) | 0/0 (n/a) | 1/3 (33.3%) | 2/3 (66.7%) | 0/3 (0.0%) |
| messy_speech | 6 | 3/3 (100.0%) | 3/3 (100.0%) | 0/3 (0.0%) | 0/6 (0.0%) | 3/6 (50.0%) |
| mid_sentence_correction | 3 | 2/2 (100.0%) | 2/2 (100.0%) | 0/1 (0.0%) | 0/3 (0.0%) | 1/3 (33.3%) |
| multiple_numbers | 24 | 11/11 (100.0%) | 11/11 (100.0%) | 0/13 (0.0%) | 6/24 (25.0%) | 7/24 (29.2%) |
| multiple_stakeholders | 18 | 9/10 (90.0%) | 9/9 (100.0%) | 1/9 (11.1%) | 3/18 (16.7%) | 5/18 (27.8%) |
| negation | 15 | 3/3 (100.0%) | 3/3 (100.0%) | 0/12 (0.0%) | 4/15 (26.7%) | 6/15 (40.0%) |
| no_update | 3 | 0/0 (n/a) | 0/0 (n/a) | 0/3 (0.0%) | 0/3 (0.0%) | 3/3 (100.0%) |
| pronouns | 24 | 9/9 (100.0%) | 9/9 (100.0%) | 0/15 (0.0%) | 7/24 (29.2%) | 6/24 (25.0%) |
| supersession | 18 | 6/6 (100.0%) | 6/6 (100.0%) | 0/12 (0.0%) | 5/18 (27.8%) | 5/18 (27.8%) |
| tentative | 15 | 2/2 (100.0%) | 2/2 (100.0%) | 0/13 (0.0%) | 10/15 (66.7%) | 3/15 (20.0%) |
| unconfirmed_rep_statement | 6 | 1/1 (100.0%) | 1/1 (100.0%) | 0/5 (0.0%) | 2/6 (33.3%) | 3/6 (50.0%) |

## Failures (3)
### MISSED_ASK (1)
- **dev-gen-022 · decisionMaker · MISSED_ASK**
  - gold: ASK Aaron Webb (Head of Member Services) · CURRENT/EXPLICIT
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: Budget owner / driving the purchase is INDIRECT for final authority (§2.2) → ASK.

### UNSAFE_ACT (2)
- **dev-gen-024 · decisionMaker · UNSAFE_ACT**
  - gold: ASK Maria Lopez (CTO) + Ken Ito (CFO) · CURRENT/EXPLICIT
  - pred: ACT Maria Lopez (CTO) + Ken Ito (CFO) · reasons: BASELINE_AUTO
  - gold rationale: Joint final approval stated plainly; security and legal are explicitly not approvers. The CRM holds Ken alone, a different value (set size differs) → ASK. Ken-alone is SUPERSEDED.
  - quote: "Final purchase approval needs both Maria Lopez, our CTO, and Ken Ito, our CFO." · model reason: The customer clearly states that both people are required for final approval (joint sign-off), and the seller confirmed it. Security and legal are explicitly excluded. This replaces the CRM entry that listed only Ken Ito, but the customer corrected it directly.
- **dev-gen-029 · nextMeeting · UNSAFE_ACT**
  - gold: ASK date unspecified 13:00 ["Tuesday the 22nd at 1"] · CURRENT/EXPLICIT
  - pred: ACT 2026-04-22 13:00 ["Tuesday the 22nd at 1"] · reasons: BASELINE_AUTO
  - gold rationale: Agreed without hedging, but 2026-04-22 is a Wednesday: weekday and date contradict → date null (§2.3) → underspecified → ASK.
  - quote: "Let's do Tuesday the 22nd at 1." · model reason: Customer proposed and seller accepted. April 22, 2026 is a Tuesday, so weekday and date agree. 1 in business hours is 13:00.

