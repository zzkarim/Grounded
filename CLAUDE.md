# CLAUDE.md — Development constraints for Grounded

Grounded is a research experiment first and a demo second. Before changing anything, read `SPEC.md` (design), `LABELING_GUIDE.md` (ground-truth rules), and `DECISIONS.md` (why things are the way they are).

## Environment
- Node is installed user-locally at `~/.local/node/bin`. Prefix commands with `export PATH=~/.local/node/bin:$PATH;`.
- Commands: `npm test`, `npm run typecheck`, `npm run lint`, `npm run validate-benchmark`, `npm run eval -- --system <name> --split dev`, `npm run report -- <run file>`.

## Architecture
- Stack: Next.js, TypeScript, Tailwind, Zod, Vitest, `@anthropic-ai/sdk`, `tsx` for scripts. Do not add dependencies without a stated reason.
- Do NOT add: LangChain or other agent frameworks, vector DBs, Redis, queues, SQLite/ORMs, auth, CRM integrations, MCP, or multi-agent orchestration.
- Data lives in local JSON files. Run files under `data/runs/` are append-only: never overwrite or edit them.
- Only `src/llm/` imports the Anthropic SDK. The model id lives in exactly one place, `src/llm/config.ts` (env `GROUNDED_MODEL`). All systems use the same model.
- Every model output is validated with Zod. Invalid output → bounded retry → recorded as an error. It never becomes an ACT.
- Inside Grounded, the LLM does semantic work only (extraction, quotes, status, certainty, sufficiency). ACT/ASK/ABSTAIN/NO_OP is decided by `src/core/policy.ts`. Never ask an LLM whether an action is safe.
- Grounding and policy are deterministic and must have unit tests. Any policy change needs a test and a `DECISIONS.md` entry.
- Prefer plain functions and explicit code over abstractions. No numeric confidence scores.
- Record meaningful architectural decisions in `DECISIONS.md`: what was decided, why, and the alternatives considered.

## Benchmark integrity (non-negotiable)
- Files under `data/benchmark/` are ground truth. **Never create, edit, or delete labels or inputs without explicit permission from the owner.** Propose changes in chat.
- Once a split is frozen (`data/benchmark/FROZEN.json`), it must not change. If a label looks wrong, report it and wait.
- LLM-drafted cases are `source: "generated"` and `labelStatus: "draft"` until the owner reviews them.
- Develop against `dev` only. Never run `test` unless the owner explicitly asks for the final evaluation. Never read test failure details during development.
- No case-specific rules, no hardcoded phrases or names from benchmark cases, no few-shot examples taken from the benchmark. If a change helps one case but would not generalize, say so.

## Reporting
- Never fabricate or estimate metrics. Every number must come from a stored run file.
- Report counts with percentages, report regressions next to improvements, and report variance across repeated runs.
- Synthetic results are described as synthetic. Do not claim performance on real sales conversations or on Ergo's systems.
- If something in the spec is technically questionable, raise it instead of implementing it blindly.
