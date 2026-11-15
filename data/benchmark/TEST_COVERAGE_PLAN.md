# TEST coverage plan (written before the transcripts)

Each held-out TEST case was planned against the dimensions below before any transcript was written. Dimensions come from the owner's TEST specification; gold labels come only from LABELING_GUIDE.md v1.2. Planned actions are intentions; the final labels follow the guide even where they differ (see TEST_AUDIT.md).

## Planned cases

| Case | Batch | Difficulty | Planned budget/DM/meeting | Coverage codes |
|---|---|---|---|---|
| test-gen-001 | A | easy | ACT / ACT / ACT | B1 D4 M3 M10 M16 M19 F1 F11 |
| test-gen-002 | A | easy | NO_OP / ACT / ABSTAIN | B34 D1 D18 M33 M45 F1 F11 |
| test-gen-003 | A | easy | ABSTAIN / ABSTAIN / ACT | B38 D38 M6 M10 M22 N2 F1 |
| test-gen-004 | A | easy | ACT / NO_OP / NO_OP | B3 D36 M41 M3 F1 F11 |
| test-gen-005 | A | easy | ACT / ACT / ACT | B1 B14 B24 D2 D18 M12 M21 M22 M25 F1 |
| test-gen-006 | A | moderate | ABSTAIN / ABSTAIN / ABSTAIN | B18 D30 M31 N1 N3 F1 |
| test-gen-007 | A | easy | NO_OP / ASK / ASK | B34 D7 D17 D24 M4 M26 M27 M17 F1 |
| test-gen-008 | A | easy | ACT / ACT / ASK | B30 D28 M20 F3 F4 F8 F12 |
| test-gen-009 | A | moderate | ASK / ACT / ABSTAIN | B4 B5 D14 D25 M30 M32 F1 |
| test-gen-010 | A | moderate | ABSTAIN / ABSTAIN / ASK | B17 B38 D30 M42 M23 M22 F1 |
| test-gen-011 | A | moderate | ASK / ACT / ASK | B2 B25 D4 D5 M28 F1 |
| test-gen-012 | A | easy | NO_OP / ASK / ACT | B34 D19 D37 D32 M2 F1 |
| test-gen-013 | A | moderate | ASK / ACT / ACT | B5 D8 D25 M13 M22 M34 F1 |
| test-gen-014 | A | moderate | ACT / ABSTAIN / ABSTAIN | B8 B32 B33 M21 F2 F9 |
| test-gen-015 | A | moderate | ASK / ACT / ABSTAIN | B8 B35 D13 D15 D25 M29 F1 |
| test-gen-016 | A | easy | ABSTAIN / ASK / ACT | B31 D16 M5 M19 F3 F6 |
| test-gen-017 | A | moderate | ABSTAIN / ABSTAIN / ABSTAIN | B6 D38 M43 N2 F1 |
| test-gen-018 | A | moderate | ACT / ABSTAIN / ACT | B11 D14 M1 M5 M22 F1 |
| test-gen-019 | A | hard | ASK / NO_OP / ACT | B10 B9 B35 D36 M25 M38 M21 F10 |
| test-gen-020 | A | hard | ACT / NO_OP / ABSTAIN | B36 B14 B16 B17 B21 D9 D7 D25 D36 M31 M32 M44 |
| test-gen-021 | B | moderate | ACT / ACT / ABSTAIN | B9 B37 D3 M30 F2 F10 F13 |
| test-gen-022 | B | moderate | ACT / ASK / ASK | D19 D21 D35 D37 M17 M26 M6 F2 F9 |
| test-gen-023 | B | moderate | ASK / ABSTAIN / ABSTAIN | B27 B35 M30 M34 F1 |
| test-gen-024 | B | hard | ASK / ASK / ABSTAIN | B4 B25 D23 D34 M32 F2 |
| test-gen-025 | B | moderate | NO_OP / ABSTAIN / ASK | B34 D38 M24 M42 M23 F1 F13 |
| test-gen-026 | B | moderate | ASK / ACT / ACT | B4 D4 M4 M22 M40 F13 |
| test-gen-027 | B | hard | ABSTAIN / ABSTAIN / ABSTAIN | B29 B6 D22 D27 M21 M43 N4 F3 F5 |
| test-gen-028 | B | moderate | ASK / ACT / ASK | B30 D6 D28 M7 F7 F3 |
| test-gen-029 | B | hard | ABSTAIN / ABSTAIN / ACT | B8 D31 M5 M13 M19 |
| test-gen-030 | B | moderate | ASK / ABSTAIN / NO_OP | B5 B3 M41 M17 F1 |
| test-gen-031 | B | hard | ABSTAIN / ASK / ABSTAIN | B38 D11 D27 D37 M31 F3 F5 |
| test-gen-032 | B | moderate | ABSTAIN / ABSTAIN / ASK | B26 D38 M15 M22 M9 |
| test-gen-033 | B | hard | ASK / NO_OP / ACT | B32 B34 B35 D36 M39 M19 F2 F9 |
| test-gen-034 | B | moderate | NO_OP / ABSTAIN / ASK | B21 B34 M37 |
| test-gen-035 | B | hard | ABSTAIN / ACT / ACT | B38 D7 D10 D12 D26 M5 M40 F13 |
| test-gen-036 | B | moderate | ASK / ASK / ASK | B7 B4 D17 M20 F1 |
| test-gen-037 | B | hard | NO_OP / NO_OP / ASK | B34 D36 M42 M23 F10 |
| test-gen-038 | B | moderate | ABSTAIN / ABSTAIN / ABSTAIN | B38 D29 M45 N1 N3 |
| test-gen-039 | B | hard | ACT / ASK / ACT | B28 D23 D34 M8 F2 |
| test-gen-040 | B | easy | ABSTAIN / NO_OP / ACT | B7 D36 M39 M19 |
| test-gen-041 | C | hard | ACT / ACT / ABSTAIN | B14 B15 B16 B36 D13 D14 D26 M31 M30 M44 |
| test-gen-042 | C | hard | ACT / ACT / ABSTAIN | B22 B23 D30 M33 M30 M44 |
| test-gen-043 | C | hard | ASK / ACT / ACT | B8 B35 D10 D25 M8 M25 M40 |
| test-gen-044 | C | moderate | ABSTAIN / ABSTAIN / ABSTAIN | B17 B18 D30 M31 N3 |
| test-gen-045 | C | hard | ASK / ACT / ASK | B2 B25 D33 D7 M9 |
| test-gen-046 | C | moderate | ACT / ABSTAIN / NO_OP | B19 B20 D38 M41 M11 |
| test-gen-047 | C | moderate | ACT / ASK / ABSTAIN | B26 D5 D11 D37 M32 M29 |
| test-gen-048 | C | moderate | ASK / ASK / ACT | B4 D18 M11 M19 |
| test-gen-049 | C | hard | ASK / ABSTAIN / NO_OP | B11 B13 B35 D20 M41 |
| test-gen-050 | C | moderate | ASK / ASK / ACT | B16 B25 D17 M21 M25 M19 |
| test-gen-051 | C | hard | ABSTAIN / ASK / ACT | B38 D20 D21 D35 D37 M5 M22 F2 F9 |
| test-gen-052 | C | moderate | ASK / ACT / ASK | B5 D1 M18 |
| test-gen-053 | C | hard | ACT / ACT / ACT | B21 D32 D26 M44 M31 M32 M35 M5 |
| test-gen-054 | C | easy | NO_OP / NO_OP / NO_OP | B34 D36 M41 |
| test-gen-055 | C | hard | ACT / ACT / ASK | B29 B6 B14 D15 D27 M7 F5 |
| test-gen-056 | C | moderate | ABSTAIN / ACT / ASK | B7 D5 D4 M42 M39 |
| test-gen-057 | C | moderate | ASK / ACT / ASK | B12 D11 D25 M28 M36 |
| test-gen-058 | C | hard | ASK / ASK / ACT | B6 B5 B35 D24 M32 M22 |
| test-gen-059 | C | easy | ABSTAIN / ASK / ACT | B21 D30 M14 |
| test-gen-060 | C | hard | NO_OP / NO_OP / ACT | B34 D36 D28 B30 M39 M19 F3 F4 F8 |

## Budget state space (C)

| Code | Category | Planned cases |
|---|---|---|
| B1 | exact approved budget | 001, 005 |
| B2 | approximate approved budget | 011, 045 |
| B3 | approved range | 004, 030 |
| B4 | tentative estimate | 009, 024, 026, 036, 048 |
| B5 | conditional budget | 009, 013, 030, 052, 058 |
| B6 | explicitly negated amount | 017, 027, 055, 058 |
| B7 | historical budget | 036, 040, 056 |
| B8 | superseded budget | 014, 015, 029, 043 |
| B9 | corrected budget | 019, 021 |
| B10 | several successive corrections | 019 |
| B11 | approved components with spoken total | 018, 049 |
| B12 | approved components without spoken total | 057 |
| B13 | component + unrelated monetary amount | 049 |
| B14 | seller quoted price | 005, 020, 041, 055 |
| B15 | discount | 041 |
| B16 | competitor price | 020, 041, 050 |
| B17 | incumbent/vendor spend | 010, 020, 044 |
| B18 | annual company revenue | 006, 044 |
| B19 | purchasing threshold | 046 |
| B20 | approval threshold | 046 |
| B21 | departmental budget unrelated to purchase | 020, 034, 053, 059 |
| B22 | implementation fee vs total budget | 042 |
| B23 | recurring vs one-time amount | 042 |
| B24 | multiple currencies | 005 |
| B25 | approximate language | 011, 024, 045, 050 |
| B26 | colloquial numbers | 032, 047 |
| B27 | range corrected to exact value | 023 |
| B28 | exact value corrected to range | 039 |
| B29 | customer rejects rep's budget assumption | 027, 055 |
| B30 | rep proposes amount and customer affirms | 008, 028, 060 |
| B31 | rep proposes amount and customer deflects | 016 |
| B32 | two customer speakers disagree | 014, 033 |
| B33 | finance authority overrides champion estimate | 014 |
| B34 | existing CRM value reconfirmed | 002, 007, 012, 025, 033, 034, 037, 054, 060 |
| B35 | existing CRM value contradicted | 015, 019, 023, 033, 043, 049, 058 |
| B36 | multiple monetary distractors before real budget | 020, 041 |
| B37 | real budget stated much earlier/later than question | 021 |
| B38 | no budget information | 003, 010, 031, 035, 038, 051 |

## Decision-maker state space (D)

| Code | Category | Planned cases |
|---|---|---|
| D1 | named final signer | 002, 052 |
| D2 | role-only final signer | 005 |
| D3 | first-name-only final signer | 021 |
| D4 | speaker is final decision maker | 001, 011, 026, 056 |
| D5 | joint approval | 011, 047, 056 |
| D6 | three-person joint approval | 028 |
| D7 | evaluation lead but not signer | 007, 020, 035, 045 |
| D8 | champion but not signer | 013 |
| D9 | recommender but not signer | 020 |
| D10 | budget owner but not signer | 035, 043 |
| D11 | technical approver | 031, 047, 057 |
| D12 | security approver | 035 |
| D13 | legal approver | 015, 041 |
| D14 | procurement approver | 009, 018, 041 |
| D15 | executive sponsor | 015, 055 |
| D16 | influencer | 016 |
| D17 | need to run it by X | 007, 036, 050 |
| D18 | explicit 'X has final sign-off' | 002, 005, 048 |
| D19 | signer changes after reorganization | 012, 022 |
| D20 | historical signer | 049, 051 |
| D21 | superseded signer | 022, 051 |
| D22 | former employee | 027 |
| D23 | two DIRECT claims that conflict | 024, 039 |
| D24 | two INDIRECT claims that conflict | 007, 058 |
| D25 | DIRECT plus INDIRECT stakeholder | 009, 013, 015, 020, 043, 057 |
| D26 | multiple lesser stakeholders plus one final signer | 035, 041, 053 |
| D27 | customer rejects rep's assumption about signer | 027, 031, 055 |
| D28 | rep proposes signer and customer affirms | 008, 028, 060 |
| D29 | role mentioned repeatedly but never final authority | 038 |
| D30 | authority inferred only from senior title (not assumed) | 006, 010, 042, 044, 059 |
| D31 | unclear pronoun | 029 |
| D32 | clear pronoun several turns later | 012, 053 |
| D33 | two people with same first name | 045 |
| D34 | multiple customer speakers disagree | 024, 039 |
| D35 | one customer corrects another | 022, 051 |
| D36 | existing CRM signer reconfirmed | 004, 019, 020, 033, 037, 040, 054, 060 |
| D37 | existing CRM signer contradicted | 012, 022, 031, 047, 051 |
| D38 | no decision-maker information | 003, 017, 025, 032, 046 |

## Next-meeting state space (E)

| Code | Category | Planned cases |
|---|---|---|
| M1 | exact date + exact time | 018 |
| M2 | date only | 012 |
| M3 | weekday only | 001, 004 |
| M4 | bare ordinal | 007, 026 |
| M5 | explicit month/day | 016, 018, 029, 035, 051, 053 |
| M6 | tomorrow | 003, 022 |
| M7 | unresolved 'next <weekday>' | 028, 055 |
| M8 | disambiguated 'next <weekday>' | 039, 043 |
| M9 | weekday/date contradiction | 032, 045 |
| M10 | time without AM/PM | 001, 003 |
| M11 | explicit AM | 046, 048 |
| M12 | explicit PM | 005 |
| M13 | minutes | 013, 029 |
| M14 | noon | 059 |
| M15 | timezone present | 032 |
| M16 | timezone absent | 001 |
| M17 | tentative meeting | 007, 022, 030 |
| M18 | conditional meeting | 052 |
| M19 | rep proposal accepted | 001, 016, 029, 033, 040, 048, 050, 060 |
| M20 | rep proposal not accepted | 008, 036 |
| M21 | rep proposal rejected | 005, 014, 019, 027, 050 |
| M22 | customer proposes meeting | 003, 005, 010, 013, 018, 026, 032, 051, 058 |
| M23 | meeting rescheduled | 010, 025, 037 |
| M24 | meeting rescheduled twice | 025 |
| M25 | several alternatives before final agreement | 005, 019, 043, 050 |
| M26 | 'I'll confirm' | 007, 022 |
| M27 | 'pencil it in' | 007 |
| M28 | vague 'sometime next week' | 011, 057 |
| M29 | availability constraint only | 015, 047 |
| M30 | 'I'll ask for times' | 009, 021, 023, 041, 042 |
| M31 | internal customer meeting | 006, 020, 031, 041, 044, 053 |
| M32 | deadline | 009, 020, 024, 047, 053, 058 |
| M33 | async deliverable date | 002, 042 |
| M34 | promised email date | 013, 023 |
| M35 | demo date vs internal deadline | 053 |
| M36 | historical/past meeting | 057 |
| M37 | same-day meeting | 034 |
| M38 | meeting date corrected mid-sentence | 019 |
| M39 | time corrected mid-sentence | 033, 040, 056, 060 |
| M40 | date and time separated across turns | 026, 035, 043 |
| M41 | existing CRM meeting reconfirmed | 004, 030, 046, 049, 054 |
| M42 | existing CRM meeting changed | 010, 025, 037, 056 |
| M43 | existing CRM meeting canceled with no replacement | 017, 027 |
| M44 | several dates, only one actual meeting | 020, 041, 042, 053 |
| M45 | no meeting information | 002, 038 |

## Speaker / evidence (F)

| Code | Category | Planned cases |
|---|---|---|
| F1 | one customer speaker | 001, 002, 003, 004, 005, 006, 007, 009, 010, 011, 012, 013, 015, 017, 018, 023, 025, 030, 036 |
| F2 | multiple customer speakers | 014, 021, 022, 024, 033, 039, 051 |
| F3 | rep assertions | 008, 016, 027, 028, 031, 060 |
| F4 | customer affirmations | 008, 060 |
| F5 | customer denials | 027, 031, 055 |
| F6 | customer deflections | 016 |
| F7 | ambiguous 'yeah' | 028 |
| F8 | clear 'yes/correct' | 008, 060 |
| F9 | one customer correcting another | 014, 022, 033, 051 |
| F10 | customer correcting themselves | 019, 021, 037 |
| F11 | evidence in one turn | 001, 002, 004 |
| F12 | evidence across adjacent turns | 008 |
| F13 | relevant information separated by several turns | 021, 025, 026, 035 |

## Negative / no-update (N)

| Code | Category | Planned cases |
|---|---|---|
| N1 | no field should change | 006, 038 |
| N2 | only one field has a useful candidate | 003, 017 |
| N3 | many superficially relevant entities, all ABSTAIN/NO_OP | 006, 038, 044 |
| N4 | rep summarizes all three fields, customer rejects | 027 |

## Changes made to this plan while writing the transcripts

Recorded, not silently applied. Each was made because the planned scenario turned out to carry a different code or label under LABELING_GUIDE v1.2:
- test-gen-027 meeting: coverage M41 → M43 (the customer rejects the CRM meeting; it isn't reconfirmed).
- test-gen-032 meeting: planned ACT → ASK; this case became the second weekday/date contradiction (M9), so the date is null.
- test-gen-053 meeting: coverage M9 → M5 ('Monday the 10th' is consistent; M9 is reserved for contradictions).
- After the first audit (gold labels recorded no HISTORICAL/SUPERSEDED claims): 029 budget (B38 → B8, a replaced amount → SUPERSEDED), 040 and 056 budget (B38 → B7, a past amount → HISTORICAL), 049 decisionMaker (D38 → D20, a retired signer → HISTORICAL). All four remain ABSTAIN.
- Owner decisions (LABELING_GUIDE v1.3, before freezing): 029 decisionMaker ASK → ABSTAIN (unresolved pronoun; signer not identifiable); 032 budget ASK → ABSTAIN (vague magnitude not representable; code B25 approximate language removed); 034 meeting ACT → ASK (same-day meeting; date null, time 16:00).

## Planned totals

- Batches: A 20, B 20, C 20
- Difficulty: easy 12, moderate 28, hard 20
- Planned actions (180): ACT 59, ASK 50, ABSTAIN 50, NO_OP 21
