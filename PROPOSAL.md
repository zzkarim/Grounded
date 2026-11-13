# Grounded — Design Proposal (for review, nothing implemented yet)

Sections: 1. Types/schemas · 2. Policy · 3. Benchmark format · 4. Baseline · 5. Grounded pipeline · 6. Implementation plan · 7. PRD issues to resolve.

---

## 1. Types and Zod schemas

The file will be `src/core/schemas.ts`. Types are inferred from the schemas with `z.infer`, so each type is defined once.

```ts
import { z } from "zod";

// ---- CRM ----
export const CRMField = z.enum(["budget", "decisionMaker", "nextMeeting"]);

export const BudgetValue        = z.object({ amountUsd: z.number().positive() });
export const DecisionMakerValue = z.object({ name: z.string().min(1), title: z.string().optional() });
export const NextMeetingValue   = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),   // resolved against transcript.occurredAt
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

// Discriminated by field, so a budget can never hold a date.
export const FieldValue = z.discriminatedUnion("field", [
  z.object({ field: z.literal("budget"),        value: BudgetValue }),
  z.object({ field: z.literal("decisionMaker"), value: DecisionMakerValue }),
  z.object({ field: z.literal("nextMeeting"),   value: NextMeetingValue }),
]);

export const CRMState = z.object({
  company: z.string(),
  budget: BudgetValue.nullable(),               // null = Unknown
  decisionMaker: DecisionMakerValue.nullable(),
  nextMeeting: NextMeetingValue.nullable(),
});

// ---- Transcript ----
export const Participant = z.object({
  id: z.string(), name: z.string(),
  side: z.enum(["rep", "customer"]),            // needed: rep assertions ≠ customer assertions
  title: z.string().optional(),
});
export const Turn = z.object({ index: z.number().int(), speakerId: z.string(), text: z.string() });
export const Transcript = z.object({
  id: z.string(),
  occurredAt: z.string(),                       // ISO date; required to resolve "Thursday"
  participants: z.array(Participant),
  turns: z.array(Turn),
});

// ---- Semantic labels (produced by the LLM) ----
export const CertaintyType = z.enum([
  "EXPLICIT", "TENTATIVE", "CONDITIONAL", "NEGATED", "HISTORICAL", "SUPERSEDED",
]);
export const EvidenceSufficiency = z.enum(["DIRECT", "INDIRECT", "NONE"]);

// An evidence quote is tied to a turn. That makes grounding a cheap check,
// lets the UI highlight the quote, and gives us speaker attribution for free.
export const EvidenceQuote = z.object({ turnIndex: z.number().int(), quote: z.string().min(1) });

export const CandidateClaim = z.object({
  id: z.string(),
  fieldValue: FieldValue,                       // { field, value }
  evidence: z.array(EvidenceQuote).min(1),      // >1 allowed: "Rep: so $100K?" / "Customer: yes"
  certainty: CertaintyType,
  sufficiency: EvidenceSufficiency,
  rationale: z.string(),                        // LLM's short explanation, shown but never used by policy
});

// ---- Deterministic outputs ----
export const Action = z.enum(["ACT", "ASK", "ABSTAIN"]);

export const PolicyReason = z.enum([            // machine-readable trace of why the policy decided
  "UNGROUNDED_EVIDENCE", "REP_ONLY_EVIDENCE",
  "NEGATED", "HISTORICAL", "SUPERSEDED", "NO_SUPPORT",
  "TENTATIVE", "CONDITIONAL", "INDIRECT_SUPPORT",
  "CONFLICTING_CANDIDATES", "OVERWRITES_EXISTING_VALUE",
  "EXPLICIT_DIRECT_GROUNDED",
]);

export const GroundingResult = z.object({
  grounded: z.boolean(),
  failures: z.array(z.object({ turnIndex: z.number(), quote: z.string(), reason: z.string() })),
  customerSpoke: z.boolean(),                   // at least one grounded quote is from a customer turn
});

export const ActionDecision = z.object({
  claim: CandidateClaim,
  grounding: GroundingResult,
  action: Action,
  reasons: z.array(PolicyReason),               // all reasons that fired, in rule order
});

// ---- Benchmark ----
export const ExpectedFieldOutcome = z.object({
  action: Action,
  // ACT/ASK: the value that would be written. ABSTAIN: the value that must NOT be written,
  // or null when the transcript contains nothing relevant for this field.
  value: FieldValue.shape /* per-field value */ .optional().nullable(),
  certainty: CertaintyType.optional(),          // diagnostic only
  evidence: z.array(z.string()).optional(),     // diagnostic only; validated to exist in transcript
  notes: z.string().default(""),
});

export const BenchmarkCase = z.object({
  id: z.string(),
  source: z.enum(["handwritten", "generated"]),
  labelStatus: z.enum(["draft", "reviewed"]),
  split: z.enum(["dev", "test"]),
  tags: z.array(z.string()),                    // e.g. "multiple_numbers", "pronoun", "mid_sentence_correction"
  crm: CRMState,
  transcript: Transcript,
  expected: z.object({ budget: ExpectedFieldOutcome, decisionMaker: ExpectedFieldOutcome, nextMeeting: ExpectedFieldOutcome }),
  notes: z.string().default(""),
});

// ---- Evaluation ----
export const OutcomeType = z.enum([
  "CORRECT_ACT", "WRONG_VALUE_ACT", "UNJUSTIFIED_ACT",   // ACT outcomes
  "CORRECT_ASK", "WRONG_VALUE_ASK", "OVER_CAUTIOUS_ASK", "UNDER_CAUTIOUS_ASK",
  "CORRECT_ABSTAIN", "MISSED_ACT", "MISSED_ASK",
]);

export const FieldItemResult = z.object({
  caseId: z.string(), field: CRMField, runId: z.string(), system: z.string(),
  expectedAction: Action, predictedAction: Action,
  expectedValue: z.unknown(), predictedValue: z.unknown(),
  valueMatch: z.boolean().nullable(),           // null when either side has no value
  outcome: OutcomeType,
  failureCause: z.string().optional(),          // filled in MANUALLY during failure analysis
});

export const EvaluationRun = z.object({
  runId: z.string(), system: z.string(), model: z.string(), promptVersion: z.string(),
  benchmarkHash: z.string(), split: z.enum(["dev", "test"]), startedAt: z.string(),
  items: z.array(FieldItemResult),
});
```

(The `ExpectedFieldOutcome.value` line is pseudo-code: the real version is a per-field schema. I left it loose here to keep the sketch readable.)

**Why these choices**
- **Evidence is `{turnIndex, quote}`, not a bare string.** A bare substring check across the whole transcript would accept a quote spoken by the rep, or one taken from the wrong turn. Tying each quote to a turn makes grounding exact and gives speaker attribution, which the policy needs.
- **Values are typed per field.** Scoring needs normalized values. `"$100K"`, `"$100,000"`, and `"100 range"` must all compare as `100000`. Normalization is the model's job; comparison is plain code.
- **`reasons[]` on every decision.** This makes the policy auditable and gives failure analysis a first grouping key.
- **`failureCause` is set manually.** I don't propose an LLM judge for root-cause labels: that would add another unvalidated model to the evaluation. Automatic grouping uses gold certainty and tags. The true root cause is annotated by hand.

---

## 2. Deterministic ACT / ASK / ABSTAIN policy

The policy is evaluated **per claim, then reconciled per field**. Rules run in order, and the first terminal rule wins. Every rule that fires is recorded in `reasons`.

```
Per claim:
 1. grounding.grounded == false                  → ABSTAIN  (UNGROUNDED_EVIDENCE)
 2. certainty ∈ {NEGATED, HISTORICAL, SUPERSEDED}→ ABSTAIN  (signal preserved, value not written)
 3. sufficiency == NONE                          → ABSTAIN  (NO_SUPPORT)
 4. !grounding.customerSpoke                     → ASK      (REP_ONLY_EVIDENCE)
 5. certainty ∈ {TENTATIVE, CONDITIONAL}         → ASK
 6. sufficiency == INDIRECT                      → ASK
 7. otherwise (EXPLICIT + DIRECT + grounded)     → ACT

Per field (reconciliation):
 8. >1 non-ABSTAIN claims with different values  → all of them ASK  (CONFLICTING_CANDIDATES)
 9. ACT would change an existing non-null CRM value to a different value
                                                 → ASK (OVERWRITES_EXISTING_VALUE)   [configurable]
```

**Why rule 1 ABSTAINs instead of ASKs.** An ungrounded quote may be a hallucination. ASK would show a reviewer a fabricated quote as if it were evidence. The cost is that a correct value with a paraphrased quote gets dropped. That cost is measurable, because we log every grounding failure.

**Policy knobs give honest operating points.** Rules 4, 5, 6, and 9 each choose between ASK and ACT. Named presets such as `strict`, `default`, and `permissive` produce a few **discrete** precision/coverage points. Policy code is deterministic, so every preset can be re-run on **cached** LLM outputs at zero cost. That supports a real precision-vs-coverage chart without inventing a confidence threshold. The chart should show points, not a fitted curve.

### Where a naive "EXPLICIT → ACT" is unsafe

| Situation | Example | Why EXPLICIT is not enough |
|---|---|---|
| Explicit but wrong relationship | "Sarah is leading the evaluation." | It establishes involvement, not final authority. Sufficiency = INDIRECT. |
| Explicit about the wrong quantity | "The license would run about $100K." / "A competitor quoted $100K." | That's price or a quote, not budget. Sufficiency = NONE. |
| Explicit about a third party's belief | "Our VP thinks we could get $200K approved." | It reports a belief accurately, but the claim it reports is tentative or conditional. |
| Explicit, then superseded later in the same call | "Budget's $100K." … 10 turns later … "Actually finance cut it to $75K." | Labeling each sentence in isolation marks both as EXPLICIT. Rule 8 (conflict) is the safety net. |
| Explicit but stated only by the rep | Rep: "So you've got $100K approved." Customer: "Mm." | The customer never asserted it. Rule 4. |
| Explicit but underspecified | "Let's meet next week." / "Budget is in the six figures." | No writable value. It should fail value validation, then ASK or ABSTAIN. |
| Explicit but joint authority | "Sarah and Tom both have to sign." | The field holds a single value. ASK. |
| Explicit but overwrites known CRM data | CRM: $120K, transcript: "$100K is approved." | It may be correct, but it destroys existing data. Rule 9 (configurable). |
| Explicit but ungrounded | The model quotes a sentence nobody said. | Rule 1. |
| Explicit-sounding sarcasm or joke | "Sure, our budget's a million dollars, ha." | Rare. The LLM must catch it as NONE or TENTATIVE. The policy can't. |

---

## 3. Benchmark format

**Storage.** One file per case, `benchmark/cases/<id>.json`, so diffs are reviewable and edits are visible in git. `benchmark/FROZEN.json` records `{ frozenAt, sha256 per file, combined hash, caseCount }`. The eval script refuses to run if the hashes don't match.

**Validation script** (`npm run validate-benchmark`) checks:
- Every case passes Zod validation.
- Every gold evidence quote is grounded in the transcript. The labels must meet the same standard as the system.
- Ids are unique.
- It prints counts by split, source, field × gold action, and gold certainty, so class imbalance is visible before freezing.

**Example case:**

```json
{
  "id": "budget-tentative-001",
  "source": "handwritten",
  "labelStatus": "reviewed",
  "split": "dev",
  "tags": ["tentative", "approval_dependency"],
  "crm": { "company": "Acme", "budget": null, "decisionMaker": null, "nextMeeting": null },
  "transcript": {
    "id": "t-budget-tentative-001",
    "occurredAt": "2026-03-10",
    "participants": [
      { "id": "r1", "name": "Dana", "side": "rep" },
      { "id": "c1", "name": "Priya", "side": "customer", "title": "Head of RevOps" }
    ],
    "turns": [
      { "index": 0, "speakerId": "r1", "text": "What's the budget looking like?" },
      { "index": 1, "speakerId": "c1", "text": "We could probably spend around $100K, but I'd need approval from finance first." }
    ]
  },
  "expected": {
    "budget": {
      "action": "ASK",
      "value": { "amountUsd": 100000 },
      "certainty": "TENTATIVE",
      "evidence": ["We could probably spend around $100K, but I'd need approval from finance first."],
      "notes": "Hedged and depends on finance approval. TENTATIVE beats CONDITIONAL here because the hedge applies to the amount itself; labelers may disagree."
    },
    "decisionMaker": { "action": "ABSTAIN", "value": null, "notes": "'Finance' is not a person." },
    "nextMeeting":   { "action": "ABSTAIN", "value": null, "notes": "" }
  },
  "notes": ""
}
```

**Size and split (proposal).** Roughly 60 transcripts, which gives 180 field-items:
- ~25 handwritten core cases from you, covering every certainty type × field and every hard-case tag in the PRD.
- ~35 generated variations, labeled `draft` until you review them.
- Split about 20 dev / 40 test, stratified so both splits contain every category.

Many field-items will be "nothing relevant → ABSTAIN". That is useful, because it tests for hallucinated writes. But it inflates the abstention rate, so the report also gives rates over **relevant** items (gold value ≠ null).

---

## 4. One-prompt baseline

**Recommendation: two baseline variants, same prompt skeleton.** The only difference is one output field.

- **B0 — naive extractor.** "Propose CRM updates." Every proposed update is treated as ACT. This is what someone builds in an afternoon.
- **B1 — self-assessing extractor.** Same prompt, plus each update has `apply: "auto" | "review"`. `auto` → ACT, `review` → ASK, omitted → ABSTAIN. This is the stronger and fairer competitor. Grounded has to beat *the model judging itself in one pass*, not just a strawman.

Without B1, the review-rate comparison is trivial: B0 never asks. B1 also isolates the actual research question: does **decomposition + deterministic policy + grounding** beat **asking the same model for the same judgment in one shot**?

**Fairness: give B1 the same general rubric.** Gold actions encode *your* policy judgments. Grounded's policy is written by the same person who writes the labels, so B1 should get the same *general* written definitions of ACT/ASK/ABSTAIN that the labeling guide uses. It gets no examples and no case hints. Otherwise Grounded partly wins by knowing the rubric rather than through its architecture.

Draft B1 prompt (B0 drops the bracketed parts):

```
System:
You update a CRM from sales call transcripts. Supported fields:
- budget: money the customer currently has approved/allocated for this purchase (USD).
- decisionMaker: the person with final authority to approve the purchase.
- nextMeeting: a specific agreed future meeting date (resolve relative dates using the call date).

Given the current CRM state and a transcript, return the updates the transcript supports.
For each: field, value, a verbatim quote from the transcript supporting it[, and apply:
"auto" if it is safe to write without human review, "review" if a human should confirm first.
Only use "auto" when the customer clearly and currently asserts the value.]
Omit fields the transcript gives no reason to update.

User:
Call date: {occurredAt}
Current CRM: {crm JSON}
Transcript:
[0] Dana (rep): ...
[1] Priya (customer): ...
```

Output is validated with Zod through structured outputs. Both baselines and Grounded use the **same model and effort setting**. Baseline quotes are *not* grounding-checked in the decision, since the baseline would never do that. They *are* checked afterwards as a diagnostic: "X% of baseline quotes were not in the transcript."

---

## 5. Grounded pipeline (for context; not built yet)

```
transcript + CRM
  → [LLM 1] extract candidates + evidence quotes    (recall-oriented: include negated/historical values)
  → [LLM 2] per candidate: certainty + sufficiency   (sees transcript + candidate, NOT LLM 1's reasoning)
  → [code] grounding check
  → [code] policy → ActionDecision[]
```

There are two LLM calls, not five. Splitting extraction from classification lets the classifier judge a claim without anchoring on the extractor's framing. More stages would add cost and failure surface without a clear hypothesis behind them. **Ablation** comes cheap later: Grounded with one combined LLM call vs two calls tells us whether the split itself is what helps.

Model: Claude Opus 5.5 (`claude-opus-5-5`) for every system, `messages.parse()` with Zod schemas, and a fixed `effort`. Current models reject `temperature`, so **each system runs 3× per split and the report shows the spread**.

---

## 6. Smallest implementation plan

**0. Setup (≈30 min).**
- `git init`. Freezing is meaningless without history.
- Add `package.json` with `typescript`, `zod`, `vitest`, `tsx`, `@anthropic-ai/sdk`.
- Layout: `src/core/` (schemas, grounding, policy, scoring: framework-free), `src/llm/` (client interface + Anthropic impl), `src/systems/` (baseline, grounded), `scripts/`, `benchmark/`, `results/`.
- No Next.js yet.

**a. Frozen benchmark**
1. `schemas.ts` + `validate-benchmark` script + grounding function, with Vitest tests.
2. `LABELING_GUIDE.md`: field definitions, certainty precedence, action rubric. **You** write and approve it.
3. You write ~5 seed cases. We run validation and check that the schema holds up.
4. You write the rest of the handwritten core. A generation script drafts variations (`source: generated`, `labelStatus: draft`, plus model id and prompt). You review them.
5. Assign the split and freeze: hash manifest + git tag `benchmark-v1`.

**b. Baseline results**
1. `LLMClient` interface + Anthropic implementation. Raw responses are written to `results/raw/<runId>/`.
2. B0/B1 systems → common `SystemOutput` (per-field action + value).
3. `score.ts` is pure functions. It's unit-tested against hand-built predictions *before* it touches real output.
4. `report.ts` writes a markdown report.
5. Run B0/B1 3× on dev and on test. Commit the raw results. **Baseline numbers are now locked.**

**c. Grounded pipeline**
1. `policy.ts` + table-driven tests, written before any prompts.
2. Extraction and classification prompts.
3. Iterate on **dev only**. Log each iteration (prompt version, dev metrics) in `results/ITERATIONS.md`, including regressions.
4. One recorded test run (3×) when you decide it's done.

**d. Comparison and failure analysis**
1. Report: metrics by system, field, certainty, source, and tag; confusion matrices; policy-preset operating points from cached outputs.
2. A failure listing with transcript snippets.
3. Manual `failureCause` annotation in `results/failure_annotations.json`.
4. Optional ablations: Grounded minus the grounding check; Grounded with LLM-chosen actions instead of the policy.

**e. Demo UI.** Add Next.js + Tailwind. The demo view reads cached results; a live run is optional. The evaluation view renders the existing report JSON. No new metrics are computed in the UI.

---

## 7. PRD weaknesses, ambiguities, and assumptions to resolve

1. **The unit of evaluation is undefined.** The PRD's case has one `field`, but one transcript yields candidates for several fields, possibly several per field, plus spurious extras. *Proposal:* label all three fields per case and score per field-item, after reconciling multiple claims per field.
2. **"Correct autonomous write" is ambiguous.** Is writing $100K from "we could probably spend $100K" correct? The value matches, but the write wasn't justified. *Proposal:* correct = gold ACT **and** value match. Report UNJUSTIFIED_ACT separately. Optionally also report a lenient value-only precision, which shows where the baseline *extracts* correctly but *acts* wrongly.
3. **CORRECTED isn't a certainty level.** It's a relationship between two values. The new value has its own certainty (often EXPLICIT); the old one is superseded. *Proposal:* label the old value `SUPERSEDED`. Mixed cases ("we probably used to have…") need a precedence rule.
4. **The PRD's sufficiency example mixes semantics and policy.** "INSUFFICIENT_FOR_AUTONOMOUS_WRITE" is a policy outcome. If sufficiency already means "safe to write", the policy is double-counting the LLM's judgment. *Proposal:* sufficiency is purely about the semantic relationship (DIRECT / INDIRECT / NONE).
5. **The baseline as specified has no ASK.** That makes review-rate comparison trivial and the comparison weak. *Proposal:* B0 + B1 (§4).
6. **Gold actions are normative, not factual.** Whether "We have about $100K" should be ACT or ASK is a policy choice. If you write both the labels and Grounded's policy, Grounded is aligned with the labels by construction. Mitigations:
   - Write the labeling guide *before* the policy code.
   - Give B1 the same general rubric.
   - Label actions holistically. Never derive them from your own certainty/sufficiency labels via the policy.
   - Say this openly in the README.
7. **A frozen benchmark plus iteration still overfits.** If you tune prompts while looking at test failures, the benchmark is no longer held out. *Proposal:* a dev/test split, test runs logged and rare.
8. **Small N.** With ~40 test cases, one case is worth ~2.5 points. Report counts, not just percentages. Run-to-run variance may be as large as the system differences, so three runs is the minimum to tell. Consider Wilson intervals on ACT precision. They're simple and honest.
9. **Field semantics need pinning down:**
   - *budget*: ranges ("80–100K"), currency, approved vs allocated vs spend authority, "the 100 range".
   - *decisionMaker*: a role with no name ("our CFO"), joint signers, economic buyer vs technical approver.
   - *nextMeeting*: needs the call date and the reference week convention ("next Thursday"); does a rep proposal plus "sure" count as agreed?
   
   These belong in the labeling guide.
10. **Existing CRM state is underspecified.** What happens when the field is already filled? Overwrite, ASK, or treat as a supersession candidate? *Proposal:* a configurable rule 9, default ASK, plus a few benchmark cases with pre-filled CRM.
11. **Speaker attribution matters.** Rep statements confirmed by "yeah" are common in real calls. The PRD doesn't say whether these count as customer assertions.
12. **Synthetic-data bias.** Generated transcripts are cleaner than real speech: no ASR errors, crosstalk, or truncation. If the same model family generates cases and is evaluated on them, the cases may be easier for it. Mark generated cases, report handwritten-only metrics separately, and list this as a limitation.
13. **Single labeler, no agreement measure.** A cheap mitigation: re-label ~15 cases blind a week later and report self-agreement. Ideally a second person labels a subset.
14. **The cost of ASK isn't modeled.** Precision vs coverage has no single "best" point without a cost ratio between a wrong write and a review. Don't invent one. Show the operating points and discuss.
15. **"Next meeting" in the past or already in the CRM.** Decide whether a meeting date before `occurredAt`, or matching the existing CRM value, is a no-op ABSTAIN.
