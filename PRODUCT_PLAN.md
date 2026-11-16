# Grounded: Product Demo Plan

> Status: **proposal, not implemented.** Written 2026-11-16, after the experiment was completed and tagged (`experiment-v1-complete`).
> Nothing in this plan changes a prompt, the policy, the validator, scoring, a benchmark file or a run file.
> Every number quoted here comes from a stored run file or `data/analysis/FINAL_TEST_ANALYSIS.md`.

---

## 0. Summary and main recommendations

Grounded becomes a small, polished **"CRM write-gate" console for RevOps**. A call comes in. Grounded shows what it heard, what it wrote, what it sent for review, and why. Three surfaces carry the demo:

1. **Workspace** (the product). Transcript, then the three field decisions, then the CRM record and review queue, with an audit drawer per field.
2. **Results** (the evidence). The frozen held-out experiment, reported honestly.
3. **How it works** (the thesis). Probabilistic understanding vs deterministic control.

The five recommendations that matter most. Several push back on the brief:

| # | Recommendation | Why |
|---|---|---|
| R1 | **Replay is the default demo mode, and it re-executes the real code.** Demo transcripts are run through the real frozen pipeline ahead of time. The recorded model responses are then fed back through `createClient(replayTransport)` → `grounded.run()`, so grounding, validation, policy and reconciliation actually re-run on every load. Live analysis is a secondary mode. | A live call takes 6–15 s (stored TEST latencies: median 6.8 s, max 14.5 s per case) and is stochastic: the validator scenario may simply not fire. Replay is instant, reproducible, and still *the real pipeline*, not hardcoded decisions. |
| R2 | **Drop "Customer Context" as a separate surface.** Fold it into the Workspace as a **"Everything Grounded heard"** ledger: all candidate claims, including the ones not written. Label the gap explicitly. | The frozen extractor produces candidates for **three CRM fields only**. It recalled 6/23 NONE-sufficiency context signals on TEST. A screen showing "Security review: Friday, context only" would imply a capability the system doesn't have. |
| R3 | **Make the overwrite guard the climax, and describe it correctly.** Grounded's 0 overwrites is a **structural guarantee** (policy rule 6), not a measured rate. The measured fact is that the one-shot model, told not to, **overwrote 4 existing CRM values** on TEST and wrote reasons admitting it. | This is the most defensible finding, and it's also the clearest demo moment. Quote the self-assess model's own reason text from the stored run. |
| R4 | **Human-readable "why" comes from deterministic reason codes, not from LLM prose.** Each `PolicyReason` maps to fixed copy. The classifier's `explanation` appears only in the audit trace, labelled "model's note". | This keeps the product consistent with the thesis: the model labels meaning, and code decides and explains the action. |
| R5 | **The pipeline diagram doubles as the loading state.** The architecture strip at the top of the Workspace lights up stage by stage (purple = model, slate = deterministic code). | It conveys the core thesis in the first 30 seconds without a separate slide. |

Corrections to the brief that the plan relies on:
- **No SQLite exists in this repo.** It was never added: CLAUDE.md forbids SQLite/ORMs. Persistence is JSON files plus browser state (§18, §20).
- **Self-assess overwrites on TEST: 4, not 5.** The cases were 010 meeting, 022 decision maker, 025 meeting and 047 decision maker. The fifth unsafe write in the 28 existing-CRM transcripts (034) was the same-day meeting, on a field with no CRM value.
- **SPEC §10 planned 3 TEST runs per system; one was run.** The UI must say "single run".
- **README.md is stale.** It still says "No results yet". That's documentation, not experiment; see §27.

---

## 1. Current repository architecture

```
src/core/      Pure, deterministic, no I/O. Unit tested.
  schemas.ts     Zod schemas for everything: CRMState, Transcript, CandidateClaim, SemanticClassification,
                 ActionDecision, FieldDecision, PolicyReason, ValueValidation, SystemOutput, EvaluationRun, ...
  grounding.ts   groundEvidence(): quote ⊂ cited turn, speaker matches, customer-evidence flag
  validation.ts  validateMeeting()/validateClaim(): meeting-v1 structured-value checks (monotonic)
  values.ts      valuesEqual (policy "same fact"), scoringValuesEqual (exact), formatValue (plain text)
  policy.ts      decideClaim (7 ordered rules), reconcileField, decideCase; POLICY_CONFIG = default-v3
  scoring.ts     outcome classification + metrics; SCORING_VERSION = v2
  transcript.ts  renderTranscript/renderCRM (prompt text)
src/llm/       config.ts (single model id + effort), client.ts (only SDK import; Transport seam; Zod + 1 retry)
src/systems/   baselines.ts (naive v2, self-assess v3), grounded.ts (v3, two calls), shared.ts (FIELD_DEFINITIONS)
src/eval/      benchmark loading + freeze check, runner (append-only run files), report, signal recall
scripts/       CLI: eval, report, validate-benchmark, freeze, signal-recall, benchmark-review
src/app/       Next.js 16.4 App Router shell: a placeholder page only. Tailwind 4. cacheComponents: true
data/benchmark/{examples,dev,test}/   frozen ground truth (FROZEN.json hashes)
data/runs/{example,dev,test}/          append-only run files (TEST: one per system)
data/analysis/                         DEV/TEST analyses
tests/         Vitest: policy, grounding, validation, values, scoring, prompts, systems, benchmark, signal recall
```

Dependencies: `next 16.4.6`, `react 19.3`, `zod 4`, `@anthropic-ai/sdk`, Tailwind 4, Vitest, tsx. No UI library, no database.

## 2. The current Grounded pipeline (from the code)

`grounded.run(input, llm)` in [src/systems/grounded.ts](src/systems/grounded.ts):

1. **Call 1, extract** (`grounded.extract`, LLM). Takes the transcript and CRM and returns `candidates[]`: `{field, value, evidence[{turnId, speakerId, quote}]}`. It's recall-oriented and includes negated, historical and hedged values. Ids are assigned `c1…cn`.
2. **Grounding** (deterministic). For each claim, `groundEvidence()` checks the turn exists, the speaker matches, and the quote is a normalized substring. It produces `{grounded, hasCustomerEvidence, failures[]}`.
3. **Structured-value validation** (deterministic, v3). `validateClaim()` checks meetings only. Failing date or time components are nulled, `originalValue` is kept, and `verified=false` is set.
4. **Call 2, classify** (`grounded.classify`, LLM). Only runs if there are claims. It sees the *validated* claims and returns status, certainty, sufficiency and a one-sentence explanation per claim. Missing or duplicate ids mean no classification for that claim.
5. **Policy** (deterministic). `decideClaim` applies the rules in order:
   1. no classification → ABSTAIN
   2. ungrounded → ABSTAIN
   3. status ≠ CURRENT → ABSTAIN
   4. sufficiency NONE → ABSTAIN
   5. value equals CRM → NO_OP
   6. any of {CRM conflict, TENTATIVE, CONDITIONAL, INDIRECT, no customer evidence, meeting date null, VALUE_UNVERIFIED} → ASK with every applicable reason
   7. otherwise → ACT `SUPPORTED`
6. **Reconciliation** (deterministic). `reconcileField` works per field:
   - decision maker: DIRECT outranks INDIRECT
   - differing live values → ASK `CONFLICTING_CANDIDATES`
   - field priority is ACT > ASK (latest evidence) > NO_OP > ABSTAIN
7. **Output.** `SystemOutput`: `fields{budget, decisionMaker, nextMeeting}` (FieldDecision), `trace.records[]` (`claim`, `classification`, `grounding`, `validation`, final `decision`), and `llmCalls[]` (raw text, usage, duration, model ids, prompt hash).

Errors: an extraction failure means all three fields ABSTAIN with `SYSTEM_ERROR`. A classification failure means each claim ABSTAINs with `CLASSIFICATION_MISSING`. An error never becomes an ACT.

## 3. Components that can be reused directly

| Component | Use in product | How |
|---|---|---|
| `grounded` system object | The analysis engine, live and replay | Import and call `grounded.run()` unchanged |
| `createClient(transport, config)` | **Replay**: a product `replayTransport` returns the recorded `rawText` per call label. **Live**: `createAnthropicClient(getModelConfig())` | The Transport seam already exists; tests use `scriptedTransport` the same way |
| `LLMClient` interface | Progress events (a "extracting…"/"classifying…" wrapper) | Wrap `generate()` in product code; no frozen file is touched |
| All Zod schemas | API request/response validation, snapshot files, UI types | Import |
| `CRMState`, `Transcript` schemas | Validate pasted or edited inputs before analysis | Import |
| `groundEvidence`, `normalizeForMatch` | Highlight quote spans in the transcript (find the span to underline) | Import |
| `extractTemporalFacts`, `weekdayName` | Show the validator's checks visually ("evidence says Tuesday; 2026-04-22 is a Wednesday") | Import; display only |
| `decideClaim` | **Labelled counterfactual** "without the validator" (same classification, original value) | Import; clearly marked as a counterfactual computation |
| `valuesEqual` | Mock-CRM "already current" checks after reviewer approvals | Import |
| `POLICY_CONFIG`, `VALIDATOR_VERSION`, `GROUNDED_VERSION`, `grounded.promptHashes` | Version badge and frozen-pin test | Import |
| Stored run files (`data/runs/test/*.json`) | Results page: metrics, item tables, example traces | Read server-side, never modified |

`formatValue()` is reusable for plain text, but the UI needs richer formatting (`$120,000`, "Fri, May 22 · 10:00 AM"). A product formatter will sit next to it, without changing it.

## 4. Missing product infrastructure and UI

- **Demo scenario data:** purpose-built transcripts with CRM state (`data/demo/scenarios/*.json`), written fresh, plus recorded snapshots (`data/demo/snapshots/*.json`).
- **Snapshot recorder** (`scripts/record-demo.ts`): runs real `grounded.run()` K times per scenario and saves every attempt append-only. This one costs money and needs owner approval (§16).
- **Replay engine** (`src/product/replay.ts`): replay transport, re-execution, and an equality check against the recorded decisions.
- **Presentation layer** (`src/product/present.ts`): reason → copy mapping (exhaustive over `PolicyReason`), action → badge, value formatters, claim grouping for the ledger.
- **Transcript paste parser** (`src/product/parseTranscript.ts`): turns `Name: text` lines into a `Transcript`, with a speaker-side picker and a call-date input.
- **API route** for live analysis, with streaming stage events, input caps and a kill switch.
- **Client state** for the mock CRM and review queue (§11, §18).
- **Results data loader** (`src/product/results.ts`): reads stored runs server-side and derives display tables.
- **UI:** app shell and nav, Workspace, audit drawer, review inbox, Results, How it works, plus empty, error and loading states.
- **Design tokens:** typography (Inter + JetBrains Mono via `next/font`, no new dependency), colour roles, action colours.

## 5. Information architecture and navigation

```
Grounded ▸ [ Workspace ]  [ Review (3) ]  [ Results ]  [ How it works ]          v3 · policy default-v3 · frozen
```

| Route | Purpose | Demo role |
|---|---|---|
| `/` → `/workspace/[scenario]` | Analyze a call; see decisions, evidence, CRM, audit | 80% of the demo |
| `/review` | Inbox of all pending ASKs across analyzed deals | 5-second cut-away ("this is where humans come in") |
| `/results` | Frozen held-out experiment | 20–25 s |
| `/how-it-works` | Architecture plus thesis, with links to DECISIONS entries | Backup slide, or Q&A |

The **deal/scenario switcher** is a left rail inside the Workspace, styled as an account list:
- Corrigan (new deal)
- Meridale (existing account)
- Ardent (scheduling)
- "+ Paste a call"

That looks like a product, not a test harness.

Not built: a deals index page, settings, user accounts, or a dashboard home. The Workspace *is* the home.

## 6. Screen designs

### 6.1 Workspace (`/workspace/[scenario]`)

Desktop layout at 1440 px. Three columns under a pipeline strip.

```
┌ Account rail ─┬───────────────────────────── Pipeline strip ──────────────────────────────────────────┐
│ ● Corrigan   │ Call ─▶ [LLM] Extract ─▶ [Code] Ground ─▶ [Code] Validate ─▶ [LLM] Classify ─▶ [Code] Policy │
│   Meridale     ├───────────────────────────┬──────────────────────────────────┬────────────────────────┤
│   Ardent      │ CALL  Tue May 19 · 2 cust │ DECISIONS                        │ CRM RECORD · Corrigan │
│ + Paste call  │                           │                                  │                        │
│               │ Thandiwe (VP Ops)       │ Budget          ⚠ Needs review   │ Budget       — empty   │
│               │  "…we're probably around  │  ~$100,000  · hedged             │              ⧗ pending │
│               │   ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔   │  "probably around $100K"         │ Decision mkr Rosalind A.  │
│               │   $100K, not signed off"  │  Why: customer hedged the amount │              ✓ written │
│               │                           │                       [Trace ▸]  │ Next meeting Thu 2 PM  │
│               │ Rep: …                    │ Decision maker  ✓ Written        │              ✓ written │
│               │                           │  Rosalind Achebe (COO)               │                        │
│               │                           │ Next meeting    ✓ Written        │ REVIEW QUEUE (1)       │
│               │                           │  Thu May 21 · 2:00 PM            │  Budget ~$100,000      │
│               │                           │ ──────────────────────────────── │  [Approve] [Reject]    │
│               │                           │ EVERYTHING GROUNDED HEARD (5) ▾  │                        │
│               │                           │ [Replay · recorded 2026-11-xx] [Run live ↻]               │
└───────────────┴───────────────────────────┴──────────────────────────────────┴────────────────────────┘
```

- **Transcript column:**
  - Speaker name, side chip (Customer / Seller) and title.
  - Evidence quotes are underlined in the action colour. Hovering a decision highlights its quotes; clicking a quote scrolls to and focuses that decision.
- **Decisions column:**
  - One card per CRM field: always three, in a fixed order, which is stable for the demo.
  - Each card shows the action badge, the proposed value, the primary evidence quote, and one "Why" line from deterministic reason copy. Secondary reasons appear as small chips.
  - `[Trace ▸]` opens the audit drawer (§12).
- **"Everything Grounded heard" ledger** (collapsible, under the cards; §9): every candidate claim, including the ones not written.
- **CRM column:**
  - The mock record with per-field provenance ("written by Grounded · 0.0s ago", "approved by you", "unchanged").
  - Below it, this deal's review items.
- **Run controls:**
  - Default is **Replay**. A pill shows the recording timestamp and "same code, recorded model responses".
  - **Run live** calls the model, if live mode is enabled.

### 6.2 Audit drawer (right-side sheet, 560 px)
See §12.

### 6.3 Review inbox (`/review`)
A table: deal · field · current CRM value → proposed value · reasons · evidence quote · Approve / Reject / Edit-then-approve.
- Keyboard: `j`/`k` to move, `a` to approve, `r` to reject.
- An empty state says "Nothing waiting. Grounded writes only what it can verify."

### 6.4 Results (`/results`)
See §13.

### 6.5 How it works (`/how-it-works`)
See §14.

### 6.6 Paste a call (`/workspace/new`)
- A textarea for `Name: text` lines, a call-date picker (default: today), and a participant table (detected speakers; side = Customer/Seller; optional title).
- An optional CRM pre-fill form (budget, decision maker, meeting).
- `Analyze` runs live. Validation errors show inline (unknown speaker, empty turn, too long).

## 7. End-to-end user flow

1. Land on `/workspace/corrigan`. The replay loads instantly.
   - On first visit the decision cards animate in as the pipeline strip lights up stage by stage (~1.2 s total). This is purely presentational: the replay has already finished. `prefers-reduced-motion` skips it.
2. Read the three decisions. Hover a card to see its evidence highlighted in the transcript.
3. The CRM column shows ACT fields written, and the ASK in the review queue.
4. Open **Trace** on any field: extracted value → grounding → validation → classification → policy → action.
5. Approve or reject the ASK. The CRM updates with "approved by reviewer" provenance.
6. Switch to **Meridale** (existing account). The budget is "Already current", and the rescheduled meeting is "Needs review: would overwrite Wed 10:00".
7. Switch to **Ardent**. Validator scenario: the model's date was removed, routed to review, with the checks shown.
8. Go to **Results**: the frozen experiment and the overwrite comparison.
9. Optional: **Paste a call** → live analysis.

`Reset demo` (in the account rail's overflow menu) restores all mock CRMs and queues to their scenario defaults.

## 8. How ACT / ASK / ABSTAIN / NO_OP appear

The UI never shows the raw codes as the primary label. Codes appear in the trace and in small monospace text.

| Action | Badge (icon + text; colour is never the only cue) | Card treatment | CRM effect |
|---|---|---|---|
| ACT | `✓ Written` (green-700 on green-50) | Value shown at full weight | Field updates, with a "Written by Grounded" provenance chip and a brief highlight |
| ASK | `⚠ Needs review` (amber-800 on amber-50) | Value shown with a qualifier ("~", "date not confirmed"); the reason line is prominent | Field unchanged; the item enters the review queue; a "⧗ 1 pending" marker appears on the CRM field |
| ABSTAIN | `— Not written` (slate-600 on slate-100) | Card collapsed to one line: "Nothing reliable for this field". Any claims behind it appear in the ledger | No change |
| NO_OP | `= Already current` (blue-700 on blue-50) | "Matches CRM" plus the evidence quote, i.e. corroboration | No change; a "Confirmed on this call" chip on the CRM field |
| SYSTEM_ERROR | `✕ Analysis failed` (red) | Error banner: "Nothing was written." | No change |

**Reason copy** (deterministic, one table in `src/product/present.ts`, exhaustive `switch` over `PolicyReason` so a new reason fails typecheck):

| Code | Copy |
|---|---|
| `SUPPORTED` | "Customer stated it explicitly, quote verified." |
| `TENTATIVE` | "Customer hedged ('probably', 'around')." |
| `CONDITIONAL` | "Depends on something that hasn't happened yet." |
| `INDIRECT_SUPPORT` | "Related, but doesn't establish the field directly." |
| `CONFLICTS_WITH_EXISTING` | "Would overwrite an existing CRM value. Grounded never overwrites without a person." |
| `VALUE_UNVERIFIED` | "The model's structured value didn't match the quoted words; the unverified part was removed." |
| `UNDERSPECIFIED_VALUE` | "No confirmed date." |
| `NO_CUSTOMER_EVIDENCE` | "Only the seller said it." |
| `MATCHES_EXISTING` | "Matches what's already in the CRM." |
| `STATUS_NEGATED` / `STATUS_HISTORICAL` / `STATUS_SUPERSEDED` | "Customer said this isn't true" / "Describes the past" / "Later corrected" |
| `NO_SUPPORT` | "Mentioned, but not this field (e.g. a price isn't a budget)." |
| `UNGROUNDED_EVIDENCE` | "Quote couldn't be found in the transcript." |
| `CLASSIFICATION_MISSING` / `SYSTEM_ERROR` | "Analysis incomplete; nothing written." |
| `CONFLICTING_CANDIDATES` | "The call contains different values for this field." |
| `OUTRANKED_BY_DIRECT` | "Someone else was named as the final signer." |
| `NO_CANDIDATE` | "Not discussed." |

## 9. Customer context vs CRM state

**Recommendation: one concept, two clearly separated zones. No separate "Customer Context" screen.**

- **CRM record** (right column): system-of-record state. Hard-edged card, field/value table, provenance chips. It only changes by ACT or by human approval.
- **"Everything Grounded heard"** (ledger under the decision cards): a softer, list-style surface. Every `trace.records[]` claim, grouped:
  - **Became a CRM decision.** The claims behind ACT, ASK and NO_OP.
  - **Heard, not written.** Negated, historical, superseded, "not a budget" (NONE) and outranked claims, each with its quote and a plain-language status ("Customer said this was last year's number").
- **Visual grammar.** The CRM uses a table, solid borders and a field-value layout. The ledger uses quote-first rows, a muted background and a small italic status line. The two never share a container.
- **Honest scope note** at the foot of the ledger:
  > "Grounded currently extracts candidates for three CRM fields. It does not yet capture broader account context (incumbent spend, internal deadlines, other stakeholders). On the held-out benchmark it preserved 125/130 CRM-relevant signals but only 6/23 contextual ones."

  This links to Results § Limitations.
- **Approximate values are preserved as heard.** An ASK budget shows `~$100,000` with the customer's quote.
  - The `~` is derived from TENTATIVE certainty, in presentation only. It's never written into the value.
  - Pushback: the frozen schema has no "approximate" flag, so "~" is a display convention driven by the certainty label. It's honest, but say so in the trace: "certainty: tentative".

**What the plan deliberately does not do.** It doesn't invent context claims (security reviews, deadlines) that the extractor didn't produce. If the extractor happened to emit an incumbent-spend budget candidate with NONE sufficiency, it appears in the ledger. Otherwise it doesn't.

## 10. Review queue behaviour

- **Source.** Every field whose decision is ASK becomes one queue item: deal, field, current CRM value, proposed value, reasons and evidence. One item per field, not per claim, which matches `reconcileField`. The trace lists the competing claims when the reason is `CONFLICTING_CANDIDATES`.
- **Approve** writes the proposed value to the mock CRM with provenance `approved by reviewer`. If the value has a null meeting date, Approve is disabled and the item offers **Edit & approve**, where the reviewer must supply the date. The value can be incomplete only because Grounded removed unverified specificity, so a human has to supply it.
- **Edit & approve** is a small form typed by field (amount/currency; name/role; date/time). The edited value is validated with the frozen value Zod schemas, and the item records `edited: true`.
- **Reject** dismisses the item, leaves the CRM unchanged, and records `rejected` in the item history.
- **History.** Resolved items move to a "Resolved" tab with decision, actor ("you") and timestamp. This is client-side only.
- **Re-analysis.** Running the same call again replaces that call's pending items rather than duplicating them. Resolved items are kept.
- **Not built:** assignment, comments, SLAs, notifications, multi-user.

## 11. Mock CRM behaviour

- One mock record per demo account, initialised from the scenario's `crm` (`CRMState`).
- ACT applies the decision value immediately, provenance `Grounded · auto`. NO_OP adds a "confirmed" chip with the call date. ABSTAIN does nothing.
- Each field keeps a short history (value, source, time), shown on hover. This makes "Grounded wrote this" vs "a human approved this" auditable.
- **Re-running analysis on a deal re-analyzes against the scenario's original CRM state**, not the mutated mock state, so replays stay reproducible.
  - A later toggle could analyze against the current mock CRM. It isn't needed for the demo: re-analyzing against mutated state would change inputs relative to the recording, and a replay must match the recorded inputs exactly.
- Stored in `localStorage` under a versioned key. `Reset demo` clears it.

## 12. Audit trace behaviour

The drawer opens per field and shows the field decision, then each claim for that field. One vertical **stage timeline** per claim, each stage tagged `MODEL` or `CODE`:

```
1  MODEL  Extracted        value: Thu 2026-05-21 14:00   evidence: [t9] Florian: "Thursday at 2 works"
2  CODE   Grounded         ✓ quote found in turn t6 · ✓ speaker is Maya (customer)
3  CODE   Validated        ✓ "Thursday" → 2026-05-21 is a Thursday · ✓ "at 2" → 14:00 (business hours)
4  MODEL  Classified       current · explicit · direct          model's note: "Customer accepted…"
5  CODE   Policy           Rules 1–6 passed → ACT (SUPPORTED)
6  CODE   Reconciled       only candidate for field → ACT
```

- **Validator visualisation** (meetings only; only when it actually ran). The evidence quote has its recognised date/time tokens highlighted. These come from `extractTemporalFacts` at display time, which is the same pure function the validator uses.
  - A check table shows each rule as pass or fail:
    - "Evidence names **Monday**; 2026-03-17 is a **Tuesday** → weekday mismatch"
    - "Date removed: 2026-03-17 → *no confirmed date*"
  - `originalValue` is struck through next to the validated value.
- **Counterfactual chip** (validator scenario only):
  > "Without this check: **Written**. Computed by re-running the policy on the original value with the same classification."

  This is a real `decideClaim` call, labelled as a counterfactual. Caveat in a tooltip: in v3 the classifier saw the validated value, so this is approximate.
- **Raw view toggle:** the JSON for the claim, classification, grounding, validation and decision. A "Model calls" tab shows label, model id, tokens, duration and prompt hash. Raw text is shown in a collapsible block.
- **Provenance footer:**
  - In replay: "Replayed from recording `<id>` · model claude-sonnet-5-5 · prompt hashes match frozen v3 ✓ · deterministic stages re-executed, decisions identical ✓".
  - Live: "Live run · <timestamp>".

The trace never shows a validator check that didn't run. Non-meeting fields show "Structured-value validation: not applicable to budget / decision maker (meeting-v1 validates meetings only)."

## 13. Evaluation dashboard (`/results`)

Top of page, one sentence:
> "On 60 held-out synthetic transcripts, frozen before evaluation, Grounded matched or slightly exceeded a one-shot self-assessing model. Its clearest advantage was that deterministic code enforced write rules the model sometimes ignored."

**Block 1: headline table.** Read from `run.metrics.overall` in the three TEST run files. Always shows counts and %.

| | ACT precision | ACT coverage | Unsafe writes | Sent to review | Model calls | Est. cost |
|---|---|---|---|---|---|---|
| Naive | 56/91 · 61.5% | 56/59 · 94.9% | 32/121 · 26.4% | 0 | 60 | ≈$0.47 |
| Self-assess | 50/56 · 89.3% | 50/59 · 84.7% | 6/121 · 5.0% | 53 | 60 | ≈$0.68 |
| Grounded | 54/59 · 91.5% | 54/59 · 91.5% | 4/121 · 3.3% | 55 | 118 | ≈$1.38 |

- Visual: a horizontal dot-plot per metric, with three dots on a shared 0–100% axis and the n/d label next to each dot.
- No bar race and no "winner" styling. Grounded gets the brand colour only because it is "this system", not to signal a win.
- Cost is computed from stored `usage` × a documented list-price constant, labelled "estimate".

**Block 2: "The finding that held up: never overwrite without a person."**
- Compare one at a time:
  - Self-assess, told not to overwrite, **autonomously overwrote 4 existing CRM values**.
  - Grounded: **0, by construction**. Policy rule 6 makes ACT impossible when a different value exists.
- Show the four self-assess reasons verbatim from the stored run, for example:
  > "…superseding the earlier Wednesday meeting."
  > "This replaces the CRM's Thursday value with the clearly agreed new time."
- Next to each, show Grounded's decision on the same item (ASK `CONFLICTS_WITH_EXISTING`).
- This is the emotional centre of the page.

**Block 3: the validator, held out.** 2 activations among 66 meeting candidates. 1 unsafe write prevented (same-day meeting). 0 correct writes blocked. Shown with the actual trace, plus the DEV-029 weekday-mismatch trace from DEV Run 2b, labelled "DEV (motivating case)".

**Block 4: "Where Grounded still fails."** Expanded by default, not hidden.
- Its 4 unsafe writes are all classification errors:
  - "needs to approve" read as final authority (×2)
  - a hedged competing signer
  - a derived total read as directly stated
- Its 5 lost writes are value normalisation: "seventy-five" → 75, and consistent dates nulled.
- One line: "Deterministic policy can't recover what extraction never captured correctly."

**Block 5: rigor and limitations.** A two-column checklist.
- Provenance:
  - systems frozen before TEST was built
  - labels frozen before any prediction
  - git tags `benchmark-test-v1` → `experiment-v1-complete`
  - an independent re-score agreed 540/540
- Limitations:
  - one run per system (SPEC planned 3)
  - 60 synthetic Claude-generated transcripts, evaluated with a Claude model
  - short transcripts, few multi-party calls
  - sign test p ≈ 0.66 on the 21 disagreements
  - context recall 6/23

**Block 6 (collapsed): DEV history.** Run 1's apparent advantage was confounded by unequal specification, it tied after alignment, and v3 followed. This is the "we caught our own confound" story, which engineers find credible.

Item-level drill-down is out of scope for the first build. A final, optional phase could add a filterable item table for the TEST run (case, field, gold, predicted, outcome).

## 14. Architecture visualisation (`/how-it-works`, plus the Workspace strip)

```
        PROBABILISTIC (model)                       DETERMINISTIC (code, unit-tested)
   ┌──────────────────────────┐          ┌──────────────────────────────────────────────┐
   │ 1  Extract candidates    │─────────▶│ 2  Ground evidence   quote ⊂ turn, speaker ok │
   │    + exact quotes        │          │ 3  Validate values   date ↔ weekday/day/month │
   │                          │          │                      future, time in quote    │
   │ 4  Classify meaning      │◀─────────│                                               │
   │    status·certainty·     │─────────▶│ 5  Policy            7 ordered rules          │
   │    sufficiency           │          │ 6  Reconcile         one decision per field   │
   └──────────────────────────┘          └──────────────┬───────────────────────────────┘
                                                        ▼
                                     ACT ✓   ASK ⚠ → review   ABSTAIN —   NO_OP =
```

- **Two lanes, model vs code.** The control flow alternates between them, which honestly shows that classification happens *after* validation.
- **Three invariant callouts:**
  - "The model never decides the action."
  - "Never overwrite without a person."
  - "Validation can only remove specificity, never add it."
- A small "Why not just ask the model?" panel shows the 4 overwrites, linking to Results.
- **Cost callout:** 2 model calls vs 1, ≈2× tokens. Most of the measured safety gain came from code, which costs nothing per call.
- **Workspace strip:** the same six stages in one row with lane colours. During live runs, stages 1 and 4 show spinners driven by real call events; stages 2, 3, 5 and 6 complete with them.

## 15. Demo scenarios and exact product flow

All scenario transcripts are **written fresh for the demo**:
- Generic names and companies.
- No phrasing from DEV/TEST/examples, checked automatically (§16).
- Not added to any benchmark split.
- Never used to tune anything.

Each is run through the real frozen pipeline.

| # | Account | CRM before | What's said (gist, not final text) | Expected decision | Main reason |
|---|---|---|---|---|---|
| S1 | **Corrigan** (new) | empty | "Our COO, Rosalind Achebe, signs off on this." / "Thursday at 2 works for the demo." | DM **ACT**, meeting **ACT** | `SUPPORTED` |
| S2 | Corrigan (same call) | empty | "We're probably around $100K. Nothing's signed off yet." | budget **ASK** | `TENTATIVE` (maybe also `CONDITIONAL`) |
| S3 | **Ardent** (scheduling) | empty | Customer states a meeting where the weekday and day-of-month disagree (e.g. "Monday the 17th" when the 17th is a Tuesday), OR a same-day meeting ("later today at 4") | meeting **ASK**, date removed | `VALUE_UNVERIFIED` (only if the extractor resolves a date) |
| S4 | **Meridale** (existing) | budget $250,000 · DM Lucian Ferro (CFO) · meeting Wed 10:00 | "The $250K is still approved." / "Can we move Wednesday to Friday at 10?" "Friday works." | budget **NO_OP**; meeting **ASK** | `MATCHES_EXISTING`; `CONFLICTS_WITH_EXISTING` |

- **S1 and S2 share one transcript.** One click shows two writes and one review: the core "knows vs allowed to do" contrast in a single screen.
- **S4 shows two outcomes:** NO_OP corroboration and overwrite protection.

**Exact demo flow** (detail in DEMO_SCRIPT_PLAN.md):
1. Corrigan replay (2 writes, 1 review)
2. Trace on the budget
3. Approve or edit the budget in the queue
4. Ardent (validator trace with checks plus the counterfactual chip)
5. Meridale (overwrite → review)
6. Results Block 2
7. How it works (one glance)
8. Limitations line

**Phrasing to avoid**, because it hits known frozen-system failure modes:
- spoken thousands without a unit ("seventy-five")
- "needs to / has to approve" as the signer statement
- derived totals
- consistent weekday + day combinations (the extractor over-nulls them)

This avoidance is a **deliberate, disclosed selection**: the demo shows the mechanism, not the error rate. The Results page shows the failures (§13 Block 4), and the presenter should say so.

## 16. Which scenarios the real frozen pipeline can produce reliably

Assessed from the code paths and the stored TEST/DEV behaviour. It must be **measured** by recording each scenario K = 5 times before relying on it.

| Scenario | Determinism | Expected reliability | Why |
|---|---|---|---|
| S1 ACT | Depends on the LLM labelling explicit/direct | **High** | Explicit, customer-stated, numeric digits, empty CRM. TEST "easy" items: 15/15 correct ACT |
| S2 ASK (tentative) | Depends on a TENTATIVE label | **High** | "Probably around" is canonical hedging. TEST: 13/13 tentative or conditional ASK budgets reached review |
| S4 NO_OP | Value equality is deterministic, given extraction | **High** | Requires only extracting $250,000 as CURRENT with sufficiency ≥ INDIRECT |
| S4 overwrite → ASK | **Deterministic** once a CURRENT, non-NONE candidate differs from CRM | **Very high** | Rule 6. Grounded: 0 unsafe writes on 84 items in existing-CRM TEST transcripts |
| S3 validator | Requires the **extractor to emit a wrong or same-day date**, which the model usually avoids | **Low to moderate, unknown** | On TEST the extractor already nulled both weekday/date contradictions (032, 045) itself. The validator fired 2/66. The same-day pattern fired once (034) |

**Consequences for S3:**
1. Record S3 several times (more than one candidate transcript if needed) and **store every attempt**. Each recording records whether the validator fired.
2. The S3 replay uses a recording where it fired. The UI shows the observed frequency: "In 3 of 5 recordings the model resolved the date and the validator removed it. In the other 2 the model left the date blank itself. Final action was ASK in all 5."
   - That last sentence is the honest punchline: either way it's not written.
3. Backup for S3: the **real recorded activations from the experiment**. DEV Run 2b, dev-gen-029: `2026-04-22 13:00` from "Tuesday the 22nd at 1" → `DATE_WEEKDAY_MISMATCH` → date null → ASK. TEST 034: `DATE_NOT_FUTURE`. Both are shown in Results Block 3 and replayable through the same trace UI.
4. If no candidate S3 transcript triggers the validator in a reasonable number of attempts, S3 is shown **only** from the recorded experiment traces. A synthetic validator firing must not be faked.

**Recording cost.** Per-transcript Grounded usage on TEST averaged 7,335 input / 837 output tokens: about $0.023 at the project's list-price estimate. 4 transcripts × 5 recordings plus a few S3 retries is roughly **$0.50–$1.00**. Needs owner approval before running.

## 17. Frontend and backend architecture

```
Browser (React 19 client components)
  ├─ Workspace UI ── reads a scenario + snapshot (server-rendered props)
  ├─ Mock CRM + review queue state (useReducer + localStorage)
  └─ Live run: POST /api/analyze → NDJSON stream of {stage} events + final AnalysisResult
Next.js server (App Router, Node runtime)
  ├─ app/workspace/[scenario]/page.tsx   server component: load scenario + snapshot, REPLAY via grounded.run()
  ├─ app/results/page.tsx                 server component: read data/runs/test/*.json → display model
  ├─ app/api/analyze/route.ts             live: validate input (Zod) → grounded.run(createAnthropicClient) → stream
  └─ src/product/*                        presentation, replay, results loader, parser (pure where possible)
Frozen core (read-only imports): src/core, src/systems, src/llm, src/eval
```

- **Replay runs server-side.** Snapshots, raw model text and the run-file reader never ship to the client. The page receives a compact `AnalysisView` (decisions, records, formatted values, provenance).
- **One `AnalysisResult` type** for replay and live: `{ input: CaseInput, output: SystemOutput, mode: "replay"|"live", provenance }`. The UI doesn't care which mode produced it.
- **No state library:** `useReducer` plus a context for the CRM and queue.
- **No component library.** Hand-built Tailwind components (badge, card, drawer, table, tabs) keep the dependency rule. Use the native `<dialog>`, or a small focus-trap utility, for the drawer.
- **Next 16.4 caveat:** AGENTS.md warns this version has breaking changes, and `cacheComponents: true` is on. Before writing routes or caching, read `node_modules/next/dist/docs/01-app/` for route handlers, `use cache`, dynamic params and streaming.

## 18. Data persistence

| Data | Where | Mutability |
|---|---|---|
| Benchmark, DEV/TEST runs, analyses | `data/benchmark`, `data/runs`, `data/analysis` | **Read-only** |
| Demo scenarios | `data/demo/scenarios/<id>.json` (`{id, account, crm, transcript, notes}`) | Committed; editable until recorded, then frozen by a hash in `data/demo/RECORDINGS.json` |
| Demo recordings | `data/demo/recordings/<scenario>/<timestamp>.json` (full `SystemOutput` + input + config + prompt hashes) | **Append-only** (`wx` flag, like run files) |
| Live analyses | Not persisted server-side (returned to the browser only) | Ephemeral |
| Mock CRM, review queue, history | Browser `localStorage` (`grounded-demo:v1`) | User-resettable |

- Product data stays **outside** `data/runs/` so demo activity can never be confused with experiment results.
- The deployed app is read-only on disk. Vercel's filesystem isn't writable anyway.

## 19. API routes and server actions

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/analyze` | POST | Live analysis. Body `{transcript, crm}`, Zod-validated (`Transcript`, `CRMState`) plus product caps. Streams NDJSON: `{type:"stage",stage:"extract"|"classify",status}` …, then `{type:"result", result}` or `{type:"error"}`. Returns 403 when live mode is disabled |
| `/api/config` | GET (or a server-rendered prop) | `{liveEnabled, model, versions}` for the UI badge |

- No other routes are needed. Replay and results are server components, and review actions are client-only state.
- Server actions aren't used, because streaming progress is simpler with a route handler.

## 20. SQLite

There is **no SQLite infrastructure** in this repository: no dependency, no files, no code. CLAUDE.md explicitly prohibits SQLite/ORMs.

Recommendation: **don't add one.** Every product requirement fits in JSON plus `localStorage` for a single-presenter demo. If multi-user review were ever needed, that's a product change to discuss, not something this demo needs.

## 21. Deployment

- **Vercel** (native Next.js, preview URLs per branch).
- **Env vars:**
  - `ANTHROPIC_API_KEY` (server only)
  - `GROUNDED_MODEL=claude-sonnet-5-5` and `GROUNDED_EFFORT=medium`, the same as the experiment
  - `DEMO_LIVE_ENABLED=false` by default
  - optionally `DEMO_LIVE_TOKEN`; see §22
- **Replay and Results work with no API key.** The public URL is safe to share even with live mode off.
- **File tracing:** `data/demo/**` and `data/runs/test/*.json` must be included in the serverless bundle (Next `outputFileTracingIncludes`), or read at build time in cached server components. Confirm against the Next 16.4 docs.
- **Live route:** Node runtime, `maxDuration` ≈ 60 s (observed per-case model time ≤ 15 s; the SDK retries add headroom).
- **Set an Anthropic workspace spend limit** for the demo key. It's the real cost guard.
- **Fallback for the interview:** run `npm run build && npm start` locally with replay only, so there's no network dependency except the optional live call.

## 22. Security considerations

- The API key is only in server env. It's never sent to the client, never logged, and `.env*` is already git-ignored.
- **Live endpoint abuse:**
  - Off by default.
  - When on: input caps (≤ 40 turns, ≤ 600 chars per turn, ≤ 8,000 chars total, ≤ 6 participants).
  - A best-effort per-IP limit in memory (e.g. 10/hour).
  - The spend limit at the provider.
- **Access token tension:** CLAUDE.md says "no auth". A shared `DEMO_LIVE_TOKEN`, a single env string checked by the route, is the minimum guard if live mode is public. **This needs the owner's decision.** The alternative is to enable live mode only locally or during the interview.
- **Prompt injection via pasted transcripts** can at worst skew the model's labels. Even then:
  - the policy is code
  - grounding requires verbatim quotes
  - the only "side effect" is a browser-local mock CRM

  That's a nice talking point, and also a reason the demo never connects to a real CRM.
- **XSS:** all transcript text renders as React text nodes. No `dangerouslySetInnerHTML`. The quote highlighter splits strings, not HTML.
- **No transcript logging** server-side, and no analytics.
- **Data notice** on the paste screen: "Synthetic or non-sensitive text only. Text is sent to Anthropic's API for analysis."

## 23. Error, loading and empty states

| State | Treatment |
|---|---|
| Replay loading | Instant (server-rendered); optional ~1.2 s staged reveal |
| Live: extracting / classifying | Pipeline strip with the active stage pulsing; "Extracting candidates… (≈5 s)"; Cancel button (aborts the fetch) |
| Live: no candidates found | Three "Not discussed" cards; "Grounded found nothing to write for these fields" |
| Extraction failed | Red banner: "Analysis failed. Nothing was written to the CRM." All cards ABSTAIN with `SYSTEM_ERROR`. Retry |
| Classification failed | Amber banner: "Couldn't verify meaning; every candidate was held back." Claims show in the ledger as "unclassified" |
| Live disabled | The Run live button shows a tooltip "Live analysis is disabled on this deployment; replays use real recorded runs" |
| Rate limited / key missing | Inline message plus a link to replay scenarios |
| Paste validation | Field-level errors (unknown speaker, no customer speaker, empty turn, over cap) |
| Review queue empty | "Nothing waiting. Grounded writes only what it can verify." |
| Snapshot/prompt mismatch (replay verify fails) | Visible warning: "Recording doesn't match current frozen code." This should never happen and is guarded by a test |

## 24. Responsive behaviour

- Desktop-first: the demo is on a laptop at ≥1280 px.
- **≥1280:** three columns (transcript 34% · decisions 36% · CRM 30%) plus a 200 px account rail.
- **1024–1279:** the account rail collapses to an icon/dropdown; three columns stay.
- **768–1023:** two columns (decisions + CRM). The transcript becomes a tab; evidence clicks open it.
- **<768:** a single column with tabs (Decisions · Call · CRM); the drawer is full-screen. It must work, but it doesn't need polish.
- Results tables scroll horizontally on small screens. Dot-plots reflow to stacked rows.

## 25. Accessibility

- **Action meaning never relies on colour alone:** an icon plus a text label on every badge. Colours meet WCAG AA contrast.
- **Semantic HTML:**
  - decision cards are `<article>` with headings
  - CRM is a `<table>`/`<dl>`
  - the review queue is a table with row-header cells
- **Drawer:** focus is trapped, `Esc` closes it, and focus returns to the trigger. The `aria-labelledby` field name is set.
- Pipeline progress is announced through an `aria-live="polite"` region ("Extracting… done. Classifying…").
- Evidence highlights use underline plus background, and work in forced-colors mode.
- Approve/Reject and all controls are keyboard reachable with a visible focus ring. The shortcuts are optional enhancements.
- `prefers-reduced-motion` disables staged reveals and highlight pulses.
- Quotes keep the `lang` and text exactly, which helps screen-reader users hear the evidence verbatim.

## 26. Implementation phases

| Phase | Deliverable | Notes |
|---|---|---|
| **P0. Guardrails** (no UI) | Frozen-pin test; `src/product/` scaffolding; presentation mapping and formatters with tests | Pin test: prompt hashes = `a1184542278c3360` / `0565ba90032f9826`, `POLICY_CONFIG=default-v3`, `VALIDATOR_VERSION=meeting-v1`, `GROUNDED_VERSION=3`; product code imports from the frozen modules only |
| **P1. Scenarios and recordings** | Write 3–4 scenario transcripts → overlap check against all benchmark text → **owner review** → record K=5 each (**API spend, needs approval**) | Store all attempts; commit with a recordings manifest |
| **P2. Replay engine** | `replayTransport`, `replayAnalysis()`, verification that re-executed decisions equal the recorded ones | Unit tested with stored recordings; no API |
| **P3. Workspace** | Shell/nav, account rail, transcript with highlights, decision cards, ledger, pipeline strip | The demo's main screen; the most design effort |
| **P4. CRM and review** | Mock CRM, queue, approve/edit/reject, history, reset | Client state plus localStorage |
| **P5. Audit drawer** | Stage timeline, validator check table, counterfactual chip, raw/model-call tabs | |
| **P6. Results and How it works** | Server loader over TEST runs; blocks 1–5; architecture page | Numbers read from files; a test asserts the displayed headline equals the stored metrics |
| **P7. Live mode and paste** | `/api/analyze` streaming, parser, caps, disabled-by-default flag | Optional for the interview; nice for Q&A |
| **P8. Polish and deploy** | Empty/error states, responsive pass, a11y pass, Vercel deploy, README update | |

Rough order of value: P0 → P2 → P3 → P4 → P5 → P6 is the demo. P7 and P8 make it shareable.

## 27. Files to create or modify

**Create:**
```
PRODUCT_PLAN.md, DEMO_SCRIPT_PLAN.md                    (this step)
src/product/present.ts          reason copy, action badges, value formatters, claim grouping
src/product/replay.ts           replayTransport, replayAnalysis, verifyReplay
src/product/analysis.ts         AnalysisResult/AnalysisView types; SystemOutput → view model
src/product/scenarios.ts        load + validate data/demo scenarios and recordings
src/product/results.ts          read TEST runs → headline, overwrite comparison, validator activations, failures, cost
src/product/parseTranscript.ts  paste parser
src/product/limits.ts           live-input caps, rate limiter
src/product/counterfactual.ts   decideClaim without validation (labelled)
src/app/layout.tsx              (modify) fonts, shell, nav
src/app/page.tsx                (modify) redirect to default scenario
src/app/workspace/[scenario]/page.tsx, src/app/workspace/new/page.tsx
src/app/review/page.tsx, src/app/results/page.tsx, src/app/how-it-works/page.tsx
src/app/api/analyze/route.ts
src/components/  AppShell, AccountRail, PipelineStrip, TranscriptPane, DecisionCard, ActionBadge,
                 ContextLedger, CrmRecord, ReviewQueue, ReviewItem, AuditDrawer, StageTimeline,
                 ValidatorChecks, ResultsTable, DotPlot, OverwriteComparison, ArchitectureDiagram,
                 EmptyState, ErrorBanner
src/components/state/demoStore.tsx  CRM + queue reducer, localStorage
scripts/record-demo.ts          real-pipeline recorder (append-only)
scripts/check-demo-overlap.ts   n-gram overlap vs all benchmark transcripts
data/demo/scenarios/*.json, data/demo/recordings/**, data/demo/RECORDINGS.json
tests/product-frozen.test.ts, tests/present.test.ts, tests/replay.test.ts, tests/results.test.ts,
tests/parseTranscript.test.ts
```

**Modify (non-experimental only):**
- `src/app/globals.css`: tokens.
- `next.config.ts`: file tracing includes, if needed.
- `package.json`: scripts `record-demo` and `check-demo-overlap`; no new dependencies.
- `README.md`: results and demo sections. It currently says "No results yet", which is stale and misleading.
- `DECISIONS.md`: a D23 entry for the product layer: replay design, no-SQLite, live-mode policy.
- `.env.example`: `DEMO_LIVE_ENABLED` and `DEMO_LIVE_TOKEN`.

## 28. Risks and complications in the existing codebase

1. **The validator scenario is not reliably reproducible live** (§16). This is the biggest demo risk, mitigated by recordings and experiment traces.
2. **Live latency** of 6–15 s, with only two progress events available (grounded.run is monolithic; per-call events come via the LLMClient wrapper). Acceptable with good loading UI.
3. **Next 16.4 + `cacheComponents`:** APIs may differ from familiar Next versions. Read the bundled docs first.
4. **Classifier `explanation` sometimes contradicts the final action**, for example the TEST 018 note "the date value of null is questionable". Showing it as the primary "why" would confuse users, which is why it's secondary (R4).
5. **`occurredAt` is date-only.** "Today" meetings always become ASK with no date. For pasted calls, the call date input matters, and a wrong date skews validation. The default is today, with a prominent picker.
6. **No-overwrite is absolute.** Every legitimate reschedule needs a human. That's the right demo story, but a real product trade-off: the "Overwrite policy" note on How it works says so. A configurable policy would be a frozen-policy change and is out of scope.
7. **No "approximate" value type in the schema:** "~$100K" is a presentation convention from TENTATIVE certainty (§9).
8. **Replay depends on prompt-hash equality.** If anyone edits a prompt, the replays become invalid. The frozen-pin test and per-load verification catch it.
9. **Run files are large** (TEST Grounded 746 KB). Read them server-side only and pass small view models.
10. **Spoken-number scale and approval-role errors** exist in the frozen system. A pasted call from an interviewer can easily trigger them. Prepare to name them as known failures (Results Block 4), which builds credibility.
11. **README/SPEC are partly stale** (3× runs planned, "no results yet"). Fix the README; leave SPEC as the historical design, with the UI noting single-run.

## 29. What remains frozen (read-only)

- `src/core/**`, `src/systems/**`, `src/llm/**`, `src/eval/**`: prompts, policy, validator, grounding, value equality, scoring, runner.
- `data/benchmark/**` (incl. `FROZEN.json`), `data/runs/**`, `data/analysis/**`.
- `LABELING_GUIDE.md`, `SPEC.md` (design of record), existing `DECISIONS.md` entries (append-only), existing `tests/**` assertions.
- Model config: `claude-sonnet-5-5`, effort `medium`, the same for live and recordings.
- Git tags.

If the product exposes a frozen-system bug, it is **reported in chat** and listed in a `PRODUCT_NOTES.md` "known issues" section, not fixed in place.

## 30. Suggestions to impress Ergo without compromising integrity

1. **"Replay re-executes the real code" badge with verification.** "Deterministic stages re-run on load, decisions identical to recording ✓." This shows engineering rigor in one glance.
2. **Quote the baseline's own words** (Results Block 2): "This replaces the CRM's Thursday value…", followed by an autonomous write. It's the most memorable artifact in the project.
3. **The labelled counterfactual chip** in the validator trace ("without this check: Written"), computed by the real policy function.
4. **"Where it breaks" up front.** Showing the four unsafe writes and five lost writes signals evaluation maturity, which matters to an AI-native startup.
5. **The DEV confound story** (collapsed block). "Our first result was an artifact of unequal prompts; we fixed the comparison and the advantage mostly disappeared." That's rare and credible.
6. **Cost honesty:** ≈2× cost, and most of the measured safety came from code that's free per call. That leads directly to "you could bolt the deterministic gate onto a one-call extractor", a good architecture discussion for Ergo's own agents.
7. **Frame it as a write-gate any agent can sit behind.** Ergo's product talks to CRMs, so position Grounded as a policy layer: agent proposes → gate decides → CRM/review. Keep that framing in prose only; don't build integrations.
8. **Keyboard-driven review queue** (`a`/`r`). A small touch that makes it feel like real ops tooling.
9. **Future-work slide-in (How it works, footer):**
   - context extraction as a separate step (recall 6/23 today)
   - repeated runs and real calls
   - configurable overwrite policy
   - a "unit uncertain" label for spoken numbers

   Each item ties to a measured gap.

What *not* to do:
- no live side-by-side "Grounded vs self-assess" on demo transcripts (stochastic, invites cherry-picking)
- no confidence scores
- no "accuracy" hero number
- no "% safer" claims
- no real CRM connectors
- no chat interface
