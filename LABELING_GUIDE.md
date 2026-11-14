# Grounded — Labeling Guide

This guide defines the ground truth. Use it to label a transcript **without making up rules case by case**. If a transcript can't be labeled with these rules, don't improvise. Write the question in the case's `notes`, leave `labelStatus: "draft"`, and add the rule to this guide (with a dated changelog entry) **before** labeling more cases.

Ground rules:
- Label from the transcript and the existing CRM state only. **Never look at any system's output for a case before its label is final.**
- Gold labels are written or approved by the project owner. LLM-drafted labels stay `labelStatus: "draft"` until a human reviews them.
- Every field of every case gets a label, including "nothing here" (`ABSTAIN`, value `null`).
- Gold evidence quotes must be copied exactly from the cited turn. `npm run validate-benchmark` checks this.

---

## 1. Unit of labeling

One **field-item** = (case, field). Each case has exactly three: `budget`, `decisionMaker`, `nextMeeting`.

Each field-item gets one expected outcome:

```jsonc
{
  "action": "ACT" | "ASK" | "ABSTAIN" | "NO_OP",
  "value": <field value> | null,          // see §6 for what goes here
  "status": "CURRENT" | "HISTORICAL" | "NEGATED" | "SUPERSEDED" | null,
  "certainty": "EXPLICIT" | "TENTATIVE" | "CONDITIONAL" | null,
  "sufficiency": "DIRECT" | "INDIRECT" | "NONE" | null,
  "evidence": [{ "turnId": "t3", "speakerId": "priya", "quote": "exact text" }],
  "rationale": "one or two sentences: why this action"
}
```

`status`, `certainty`, `sufficiency`, and `evidence` describe the claim behind `value`. They are all `null`/empty when `value` is `null`.

---

## 2. Field definitions and value representation

### 2.1 `budget`

**Definition.** The money the customer organization has **currently approved or committed** for **this purchase**.

**Not budget** (sufficiency `NONE` when proposed as budget):
- the price the seller quoted
- a competitor's price
- what they pay an incumbent vendor
- revenue or headcount figures
- spending-authority thresholds ("anything over 50K needs the CFO")
- a total company or department budget that this purchase isn't stated to come from

**Value**, choose one:
```jsonc
{ "kind": "exact", "amount": 100000, "currency": "USD" }
{ "kind": "range", "min": 80000, "max": 100000, "currency": "USD" }
```
- **Never invent a midpoint.** "Between 80 and 100K approved" is a `range`, not 90000.
- "Up to / capped at / no more than $X approved" means `exact` X: the approved amount is X.
- Shorthand: "100K", "a hundred grand", and "the 100 range" (when the conversation is clearly about thousands) all mean `100000`.
- **Currency:** use the stated symbol or word (`$` = USD, `€` = EUR, `£` = GBP). If no currency is stated and no other currency appears in the conversation, use `USD`.
- **Approximators** ("around", "about", "roughly", "ballpark", "~") keep the stated number as `exact` but make the certainty `TENTATIVE` (§3.2).
- If only components are approved ("80 for licenses and 20 for services") and no total is stated, the value is the sum and sufficiency is `INDIRECT`. The total was derived, not said.
  - **Components are not competing budget values.** Each individual component is a *part* of the budget, not a candidate for it: a component claim (80K, 20K) has sufficiency `NONE` and is kept only as a signal. The canonical CRM candidate is the derived total.
  - If a total is also stated outright, the stated total is the candidate (labeled on its own wording) and the components are `NONE`.
  - "Latest stated" (§4 step 4) never chooses between a component and its total. It resolves only genuinely competing claims about the same CRM value.
- Vague magnitudes with no number ("six figures", "a decent budget") are **not representable**. Do not create a candidate. Mention it in `notes` if useful.

### 2.2 `decisionMaker`

**Definition.** The person(s) or identified role(s) explicitly established as holding **final approval / sign-off authority for this purchase**.

**Value:**
```jsonc
{ "people": [ { "name": "Marcus Lee", "role": "CFO" } ] }
```
- Each person has a `name`, a `role`, or both (the other is `null`). Use the fullest form of the name stated anywhere in the transcript. `role` is the person's job title or organizational role as stated ("CFO", "VP Engineering"). It is not the type of approval.
- **A role without a name** is valid: "Our CFO has final approval" gives `{ "name": null, "role": "CFO" }`. If the CFO is named elsewhere in the transcript, include the name.
- **Joint approval:** list everyone who must **all** sign: "Dana and Raj both have to sign" gives two people. The order doesn't matter.
- **Distinct approval types:** "Sarah owns technical approval, but James signs the contract" means the decision maker is **James only**. Contract signature or final purchase approval is what counts. A technical, security, or legal approver is not a decision maker unless also described as final.
- **Speaker as decision maker:** "I make the final call" means the speaker's name and title.
- **Relative descriptions** ("my boss has final say") are recorded as stated in `role` ("Priya's manager") when no name or title is given.

**Sufficiency for `decisionMaker`:**
- `DIRECT`: final authority is stated. Phrases: "final say", "final sign-off", "signs the contract", "it's her call", "approves the purchase".
- `INDIRECT`: the person has a role in the decision short of final authority. Examples: leading or owning the evaluation, "I need to run it by James", "James needs to approve it" (not stated as final), budget owner, a technical approver who is not stated as final.
- `NONE`: mentioned with no decision or approval role: attends the call, uses the product, "loop in Sarah from IT".

### 2.3 `nextMeeting`

**Definition.** A **mutually agreed**, **future**, **synchronous** meeting between seller and customer (call, video, or onsite), with timing specific enough to put in a CRM.

**Value:**
```jsonc
{ "date": "2026-03-12", "time": "14:00", "timezone": null, "asStated": "Thursday at 2" }
```
- `date` is `YYYY-MM-DD`, resolved against the call date `transcript.occurredAt`. It is `null` if there is no resolvable specific day.
- `time` is `HH:MM` in 24-hour time, or `null`. "At 2" in a business context means 14:00. If AM/PM is genuinely unclear, use `null`.
- `timezone` is copied as stated ("ET"), else `null`. It is **not** used when comparing values.
- `asStated` is the timing phrase as spoken. It is shown to reviewers and not used when comparing values.

**Date resolution** (call date = D):
- "Thursday" or "this Thursday" = the first Thursday **strictly after** D.
- "Tomorrow" = D + 1. An explicit date ("the 17th") resolves within the current or next month, whichever is in the future.
- "Next Thursday" is **ambiguous** unless the speakers disambiguate it. Then `date: null` and tag `ambiguous_date`.
- If a stated weekday and date contradict each other ("Tuesday the 18th" when the 18th is a Wednesday), `date: null`.

**What counts as agreed:**
- A proposal from one side **plus unhedged acceptance** from the other ("works", "see you then", "send the invite", "booked") is agreed. Certainty `EXPLICIT`.
- Hedged acceptance ("should work", "probably", "I'll confirm", "pencil it in") is certainty `TENTATIVE`.
- A proposal with no acceptance is **rep-only or proposer-only**. Certainty `TENTATIVE`, and it can't be `ACT` (§4).
- **What makes a meeting candidate at all.** There must be either:
  - (a) an explicit agreement to meet, even with vague timing ("Yeah, let's talk sometime next week"), or
  - (b) a specific proposed time, even if not yet accepted ("I'll send an invite for Tuesday at 11").
- Without (a) or (b), a promise to *find* or *check* times ("I'll ask her assistant for times", "let me look at calendars") is an asynchronous action, not a meeting, and an availability constraint ("she's out until the 15th, nothing before then") is `NONE`. Checking availability only lowers the certainty of a proposal that already exists ("let me see what next week looks like" after a specific proposal → `TENTATIVE`).

**Not a meeting** (sufficiency `NONE`): deadlines ("I'll have an answer Thursday"), the customer's internal meetings ("our board meets on the 20th"), async deliverables ("I'll send pricing Friday"), and events the seller won't attend.

---

## 3. Claim semantics

A **claim** is one candidate value for one field, with its supporting evidence. A transcript can contain several claims for the same field ($100K negated, then $80K stated).

Each claim gets **three independent labels**: status, certainty, and sufficiency.

### 3.1 Status: is the claim about the current state?

| Status | Meaning | Example |
|---|---|---|
| `CURRENT` | Presented as true now (or, for meetings, as an upcoming agreed meeting). | "We have $100K approved." |
| `HISTORICAL` | Describes a past state, with no newer value named in its place. | "Our budget last year was $100K." "We used to have 100." |
| `NEGATED` | The speaker states this value is not true. | "We don't have $100K." Rep: "So $100K?" Customer: "No." |
| `SUPERSEDED` | Was true or stated earlier, and is **explicitly replaced by a newer value**. That can be later in this conversation or relative to an earlier period. | "I said 100 before, but finance approved 75" (100 is SUPERSEDED, 75 is CURRENT). "Dana's — well, Dana *and* Raj" (Dana-alone is SUPERSEDED). |

**Status precedence** (when more than one fits): `NEGATED > SUPERSEDED > HISTORICAL > CURRENT`.
Any non-`CURRENT` status means the value is never written, so the precedence only affects diagnostics.

- HISTORICAL vs SUPERSEDED: "We approved 75 initially, but finance later reduced it to 50" makes 75 SUPERSEDED (a named newer value replaced it). "We used to have 75" makes 75 HISTORICAL (no replacement named).
- A conditional negation ("If finance cuts it we won't have 100K") is labeled by its stated effect. The speaker is asserting what *won't* be true in a scenario, so it is `NEGATED`.

### 3.2 Certainty: how strongly is the claim asserted?

| Certainty | Meaning | Signals |
|---|---|---|
| `EXPLICIT` | Asserted plainly as fact. | "is", "we have", "approved", "works, send the invite" |
| `TENTATIVE` | Hedged, approximate, guessed, or reported belief. | "probably", "I think", "around", "ballpark", "last I heard", "should work", "don't quote me" |
| `CONDITIONAL` | Depends on an event that has not happened yet. | "if finance approves", "once legal signs off", "pending approval", "still has to be signed off" |

**Certainty precedence:** `CONDITIONAL > TENTATIVE > EXPLICIT`. Hedged and pending together is `CONDITIONAL`.

Certainty is labeled even for non-CURRENT claims ("we *probably* used to have 100K" is HISTORICAL + TENTATIVE).

**Reported speech:** a customer plainly relaying a fact from someone in their org ("our CFO confirmed we have 100K approved") is `EXPLICIT`. Relaying a belief or guess ("our VP thinks we could get 200K") is `TENTATIVE`, or `CONDITIONAL` if approval is still pending.

### 3.3 Sufficiency: does the evidence establish the field relationship?

This is separate from certainty. An `EXPLICIT` statement can still be `INDIRECT` or `NONE`.

| Sufficiency | Meaning |
|---|---|
| `DIRECT` | Taken at face value, the evidence states exactly the relationship the field requires (approved budget for this purchase, final authority, agreed meeting). |
| `INDIRECT` | Relevant, but reaching the field relationship needs inference, or it only partly establishes it. |
| `NONE` | Does not support this value for this field. |

Field-specific boundaries are listed in §2.

### 3.4 Speakers

- Only **customer-side** speech can establish a value. A rep statement establishes nothing unless the customer **affirms** it.
- **Affirmation:** a customer answer to a rep's question about that specific value that clearly agrees ("Yes", "Yeah, that's right", "Correct"). The evidence then includes **both** turns: the rep's statement and the customer's affirmation.
- **Not affirmation:** backchannels ("mm", "uh-huh", "okay" while the rep keeps talking), deflections ("let's get the security review done first"), and silence. A rep-only claim is labeled `TENTATIVE` and **cannot be ACT**.
- **Unaffirmed rep claims: facts vs. proposed actions.**
  - A **factual assertion** by the rep about the customer's state (a budget figure, who signs, an existing plan) that the customer does not affirm is **not evidence for the field**. If the customer deflects or gives no support for it, sufficiency is `NONE` and the field `ABSTAIN`s. The rep's value is kept as the tempting wrong candidate (`TENTATIVE`, `NONE`).
  - A **proposed future coordination action** (a meeting the rep proposes or books) that the customer neither accepts nor declines can remain a plausible pending action. It is `TENTATIVE` + `INDIRECT` and `ASK`s (§2.3). This needs an actual meeting proposal with specific timing; it does not turn a promise to look for times into a meeting candidate (§2.3, "What makes a meeting candidate").
  - In both cases, a customer who supports the rep's statement only partially is labeled on what the customer actually said.
- **Denial:** "No" or a correction makes the rep's value `NEGATED` or `SUPERSEDED`.
- **Pronouns:** resolve them only if the transcript makes the referent unambiguous. Otherwise treat the claim as `INDIRECT`.

---

## 4. Deciding the expected action

Apply these steps **in order** for each field. This is the same rubric the deterministic policy implements (see `SPEC.md` §6). The benchmark measures whether systems get the *semantics* right and apply this rubric correctly. It does not test whether the rubric itself is optimal.

1. **List the claims** for this field: every value a reasonable extractor might propose, including negated, historical, superseded, and distractor values.
2. **Discard as signals only** any claim whose status is not `CURRENT`, or whose sufficiency is `NONE`. These are never written.
3. **No remaining claims** → `ABSTAIN`. For `value`, see §6.
4. **Remaining claims establish competing values** → `ASK`. Gold `value` = the competing claim stated **latest** in the transcript.
   - Claims compete only if they are candidate values *for the same relationship*. For `budget` and `nextMeeting`, any two remaining claims with different values compete.
   - **`decisionMaker`:** if any remaining claim is `DIRECT` (it establishes final purchase/sign-off authority), then `INDIRECT` claims (evaluation lead, "run it by", budget owner, technical/security approver) are **signals only and do not compete**. Set them aside like step 2 discards. Example: "Sarah leads the evaluation" (`INDIRECT`) + "James signs the contract" (`DIRECT`) means James, with no conflict.
   - **Two different `DIRECT` `decisionMaker` claims do compete** (ASK), unless the transcript explicitly establishes joint approval. Joint approval is a *single* claim listing every required signer (§2.2), not two competing claims.
   - If no remaining `decisionMaker` claim is `DIRECT`, `INDIRECT` claims with different values compete as usual.
5. **The remaining value equals the existing CRM value** (§5) → `NO_OP`, whatever the certainty. There is nothing to write or review.
6. → `ASK` if **any** of these hold:
   - the existing CRM value is non-null and **different** (no autonomous overwrite)
   - certainty is `TENTATIVE` or `CONDITIONAL`
   - sufficiency is `INDIRECT`
   - no customer-side evidence (rep-only)
   - the value is underspecified (a meeting with `date: null`)
7. Otherwise (`CURRENT` + `EXPLICIT` + `DIRECT` + customer evidence + fully specified + no conflict with CRM) → `ACT`.

| Action | Meaning |
|---|---|
| `ACT` | Safe enough under the default policy to write autonomously. |
| `ASK` | Plausible, useful update; a human must approve it before the CRM changes. |
| `ABSTAIN` | The evidence doesn't justify writing any value. Signals (negated, historical, distractor values) stay in the claim record. |
| `NO_OP` | Supported, and identical to what the CRM already holds. Corroboration, not a write. |

Known limitation: there is no "clear this field" action. If the transcript negates the **existing** CRM value ("we no longer have the 150"), label `ABSTAIN` and explain in `rationale`. The CRM stays stale, and that is a deliberate MVP scope gap.

---

## 5. Value equality (used for NO_OP and conflicts) and scoring exact match

- **budget:** same `kind`, same currency, same amount (or same min and max). An `exact` value never equals a `range`.
- **decisionMaker:** same number of people, and each person matches a distinct person on the other side.
  - Two people match if both names are present and match: case-insensitive, whitespace-normalized; a single-token name also matches a multi-token name with the same first token ("Sarah" ↔ "Sarah Chen").
  - If either side has no name, two people match only if both roles are present and equal (case-insensitive). "CFO" ≠ "Chief Financial Officer". Write roles as the transcript states them.
- **nextMeeting:** same `date` (including both `null`), and same `time` **when both are non-null**. `timezone` and `asStated` are ignored.

**Scoring uses exact match** (scoring v2, introduced 2026-11-14, after DEV Run 1). It is the same as above for `budget` and `decisionMaker`. For `nextMeeting`, `time` must also be **equal, null included**:
- a prediction that drops a gold time, or has a different time, is not a match
- a prediction that adds a time where gold has none is not a match

The looser rule above still decides whether two claims are *the same fact*, for NO_OP corroboration and conflict detection. Scoring asks whether the *exact CRM value* would be written: a system should not get full credit for dropping known CRM information, or for writing a time the transcript doesn't establish.

---

## 6. What goes in `value`

| Action | `value` |
|---|---|
| `ACT`, `NO_OP` | The value to write or that matches. |
| `ASK` | The value a reviewer should be asked about (latest-stated when they conflict). |
| `ABSTAIN` | The **most tempting wrong value**: the one a naive system would most likely write (the negated $100K, the board meeting date, the 50K threshold), labeled with its status, certainty, and sufficiency. Use `null` if the transcript contains nothing relevant to the field. |

---

## 7. Tags (controlled vocabulary)

Tag the case with every applicable tag. They drive the per-category breakdowns. The allowed values are in `src/core/schemas.ts` (`CaseTag`):

`explicit`, `tentative`, `conditional`, `negation`, `historical`, `supersession`, `multiple_numbers`, `multiple_stakeholders`, `joint_approval`, `pronouns`, `filler_words`, `mid_sentence_correction`, `ambiguous_date`, `irrelevant_info`, `no_update`, `explicit_but_insufficient`, `unconfirmed_rep_statement`, `messy_speech`, `existing_value`.

---

## 8. Representative edge cases

| Transcript (customer unless noted) | Field | Expected |
|---|---|---|
| "Our approved budget is $100K." | budget | ACT exact 100000 · CURRENT/EXPLICIT/DIRECT |
| "We're probably around $100K." | budget | ASK 100000 · TENTATIVE |
| "If finance approves, we'll have $100K." | budget | ASK 100000 · CONDITIONAL |
| "We don't have $100K." | budget | ABSTAIN, value 100000 · NEGATED |
| "Our budget last year was $100K." | budget | ABSTAIN, value 100000 · HISTORICAL |
| "I said 100 before, but finance approved 75." | budget | ACT 75000 (100000 is SUPERSEDED). ASK instead if the CRM holds a different value. |
| "We have between $80K and $100K approved." | budget | ACT range 80000–100000 |
| "40 approved for licenses and another 10 approved for services." | budget | ASK 50000 · INDIRECT (derived total); 40000 and 10000 are NONE components, not competitors |
| "Your quote of $120K is above what we'd like." | budget | ABSTAIN, value 120000 · NONE (price, not budget) |
| Rep: "So your budget is $100K?" · Customer: "No." | budget | ABSTAIN, value 100000 · NEGATED |
| Rep: "So $100K is approved?" · Customer: "Yep, that's right." | budget | ACT 100000 (evidence = both turns) |
| Rep: "So you have about $100K?" · Customer: "We'll see." | budget | ABSTAIN, value 100000 · TENTATIVE/NONE (unaffirmed rep fact) |
| Rep: "I'll book Thursday at 3." · Customer: "Let me check." | nextMeeting | ASK · TENTATIVE/INDIRECT (pending proposed action) |
| "Sarah has final sign-off." | decisionMaker | ACT [Sarah] |
| "Sarah is leading the evaluation." | decisionMaker | ASK [Sarah] · EXPLICIT/INDIRECT |
| "I need to run this by James." | decisionMaker | ASK [James] · INDIRECT |
| "Our CFO has final approval." | decisionMaker | ACT [{name: null, role: "CFO"}] |
| "Sarah owns technical approval, but James signs the contract." | decisionMaker | ACT [James] (Sarah is INDIRECT and does not compete, §4 step 4) |
| "Sarah has final sign-off." … later, unreconciled … "James has final sign-off on this." | decisionMaker | ASK (latest: James): two different DIRECT claims, no joint approval stated |
| "Dana and Raj both have to sign." | decisionMaker | ACT [Dana, Raj] |
| "Thursday at 2 works. Send me the invite." | nextMeeting | ACT {date: next Thu, time: 14:00} |
| "Thursday should work; I'll confirm." | nextMeeting | ASK · TENTATIVE |
| "Let's talk sometime next week." | nextMeeting | ASK {date: null} · underspecified |
| "I'll have an answer Thursday." | nextMeeting | ABSTAIN, value {date: Thu} · NONE |
| Rep: "When can we meet Rachel?" · Customer: "She's out until the 15th. I'll ask her assistant for times after that." | nextMeeting | ABSTAIN, value {date: the 15th} · NONE (constraint plus a promise to find times; no meeting candidate) |
| Any supported value identical to the CRM value | any | NO_OP |
| Any supported value different from a non-null CRM value | any | ASK |

---

## Changelog
- 2026-11-13: v1 drafted (Claude, for owner review).
- 2026-11-13: **v1 approved by the owner.** Confirmed: an unconfirmed, proposer-only meeting is labeled ASK (§2.3, §3.4); `meeting-ex-02` stays ASK.
- 2026-11-14: **v1.1 (owner-directed).**
  - §4 step 4: claims conflict only when they establish competing values. For `decisionMaker`, `INDIRECT` claims don't compete with a `DIRECT` final-authority claim; two different `DIRECT` claims do compete unless joint approval is explicit. This resolves the v1 contradiction between §2.2/§8 and step 4.
  - §3.4: an unaffirmed rep *factual* assertion is `NONE` → `ABSTAIN`, while an unaccepted rep-proposed *meeting* remains `INDIRECT` → `ASK`.
  - Two §8 rows added for each rule.
- 2026-11-14: **v1.2: clarifications made after DEV Run 1** (POST_RUN1_DECISIONS.md). No frozen dev label changes.
  - §2.1: budget components are NONE signals, not competitors of their derived total; "latest stated" never picks between a component and its aggregate.
  - §2.3/§3.4: a meeting candidate needs an explicit agreement to meet or a specific proposed time; "I'll ask for times" and availability constraints are not meeting candidates.
  - §5: scoring uses exact match, with the meeting time equal including null (scoring v2). Semantic equality for NO_OP and conflicts is unchanged.
