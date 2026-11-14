# Run 2026-11-14T02-35-09-305Z_baseline-self-assess_dev

> Synthetic benchmark. These numbers say nothing about performance on real sales conversations.




| | |
|---|---|
| system | baseline-self-assess v2 |
| model (requested / reported) | claude-sonnet-5-5 / claude-sonnet-5-5 |
| effort | medium |
| policy | n/a (model decides) |
| prompt hashes | main=e09fb7bcd546ac01 |
| split / cases / field-items | dev / 30 / 90 |
| created | 2026-11-14T02:35:09.305Z |

## Headline
| metric | value |
|---|---|
| **ACT precision** | **25/25 (100.0%)** |
| autonomous coverage | 25/31 (80.6%) |
| unsafe write rate | 0/59 (0.0%) |
| human review rate | 27/90 (30.0%) |
| abstention rate | 32/90 (35.6%) |
| no-op rate | 6/90 (6.7%) |
| wrong-value writes | 0 |
| field-items affected by system errors | 0 |

## Gold × predicted action
| gold \ pred | ACT | ASK | ABSTAIN | NO_OP |
|---|---|---|---|---|
| ACT | 25 | 6 | 0 | 0 |
| ASK | 0 | 20 | 4 | 0 |
| ABSTAIN | 0 | 1 | 26 | 0 |
| NO_OP | 0 | 0 | 2 | 6 |

## Outcomes
- CORRECT_ACT: 25
- ACT_DOWNGRADED_TO_ASK: 6
- CORRECT_ASK: 18
- WRONG_VALUE_ASK: 2
- MISSED_ASK: 4
- UNNECESSARY_ASK: 1
- CORRECT_NO_CHANGE: 34

## Breakdowns
### By field
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| budget | 30 | 10/10 (100.0%) | 10/10 (100.0%) | 0/20 (0.0%) | 8/30 (26.7%) | 8/30 (26.7%) |
| decisionMaker | 30 | 11/11 (100.0%) | 11/12 (91.7%) | 0/18 (0.0%) | 5/30 (16.7%) | 13/30 (43.3%) |
| nextMeeting | 30 | 4/4 (100.0%) | 4/9 (44.4%) | 0/21 (0.0%) | 14/30 (46.7%) | 11/30 (36.7%) |

### By source
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| generated | 90 | 25/25 (100.0%) | 25/31 (80.6%) | 0/59 (0.0%) | 27/90 (30.0%) | 32/90 (35.6%) |

### By label status
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| reviewed | 90 | 25/25 (100.0%) | 25/31 (80.6%) | 0/59 (0.0%) | 27/90 (30.0%) | 32/90 (35.6%) |

### By gold status
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| CURRENT | 69 | 25/25 (100.0%) | 25/31 (80.6%) | 0/38 (0.0%) | 27/69 (39.1%) | 11/69 (15.9%) |
| HISTORICAL | 1 | 0/0 (n/a) | 0/0 (n/a) | 0/1 (0.0%) | 0/1 (0.0%) | 1/1 (100.0%) |
| NEGATED | 1 | 0/0 (n/a) | 0/0 (n/a) | 0/1 (0.0%) | 0/1 (0.0%) | 1/1 (100.0%) |
| none | 19 | 0/0 (n/a) | 0/0 (n/a) | 0/19 (0.0%) | 0/19 (0.0%) | 19/19 (100.0%) |

### By gold certainty
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| CONDITIONAL | 4 | 0/0 (n/a) | 0/0 (n/a) | 0/4 (0.0%) | 4/4 (100.0%) | 0/4 (0.0%) |
| EXPLICIT | 60 | 25/25 (100.0%) | 25/31 (80.6%) | 0/29 (0.0%) | 18/60 (30.0%) | 11/60 (18.3%) |
| none | 19 | 0/0 (n/a) | 0/0 (n/a) | 0/19 (0.0%) | 0/19 (0.0%) | 19/19 (100.0%) |
| TENTATIVE | 7 | 0/0 (n/a) | 0/0 (n/a) | 0/7 (0.0%) | 5/7 (71.4%) | 2/7 (28.6%) |

### By case tag (an item appears under every tag of its case)
| group | items | ACT precision | coverage | unsafe write rate | review rate | abstention rate |
|---|---|---|---|---|---|---|
| ambiguous_date | 6 | 0/0 (n/a) | 0/0 (n/a) | 0/6 (0.0%) | 4/6 (66.7%) | 1/6 (16.7%) |
| conditional | 12 | 3/3 (100.0%) | 3/3 (100.0%) | 0/9 (0.0%) | 8/12 (66.7%) | 1/12 (8.3%) |
| existing_value | 33 | 5/5 (100.0%) | 5/7 (71.4%) | 0/26 (0.0%) | 12/33 (36.4%) | 10/33 (30.3%) |
| explicit | 39 | 15/15 (100.0%) | 15/20 (75.0%) | 0/19 (0.0%) | 9/39 (23.1%) | 12/39 (30.8%) |
| explicit_but_insufficient | 18 | 4/4 (100.0%) | 4/4 (100.0%) | 0/14 (0.0%) | 7/18 (38.9%) | 7/18 (38.9%) |
| filler_words | 6 | 2/2 (100.0%) | 2/2 (100.0%) | 0/4 (0.0%) | 1/6 (16.7%) | 3/6 (50.0%) |
| historical | 9 | 4/4 (100.0%) | 4/5 (80.0%) | 0/4 (0.0%) | 2/9 (22.2%) | 3/9 (33.3%) |
| irrelevant_info | 24 | 6/6 (100.0%) | 6/6 (100.0%) | 0/18 (0.0%) | 5/24 (20.8%) | 12/24 (50.0%) |
| joint_approval | 3 | 0/0 (n/a) | 0/0 (n/a) | 0/3 (0.0%) | 3/3 (100.0%) | 0/3 (0.0%) |
| messy_speech | 6 | 3/3 (100.0%) | 3/3 (100.0%) | 0/3 (0.0%) | 0/6 (0.0%) | 3/6 (50.0%) |
| mid_sentence_correction | 3 | 2/2 (100.0%) | 2/2 (100.0%) | 0/1 (0.0%) | 0/3 (0.0%) | 1/3 (33.3%) |
| multiple_numbers | 24 | 10/10 (100.0%) | 10/11 (90.9%) | 0/13 (0.0%) | 7/24 (29.2%) | 7/24 (29.2%) |
| multiple_stakeholders | 18 | 8/8 (100.0%) | 8/9 (88.9%) | 0/9 (0.0%) | 5/18 (27.8%) | 5/18 (27.8%) |
| negation | 15 | 3/3 (100.0%) | 3/3 (100.0%) | 0/12 (0.0%) | 4/15 (26.7%) | 6/15 (40.0%) |
| no_update | 3 | 0/0 (n/a) | 0/0 (n/a) | 0/3 (0.0%) | 0/3 (0.0%) | 3/3 (100.0%) |
| pronouns | 24 | 9/9 (100.0%) | 9/9 (100.0%) | 0/15 (0.0%) | 7/24 (29.2%) | 6/24 (25.0%) |
| supersession | 18 | 5/5 (100.0%) | 5/6 (83.3%) | 0/12 (0.0%) | 7/18 (38.9%) | 4/18 (22.2%) |
| tentative | 15 | 2/2 (100.0%) | 2/2 (100.0%) | 0/13 (0.0%) | 8/15 (53.3%) | 5/15 (33.3%) |
| unconfirmed_rep_statement | 6 | 0/0 (n/a) | 0/1 (0.0%) | 0/5 (0.0%) | 2/6 (33.3%) | 4/6 (66.7%) |

## Failures (13)
### ACT_DOWNGRADED_TO_ASK (6)
- **dev-gen-001 · nextMeeting · ACT_DOWNGRADED_TO_ASK**
  - gold: ACT 2026-03-05 ["Thursday"] · CURRENT/EXPLICIT
  - pred: ASK 2026-03-05 ["Thursday, morning"] · reasons: BASELINE_REVIEW
  - gold rationale: Rep proposes Thursday; customer accepts without hedging. Call date Monday 2026-03-02 → Thursday 2026-03-05. No time is fixed ('whatever morning slot'), so time is null; the guide allows ACT with a date and no time.
  - quote: "Thursday works. Mornings are best for me, so just send whatever morning slot your engineer has." · model reason: Customer accepted Thursday (2026-03-05) for a technical deep-dive, but the exact time is not set; only a morning preference, and the invite is still pending.
- **dev-gen-002 · nextMeeting · ACT_DOWNGRADED_TO_ASK**
  - gold: ACT 2026-03-11 11:00 ["Wednesday the 11th at 11"] · CURRENT/EXPLICIT
  - pred: ASK 2026-03-11 11:00 ["Wednesday the 11th at 11"] · reasons: BASELINE_REVIEW
  - gold rationale: Rep proposes; customer accepts and asks for the invite. 2026-03-11 is a Wednesday, so weekday and date agree.
  - quote: "Wednesday the 11th at 11 works." · model reason: The customer accepted the kickoff call, and March 11, 2026 is a Wednesday. However, AM or PM and the timezone were not stated, so a human should confirm the time.
- **dev-gen-006 · nextMeeting · ACT_DOWNGRADED_TO_ASK**
  - gold: ACT 2026-03-19 16:00 ["Thursday the 19th at 4"] · CURRENT/EXPLICIT
  - pred: ASK 2026-03-19 16:00 ["Thursday the 19th at 4"] · reasons: BASELINE_REVIEW
  - gold rationale: Rep proposes; customer accepts unhedged. 2026-03-19 is a Thursday; 'at 4' in business context = 16:00.
  - quote: "Thursday the 19th at 4 works. Send me the invite." · model reason: Both sides agreed to the meeting and the date resolves to 2026-03-19, a Thursday. However, AM/PM and timezone were not stated, so 16:00 is an assumption and a human should confirm it.
- **dev-gen-013 · nextMeeting · ACT_DOWNGRADED_TO_ASK**
  - gold: ACT 2026-03-20 13:00 ["Friday at 1"] · CURRENT/EXPLICIT
  - pred: ASK 2026-03-20 13:00 ["Friday at 1"] · reasons: BASELINE_REVIEW
  - gold rationale: Rep proposes; customer accepts unhedged. Call date Thursday 2026-03-19 → Friday 2026-03-20, 13:00.
  - quote: "How about Friday at 1? ... Friday at 1 is fine. Send it over." · model reason: Meeting is mutually agreed and the date resolves to 2026-03-20, but 1 could be AM or PM (PM assumed) and no timezone or meeting format was stated, so it needs confirmation.
- **dev-gen-017 · decisionMaker · ACT_DOWNGRADED_TO_ASK**
  - gold: ACT Mike · CURRENT/EXPLICIT
  - pred: ASK Mike · reasons: BASELINE_REVIEW
  - gold rationale: Customer clearly affirms the rep's specific statement; evidence includes both turns (§3.4).
  - quote: "Yep, that's right. Mike signs." · model reason: Ethan confirms Mike signs off on the final contract, so Mike is the final approver. Only a first name is given, with no last name or title, so a human should confirm the identity before it is written.
- **dev-gen-018 · nextMeeting · ACT_DOWNGRADED_TO_ASK**
  - gold: ACT 2026-04-24 10:00 Central ["the 24th, ten a.m. Central"] · CURRENT/EXPLICIT
  - pred: ASK 2026-04-24 10:00 Central ["the 24th, ten a.m. Central"] · reasons: BASELINE_REVIEW
  - gold rationale: Rep proposes; customer accepts with time and timezone. Call date 2026-03-27: March 24 is past, so 'the 24th' resolves to 2026-04-24 (§2.3).
  - quote: "The 24th works. Ten a.m. my time, Central." · model reason: Customer accepted the meeting, but 'the 24th' is ambiguous: the call is on March 27, so the next 24th is April 24, though it could be read differently. Human should confirm the date.

### MISSED_ASK (4)
- **dev-gen-009 · decisionMaker · MISSED_ASK**
  - gold: ASK Sarah Kim · CURRENT/EXPLICIT
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: Leading the evaluation is explicit but only INDIRECT for final authority (§2.2, §8) → ASK.
- **dev-gen-019 · decisionMaker · MISSED_ASK**
  - gold: ASK Greg Novak · CURRENT/EXPLICIT
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: 'Run it by' gives Greg a role in the decision without stated final authority → INDIRECT → ASK.
- **dev-gen-022 · decisionMaker · MISSED_ASK**
  - gold: ASK Aaron Webb (Head of Member Services) · CURRENT/EXPLICIT
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: Budget owner / driving the purchase is INDIRECT for final authority (§2.2) → ASK.
- **dev-gen-028 · decisionMaker · MISSED_ASK**
  - gold: ASK Grace Liu · CURRENT/EXPLICIT
  - pred: ABSTAIN — · reasons: NO_CANDIDATE
  - gold rationale: A security approver not stated as final → INDIRECT (§2.2) → ASK.

### WRONG_VALUE_ASK (2)
- **dev-gen-024 · nextMeeting · WRONG_VALUE_ASK**
  - gold: ASK date unspecified 11:00 ["next Thursday at 11"] · CURRENT/EXPLICIT
  - pred: ASK 2026-04-23 11:00 ["next Thursday at 11"] · reasons: BASELINE_REVIEW
  - gold rationale: Agreed without hedging, but 'next Thursday' is ambiguous under §2.3 → date null → underspecified → ASK.
  - quote: "Next Thursday at 11 works." · model reason: Both sides agreed on the time, but "next Thursday" said on a Tuesday could mean 2026-04-16 or 2026-04-23. The timezone is not stated and AM/PM is assumed.
- **dev-gen-029 · nextMeeting · WRONG_VALUE_ASK**
  - gold: ASK date unspecified 13:00 ["Tuesday the 22nd at 1"] · CURRENT/EXPLICIT
  - pred: ASK 2026-04-22 13:00 ["Tuesday the 22nd at 1"] · reasons: BASELINE_REVIEW
  - gold rationale: Agreed without hedging, but 2026-04-22 is a Wednesday: weekday and date contradict → date null (§2.3) → underspecified → ASK.
  - quote: "Let's do Tuesday the 22nd at 1." · model reason: Both parties agreed on the date (Tuesday April 22, 2026 is consistent with call date), but the time '1' is ambiguous between AM/PM and no timezone was given; 13:00 is assumed as business hours. Also, April 22, 2026 is actually a Wednesday, so the weekday and date conflict.

### UNNECESSARY_ASK (1)
- **dev-gen-025 · nextMeeting · UNNECESSARY_ASK**
  - gold: ABSTAIN 2026-04-15 ["the 15th"] · CURRENT/EXPLICIT
  - pred: ASK date unspecified ["after the 15th"] · reasons: BASELINE_REVIEW
  - gold rationale: An availability constraint, not an agreed meeting; times are still to be requested.
  - quote: "She's out until the 15th, so nothing before then. I'll ask her assistant for times after that." · model reason: No specific date or time is agreed; the customer will only look for times after the 15th, so this is a pending, unconfirmed meeting.

