# Grounded: Demo Walkthrough Plan (~2 minutes)

> Outline only, not the final script. It assumes the screens in PRODUCT_PLAN.md and the replay recordings in PRODUCT_PLAN §15–16.
> Every number spoken must match the Results page, which reads the stored TEST run files.

## Ground rules for the presenter

- **Default to replay.** Say once, early, that it's real: "These are recorded runs of the real pipeline. The deterministic stages re-execute live on every load."
- **Don't run live** unless asked. If asked, use Paste a call. Expect 6–15 s, and be ready to name the known failure modes if they show up.
- **Never claim** "Grounded beats self-assessment." Say: "matched or slightly exceeded it in one held-out run. The difference isn't statistically meaningful. The clear win is deterministic enforcement."
- **Keep the vocabulary plain.** On screen: "Written / Needs review / Not written / Already current". The codes (ACT/ASK/...) appear only if an engineer asks.

## Beat sheet

| # | Time | Beat | Screen and action | Point to land |
|---|---|---|---|---|
| 1 | 0:00–0:15 | **Opening problem** | Workspace, Corrigan loaded; cursor on the pipeline strip | LLMs are good at *understanding* a sales call. Letting one *write* to the CRM is a different reliability bar. The question: when is an extracted claim safe enough to cause a side effect? |
| 2 | 0:15–0:30 | **Safe ACT** | Corrigan decision cards: decision maker and meeting `✓ Written`; CRM fields fill in. Hover a card → quote highlights in the transcript | The customer stated it explicitly, and the quote is verified verbatim in the transcript. Nothing for a human to do. |
| 3 | 0:30–0:45 | **Uncertain ASK** | Budget card `⚠ Needs review`, "~$100,000", reason "Customer hedged". Point at the ledger, then the CRM field (empty, "1 pending"). Approve or edit in the queue | **What it knows vs what it's allowed to do.** It kept "around $100K" with the exact quote, but a hedge isn't a CRM fact, so a person decides. |
| 4 | 0:45–1:05 | **Deterministic guard** | Ardent → meeting `⚠ Needs review` → open Trace: model value struck through, validator check "evidence says Monday; that date is a Tuesday", "date removed", counterfactual chip "without this check: Written" | The quote was real, so grounding passed, but the model's *date* didn't match its own quote. Code caught it and could only *remove* specificity, never add it. (If showing the experiment trace instead: "this happened on our dev set; here's the recorded run.") |
| 5 | 1:05–1:25 | **CRM overwrite protection** | Meridale: budget `= Already current`; meeting `⚠ Needs review`: "Would overwrite Wed 10:00" | A supported, explicit reschedule *still* goes to a person, because it overwrites existing state. This is a hard rule in code, not a request in a prompt. |
| 6 | 1:25–1:45 | **Experiment result** | Results: headline table (counts plus %), then Block 2 with the baseline's own quote, "This replaces the CRM's Thursday value…" | 60 held-out synthetic transcripts, frozen before evaluation, one run. Naive wrote 32/121 unsafe; self-assess 6; Grounded 4. The precision gap is small and within noise. The clear finding: the one-shot model, *told* not to overwrite, overwrote 4 CRM values. Grounded can't, by construction. |
| 7 | 1:45–1:55 | **Architecture insight** | How it works (or the Workspace strip): purple model lane, slate code lane | Probabilistic understanding, deterministic control. Invariants that *must* hold belong in code. Most of the measured safety came from code that costs nothing per call. Grounded overall is ≈2× the cost of one call. |
| 8 | 1:55–2:10 | **Limitations / future** | Results § "Where it still fails" plus the limitations checklist | Remaining errors are semantic ("needs to approve" read as final authority) and normalization ("seventy-five" → 75): code can't recover what extraction missed. Synthetic data, Claude-generated, one run. It also preserves CRM-relevant signals well (125/130) but broader context poorly (6/23). Next: a context-extraction step, repeated runs, real calls. |

**Total: about 2:10.** Cut beat 7 to a single sentence during beat 6 if time is tight.

## Why this order

The order follows the brief (ACT → ASK → guard → overwrite), with one deliberate choice: **the overwrite beat comes last before the results** because it's the strongest and most reliable finding. Results Block 2 then confirms it with stored evidence, so the demo moment and the measured finding land back to back.

## Contingencies

| Risk | Plan |
|---|---|
| The validator scenario recording doesn't exist (the model never produced a bad date in recordings) | Beat 4 uses the recorded DEV Run 2b trace (dev-gen-029, `DATE_WEEKDAY_MISMATCH`), framed as "from the experiment". Never fake a firing |
| Network or Vercel down | Run `npm start` locally; replay needs no API key |
| Interviewer pastes a call that produces a wrong write | Open its trace, find the stage that failed, and map it to "Where it still fails". That's the point of the audit trail |
| "Isn't this just prompt engineering?" | Beat 6's quote: the prompt *said* don't overwrite, and the model did anyway. Code made it impossible |
| "Why not one call plus your policy?" | Good question, and an open one: much of the gain came from the deterministic layer, which could wrap a single-call extractor. Not tested here |
| "How do you know the numbers are real?" | Frozen tags; labels frozen before predictions; an independent re-score agreed 540/540; the Results page reads the stored run files |

## Still to decide before writing the final script

- The final S1–S4 transcript text (pending the overlap check and owner review).
- Whether beat 4 uses a demo recording or the experiment trace (pending the recordings, §16).
- Whether live mode is enabled on the deployed URL (owner decision, PRODUCT_PLAN §22).
- Exact wording of the one-sentence headline claim (draft in PRODUCT_PLAN §13).
