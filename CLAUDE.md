# CLAUDE.md — Development constraints for Grounded

Grounded is a research experiment first and a demo second. Read `SPEC.md` before making changes. Design decisions and their rationale go in `DECISIONS.md` (create it when the first decision is accepted).

## Architecture
- Keep it minimal: TypeScript, Zod, Vitest, `@anthropic-ai/sdk`, `tsx` for scripts. Add Next.js + Tailwind only in the UI phase.
- Do NOT add: LangChain or other agent frameworks, vector DBs, Redis, queues, SQLite/ORMs, auth, CRM integrations, MCP, multi-agent orchestration. If something seems to need one of these, ask first.
- Data lives in local JSON files. Raw LLM outputs are written to `results/` and never overwritten.
- The LLM provider sits behind one small interface (`LLMClient`). Only one file imports the Anthropic SDK.
- Every LLM output is validated with Zod. Invalid output is recorded as a failure, never silently repaired.
- The LLM does semantic work only: extraction, evidence quotes, certainty, sufficiency. ACT/ASK/ABSTAIN is decided by deterministic code in `policy.ts`, which must be table-test covered. Never ask an LLM to decide or approve the action inside Grounded.
- Evidence grounding is deterministic: a quote must be a normalized substring of the turn it cites. If grounding fails, the result is never ACT.
- Prefer plain functions and explicit code over abstractions. No numeric "confidence" scores unless they have actually been calibrated.
- When you make a meaningful architectural decision, add a short entry to `DECISIONS.md`: what, why, and the alternatives considered.

## Benchmark integrity (non-negotiable)
- Files under `benchmark/` are ground truth. **Never create, edit, or delete labels or inputs without explicit permission from the owner.** Propose changes in chat instead.
- Once frozen (hash recorded in `benchmark/FROZEN.json`), the benchmark must not change. If a label looks wrong, report it and wait. Do not fix it.
- LLM-generated cases are marked `source: "generated"` and `labelStatus: "draft"` until a human reviews them.
- Iterate on prompts and policy against the `dev` split only. Run `test` only when explicitly asked, and record every test run.
- No case-specific rules, no hardcoded phrases or names from benchmark cases, no few-shot examples copied from the benchmark. If a change helps one case but would not generalize, say so.

## Reporting
- Never fabricate or estimate metrics. Every number must come from a stored run file.
- Report counts with percentages, report regressions next to improvements, and report variance across repeated runs.
- Synthetic results are described as synthetic. Do not claim performance on real sales conversations or on Ergo's systems.
- If something in the spec is technically questionable, raise it instead of implementing it blindly.
