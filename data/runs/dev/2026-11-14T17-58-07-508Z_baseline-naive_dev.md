# Run 2026-11-14T17-58-07-508Z_baseline-naive_dev

> Synthetic benchmark. These numbers say nothing about performance on real sales conversations.




| | |
|---|---|
| system | baseline-naive v2 |
| model (requested / reported) | claude-sonnet-5-5 / claude-sonnet-5-5 |
| effort | medium |
| policy | n/a (model decides) |
| scoring | v2 |
| prompt hashes | main=0c85a4c4af3a9e75 |
| split / cases / field-items | dev / 30 / 90 |
| created | 2026-11-14T17:58:07.508Z |

## Headline
| metric | value |
|---|---|
| **ACT precision** | **31/46 (67.4%)** |
| autonomous coverage | 31/31 (100.0%) |
| unsafe write rate | 15/59 (25.4%) |
| human review rate | 0/90 (0.0%) |
| abstention rate | 44/90 (48.9%) |
| no-op rate | 0/90 (0.0%) |
| wrong-value writes | 0 |
| field-items affected by system errors | 0 |

## Gold × predicted action
| gold \ pred | ACT | ASK | ABSTAIN | NO_OP |
|---|---|---|---|---|
| ACT | 31 | 0 | 0 | 0 |
| ASK | 15 | 0 | 9 | 0 |
| ABSTAIN | 0 | 0 | 27 | 0 |
| NO_OP | 0 | 0 | 8 | 0 |

## Outcomes
- CORRECT_ACT: 31
- UNSAFE_ACT: 15
- MISSED_ASK: 9
- CORRECT_NO_CHANGE: 35

## Breakdowns
### By field
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| budget | 30 | 10/14 (71.4%) | 10/10 (100.0%) | 4/20 (20.0%) | 0/30 (0.0%) | 16/30 (53.3%) |
| decisionMaker | 30 | 12/16 (75.0%) | 12/12 (100.0%) | 4/18 (22.2%) | 0/30 (0.0%) | 14/30 (46.7%) |
| nextMeeting | 30 | 9/16 (56.3%) | 9/9 (100.0%) | 7/21 (33.3%) | 0/30 (0.0%) | 14/30 (46.7%) |

### By source
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| generated | 90 | 31/46 (67.4%) | 31/31 (100.0%) | 15/59 (25.4%) | 0/90 (0.0%) | 44/90 (48.9%) |

### By label status
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| reviewed | 90 | 31/46 (67.4%) | 31/31 (100.0%) | 15/59 (25.4%) | 0/90 (0.0%) | 44/90 (48.9%) |

### By gold status
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| CURRENT | 69 | 31/46 (67.4%) | 31/31 (100.0%) | 15/38 (39.5%) | 0/69 (0.0%) | 23/69 (33.3%) |
| HISTORICAL | 1 | 0/0 (n/a) | 0/0 (n/a) | 0/1 (0.0%) | 0/1 (0.0%) | 1/1 (100.0%) |
| NEGATED | 1 | 0/0 (n/a) | 0/0 (n/a) | 0/1 (0.0%) | 0/1 (0.0%) | 1/1 (100.0%) |
| none | 19 | 0/0 (n/a) | 0/0 (n/a) | 0/19 (0.0%) | 0/19 (0.0%) | 19/19 (100.0%) |

### By gold certainty
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| CONDITIONAL | 4 | 0/1 (0.0%) | 0/0 (n/a) | 1/4 (25.0%) | 0/4 (0.0%) | 3/4 (75.0%) |
| EXPLICIT | 60 | 31/42 (73.8%) | 31/31 (100.0%) | 11/29 (37.9%) | 0/60 (0.0%) | 18/60 (30.0%) |
| none | 19 | 0/0 (n/a) | 0/0 (n/a) | 0/19 (0.0%) | 0/19 (0.0%) | 19/19 (100.0%) |
| TENTATIVE | 7 | 0/3 (0.0%) | 0/0 (n/a) | 3/7 (42.9%) | 0/7 (0.0%) | 4/7 (57.1%) |

### By case tag (an item appears under every tag of its case)
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| ambiguous_date | 6 | 0/3 (0.0%) | 0/0 (n/a) | 3/6 (50.0%) | 0/6 (0.0%) | 3/6 (50.0%) |
| conditional | 12 | 3/8 (37.5%) | 3/3 (100.0%) | 5/9 (55.6%) | 0/12 (0.0%) | 4/12 (33.3%) |
| existing_value | 33 | 7/15 (46.7%) | 7/7 (100.0%) | 8/26 (30.8%) | 0/33 (0.0%) | 18/33 (54.5%) |
| explicit | 39 | 20/24 (83.3%) | 20/20 (100.0%) | 4/19 (21.1%) | 0/39 (0.0%) | 15/39 (38.5%) |
| explicit_but_insufficient | 18 | 4/7 (57.1%) | 4/4 (100.0%) | 3/14 (21.4%) | 0/18 (0.0%) | 11/18 (61.1%) |
| filler_words | 6 | 2/2 (100.0%) | 2/2 (100.0%) | 0/4 (0.0%) | 0/6 (0.0%) | 4/6 (66.7%) |
| historical | 9 | 5/6 (83.3%) | 5/5 (100.0%) | 1/4 (25.0%) | 0/9 (0.0%) | 3/9 (33.3%) |
| irrelevant_info | 24 | 6/10 (60.0%) | 6/6 (100.0%) | 4/18 (22.2%) | 0/24 (0.0%) | 14/24 (58.3%) |
| joint_approval | 3 | 0/2 (0.0%) | 0/0 (n/a) | 2/3 (66.7%) | 0/3 (0.0%) | 1/3 (33.3%) |
| messy_speech | 6 | 3/3 (100.0%) | 3/3 (100.0%) | 0/3 (0.0%) | 0/6 (0.0%) | 3/6 (50.0%) |
| mid_sentence_correction | 3 | 2/2 (100.0%) | 2/2 (100.0%) | 0/1 (0.0%) | 0/3 (0.0%) | 1/3 (33.3%) |
| multiple_numbers | 24 | 11/17 (64.7%) | 11/11 (100.0%) | 6/13 (46.2%) | 0/24 (0.0%) | 7/24 (29.2%) |
| multiple_stakeholders | 18 | 9/12 (75.0%) | 9/9 (100.0%) | 3/9 (33.3%) | 0/18 (0.0%) | 6/18 (33.3%) |
| negation | 15 | 3/6 (50.0%) | 3/3 (100.0%) | 3/12 (25.0%) | 0/15 (0.0%) | 9/15 (60.0%) |
| no_update | 3 | 0/0 (n/a) | 0/0 (n/a) | 0/3 (0.0%) | 0/3 (0.0%) | 3/3 (100.0%) |
| pronouns | 24 | 9/13 (69.2%) | 9/9 (100.0%) | 4/15 (26.7%) | 0/24 (0.0%) | 11/24 (45.8%) |
| supersession | 18 | 6/11 (54.5%) | 6/6 (100.0%) | 5/12 (41.7%) | 0/18 (0.0%) | 7/18 (38.9%) |
| tentative | 15 | 2/6 (33.3%) | 2/2 (100.0%) | 4/13 (30.8%) | 0/15 (0.0%) | 9/15 (60.0%) |
| unconfirmed_rep_statement | 6 | 1/1 (100.0%) | 1/1 (100.0%) | 0/5 (0.0%) | 0/6 (0.0%) | 5/6 (83.3%) |

## Failures (24)
### MISSED_ASK (9)
- **dev-gen-009 · budget · MISSED_ASK**
  - gold: ASK USD 70,000 · CURRENT/TENTATIVE
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: Answers the budget question but is hedged ('ballpark', 'probably around', needs double-checking) → TENTATIVE → ASK.
- **dev-gen-009 · decisionMaker · MISSED_ASK**
  - gold: ASK Sarah Kim · CURRENT/EXPLICIT
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: Leading the evaluation is explicit but only INDIRECT for final authority (§2.2, §8) → ASK.
- **dev-gen-010 · budget · MISSED_ASK**
  - gold: ASK USD 150,000 · CURRENT/CONDITIONAL
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: The amount depends on an event that hasn't happened (plan finalization) → CONDITIONAL → ASK.
- **dev-gen-019 · decisionMaker · MISSED_ASK**
  - gold: ASK Greg Novak · CURRENT/EXPLICIT
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: 'Run it by' gives Greg a role in the decision without stated final authority → INDIRECT → ASK.
- **dev-gen-022 · budget · MISSED_ASK**
  - gold: ASK USD 30,000 · CURRENT/CONDITIONAL
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: Approximate ('about') and pending formal approval → CONDITIONAL (precedence over TENTATIVE) → ASK.
- **dev-gen-022 · decisionMaker · MISSED_ASK**
  - gold: ASK Aaron Webb (Head of Member Services) · CURRENT/EXPLICIT
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: Budget owner / driving the purchase is INDIRECT for final authority (§2.2) → ASK.
- **dev-gen-024 · budget · MISSED_ASK**
  - gold: ASK USD 200,000–250,000 · CURRENT/CONDITIONAL
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: A hedged range that depends on a pending event (the security review) → CONDITIONAL (precedence over TENTATIVE) → ASK. Stored as a range; no midpoint.
- **dev-gen-028 · decisionMaker · MISSED_ASK**
  - gold: ASK Grace Liu · CURRENT/EXPLICIT
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: A security approver not stated as final → INDIRECT (§2.2) → ASK.
- **dev-gen-028 · nextMeeting · MISSED_ASK**
  - gold: ASK 2026-04-14 11:00 ["Tuesday at 11"] · CURRENT/TENTATIVE
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: Rep-only proposal; the customer defers without accepting → TENTATIVE, and mutual agreement isn't established → INDIRECT → ASK (same pattern as meeting-ex-02). Call date Wednesday 2026-04-08 → Tuesday 2026-04-14. The Monday quote deadline is NONE.

### UNSAFE_ACT (15)
- **dev-gen-010 · nextMeeting · UNSAFE_ACT**
  - gold: ASK 2026-03-19 15:00 ["Thursday at 3"] · CURRENT/TENTATIVE
  - pred: ACT 2026-03-19 15:00 ["Thursday at 3"] · reasons: BASELINE_PROPOSED
  - gold rationale: Hedged acceptance ('should work', will confirm) → TENTATIVE → ASK. Call date Monday 2026-03-16 → Thursday 2026-03-19, 15:00 from the rep's proposal.
  - quote: "Could we get time with the dispatch leads this week? Thursday at 3?"
- **dev-gen-011 · decisionMaker · UNSAFE_ACT**
  - gold: ASK James · CURRENT/EXPLICIT
  - pred: ACT James · reasons: BASELINE_PROPOSED
  - gold rationale: 'Run it by James' is a role in the decision short of stated final authority → INDIRECT → ASK (§2.2).
  - quote: "I'll need to run this by James before anything gets signed."
- **dev-gen-011 · nextMeeting · UNSAFE_ACT**
  - gold: ASK date unspecified ["sometime next week"] · CURRENT/EXPLICIT
  - pred: ACT date unspecified ["sometime next week"] · reasons: BASELINE_PROPOSED
  - gold rationale: A meeting is agreed but no specific day → date null → underspecified → ASK (§8 edge case).
  - quote: "Yeah, let's talk sometime next week."
- **dev-gen-013 · budget · UNSAFE_ACT**
  - gold: ASK USD 65,000 · CURRENT/EXPLICIT
  - pred: ACT USD 65,000 · reasons: BASELINE_PROPOSED
  - gold rationale: 65K is explicitly approved and supersedes 50K, but the CRM holds a different value (50K) → no autonomous overwrite → ASK.
  - quote: "Finance approved sixty-five last week."
- **dev-gen-015 · budget · UNSAFE_ACT**
  - gold: ASK USD 50,000 · CURRENT/EXPLICIT
  - pred: ACT USD 50,000 · reasons: BASELINE_PROPOSED
  - gold rationale: Only components are approved and no total is stated → value is the derived sum 50,000 with INDIRECT sufficiency (§2.1) → ASK.
  - quote: "We've got forty approved for the licenses, and another ten approved for implementation services."
- **dev-gen-015 · nextMeeting · UNSAFE_ACT**
  - gold: ASK 2026-03-31 14:00 ["Tuesday at 2"] · CURRENT/TENTATIVE
  - pred: ACT date unspecified 14:00 ["Tuesday at 2"] · reasons: BASELINE_PROPOSED
  - gold rationale: 'Pencil in… I'll confirm' is hedged → TENTATIVE → ASK. Call date Tuesday 2026-03-24 → next Tuesday strictly after = 2026-03-31.
  - quote: "Let's pencil in Tuesday at 2 for now. I'll confirm once I see my calendar."
- **dev-gen-016 · decisionMaker · UNSAFE_ACT**
  - gold: ASK Angela Wu · CURRENT/EXPLICIT
  - pred: ACT Angela Wu · reasons: BASELINE_PROPOSED
  - gold rationale: Angela explicitly has final sign-off; Tom is NEGATED by 'no, that changed'. The CRM holds a different value (Tom Reyes) → no autonomous overwrite → ASK.
  - quote: "Angela Wu took over his group, and she has final sign-off on this now."
- **dev-gen-020 · nextMeeting · UNSAFE_ACT**
  - gold: ASK 2026-04-03 15:00 ["Friday the 3rd at 3"] · CURRENT/EXPLICIT
  - pred: ACT 2026-04-03 15:00 ["Friday the 3rd at 3"] · reasons: BASELINE_PROPOSED
  - gold rationale: Customer proposes and rep accepts → agreed; 2026-04-03 is a Friday. The old Thursday meeting is SUPERSEDED, and the CRM holds a different value → no autonomous overwrite → ASK.
  - quote: "Friday the 3rd at 3 works. I'll update the invite."
- **dev-gen-022 · nextMeeting · UNSAFE_ACT**
  - gold: ASK date unspecified ["early next month"] · CURRENT/TENTATIVE
  - pred: ACT date unspecified ["early next month"] · reasons: BASELINE_PROPOSED
  - gold rationale: 'Aim for' is hedged and there is no specific day (date null) → ASK.
  - quote: "Yeah, let's aim for early next month."
- **dev-gen-024 · decisionMaker · UNSAFE_ACT**
  - gold: ASK Maria Lopez (CTO) + Ken Ito (CFO) · CURRENT/EXPLICIT
  - pred: ACT Maria Lopez (CTO) + Ken Ito (CFO) · reasons: BASELINE_PROPOSED
  - gold rationale: Joint final approval stated plainly; security and legal are explicitly not approvers. The CRM holds Ken alone, a different value (set size differs) → ASK. Ken-alone is SUPERSEDED.
  - quote: "Final purchase approval needs both Maria Lopez, our CTO, and Ken Ito, our CFO."
- **dev-gen-024 · nextMeeting · UNSAFE_ACT**
  - gold: ASK date unspecified 11:00 ["next Thursday at 11"] · CURRENT/EXPLICIT
  - pred: ACT date unspecified 11:00 ["next Thursday at 11"] · reasons: BASELINE_PROPOSED
  - gold rationale: Agreed without hedging, but 'next Thursday' is ambiguous under §2.3 → date null → underspecified → ASK.
  - quote: "Next Thursday at 11 works."
- **dev-gen-025 · decisionMaker · UNSAFE_ACT**
  - gold: ASK Rachel Kim (VP of Finance) · CURRENT/EXPLICIT
  - pred: ACT Rachel Kim (VP of Finance) · reasons: BASELINE_PROPOSED
  - gold rationale: The rep's assumption (Alan) is denied → NEGATED. Rachel explicitly has final sign-off, but the CRM holds Alan Brooks → no autonomous overwrite → ASK.
  - quote: "It's Rachel Kim now. She's our new VP of Finance and she has final sign-off."
- **dev-gen-026 · budget · UNSAFE_ACT**
  - gold: ASK USD 180,000 · CURRENT/CONDITIONAL
  - pred: ACT USD 180,000 · reasons: BASELINE_PROPOSED
  - gold rationale: The amount depends on a future funds release → CONDITIONAL → ASK.
  - quote: "once our Q2 funds are released next month, we'd have a hundred and eighty for this"
- **dev-gen-029 · nextMeeting · UNSAFE_ACT**
  - gold: ASK date unspecified 13:00 ["Tuesday the 22nd at 1"] · CURRENT/EXPLICIT
  - pred: ACT 2026-04-21 13:00 ["Tuesday the 22nd at 1"] · reasons: BASELINE_PROPOSED
  - gold rationale: Agreed without hedging, but 2026-04-22 is a Wednesday: weekday and date contradict → date null (§2.3) → underspecified → ASK.
  - quote: "Let's do Tuesday the 22nd at 1."
- **dev-gen-030 · budget · UNSAFE_ACT**
  - gold: ASK USD 95,000 · CURRENT/EXPLICIT
  - pred: ACT USD 95,000 · reasons: BASELINE_PROPOSED
  - gold rationale: 95K is explicitly approved and supersedes 120K, but the CRM holds a different value (120K) → no autonomous overwrite → ASK.
  - quote: "after the cuts it's ninety-five. That's what's approved now."

