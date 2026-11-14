# Run 2a plan: fair specification alignment (prepared 2026-11-14, NOT yet run)

**Question.** With every system given the same answer-defining conventions, and with no architectural change, how do the three systems compare? Run 2a isolates the effect of *equal information*. Grounded v3 (structured-value validation) is deliberately excluded and will be a separate Run 2b.

## What changed since Run 1 (all before Run 2a)
| Change | Kind | Affects |
|---|---|---|
| Scoring v2: exact meeting time (D16) | evaluation | all systems equally |
| Guide v1.2: components, meeting-candidate rule, scoring §5 (D17, D18) | specification | no frozen labels changed |
| Signal-recall diagnostic (D19) | diagnostic only | Grounded traces |
| Shared field definitions aligned to the guide (D20) | prompt | all three systems, identically |
| Self-assess AUTO/REVIEW completeness and lesser-stakeholder guidance (D20) | prompt | self-assess only |

## Not changed
- Grounded architecture, extraction/classification instructions beyond the shared definitions, grounding, policy `default-v2`, reconciliation
- Model `claude-sonnet-5-5`, effort `medium`
- Frozen dev split (30 files, hashes equal `FROZEN.json`)
- Test split
- Run 1 artifacts

## Versions and prompt hashes for Run 2a
| System | Version | Prompt hash(es) | Run 1 version → hash(es) |
|---|---|---|---|
| baseline-naive | v2 | main `0c85a4c4af3a9e75` | v1 → `171a122f1f237e21` |
| baseline-self-assess | v3 | main `10e0f80b92c3d685` | v2 → `e09fb7bcd546ac01` |
| grounded | v2.1 | extract `a1184542278c3360`, classify `0565ba90032f9826` | v2 → `7dbf1f5f58939c9b`, `b7ae094e7da49750` |

Policy `default-v2` and scoring v2 are recorded in each run file.

## Protocol
1. Commit everything first, so the run files map to an exact commit.
2. Run each system once on dev, sequentially. This is the development default; three repeats are reserved for the final test evaluation.
3. Do not change anything between the three runs.
4. Compare against Run 1's *counterfactual v2-scored* numbers (POST_RUN1_DECISIONS.md §7), not Run 1's historical v1 headline. Otherwise the scoring change would be mixed into the comparison.
5. Analyse in a new `RUN2A_ANALYSIS.md`. Run 1 artifacts stay untouched.

## What to look for (stated before the run)
- Self-assess coverage on the 6 meeting/first-name items it previously reviewed: does equal information close the gap?
- Self-assess's 4 dropped INDIRECT decision makers: are they now reviewed?
- dev-gen-029 for all systems: does the explicit contradiction rule fix normalization *without* v3? If Grounded still writes 2026-04-22, that's evidence for v3.
- dev-gen-006 time and dev-gen-015 components (Grounded) under the aligned definitions.
- dev-gen-025: do both model systems now abstain?
- Regressions anywhere, especially new unsafe writes caused by the business-hours or completeness rules.
- Single-run caveat: one item ≈ 1.7 points of unsafe-write rate. Treat small differences as noise.
