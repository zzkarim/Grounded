import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CaseInput, EvaluationRun } from "@/core/schemas";
import { loadSplit } from "@/eval/benchmark";
import { runEvaluation } from "@/eval/runner";
import { createClient } from "@/llm/client";
import { baselineNaive, baselineSelfAssess, NaiveOutput, NAIVE_SYSTEM_PROMPT, SelfAssessOutput, SELF_ASSESS_SYSTEM_PROMPT } from "@/systems/baselines";
import { ClassificationOutput, CLASSIFY_SYSTEM_PROMPT, EXTRACT_SYSTEM_PROMPT, ExtractionOutput, grounded } from "@/systems/grounded";
import { emptyCRM, json, meeting, scriptedTransport, TEST_CONFIG, transcript, usd } from "./helpers";

const t = transcript([
  ["rep", "What budget do you have for this?"],
  ["cust", "We have $75K approved for this project."],
  ["rep", "Can we meet Thursday at 2?"],
  ["cust", "Thursday at 2 works, send the invite."],
]);
const input: CaseInput = { caseId: "unit", crm: emptyCRM(), transcript: t };
const llmWith = (responses: Parameters<typeof scriptedTransport>[0]) => {
  const s = scriptedTransport(responses);
  return { llm: createClient(s.transport, TEST_CONFIG), sent: s.sent };
};
const fields = (o: { fields: Record<string, { action: string }> }) => Object.fromEntries(Object.entries(o.fields).map(([k, v]) => [k, v.action]));

describe("LLM client: validation, bounded retry, fail-safe", () => {
  const schema = z.object({ x: z.number() });
  const req = { label: "t", system: "s", user: "u", schema };

  it("returns validated data and records the call", async () => {
    const { llm } = llmWith([json({ x: 1 })]);
    const r = await llm.generate(req);
    expect(r).toMatchObject({ ok: true, data: { x: 1 } });
    expect(r.calls[0]).toMatchObject({ ok: true, attempt: 1, requestedModel: "test-model", responseModel: "test-model-reported" });
  });

  it("retries once on invalid JSON, then succeeds", async () => {
    const { llm } = llmWith([{ text: "not json" }, json({ x: 2 })]);
    const r = await llm.generate(req);
    expect(r.ok).toBe(true);
    expect(r.calls.map((c) => c.ok)).toEqual([false, true]);
  });

  it("gives up after two schema-invalid outputs", async () => {
    const { llm } = llmWith([json({ x: "1" }), json({ y: 1 })]);
    const r = await llm.generate(req);
    expect(r.ok).toBe(false);
    expect(r.calls).toHaveLength(2);
  });

  it("does not retry refusals or API errors", async () => {
    expect((await llmWith([{ stopReason: "refusal", text: null }]).llm.generate(req)).calls).toHaveLength(1);
    const r = await llmWith([new Error("529 overloaded")]).llm.generate(req);
    expect(r).toMatchObject({ ok: false });
    expect(r.calls).toHaveLength(1);
  });
});

describe("baselines", () => {
  it("naive: every proposal is a write; null is no change; same-as-CRM is NO_OP", async () => {
    const { llm } = llmWith([
      json({
        budget: { value: usd(75000), evidenceQuote: "We have $75K approved" },
        decisionMaker: null,
        nextMeeting: { value: meeting("2026-03-12", "14:00"), evidenceQuote: "Thursday at 2 works" },
      }),
    ]);
    const out = await baselineNaive.run({ ...input, crm: emptyCRM({ nextMeeting: meeting("2026-03-12", "14:00") }) }, llm);
    expect(fields(out)).toEqual({ budget: "ACT", decisionMaker: "ABSTAIN", nextMeeting: "NO_OP" });
  });

  it("self-assess: AUTO → ACT, REVIEW → ASK", async () => {
    const { llm } = llmWith([
      json({
        budget: { value: usd(75000), evidenceQuote: "q", decision: "REVIEW", reason: "r" },
        decisionMaker: null,
        nextMeeting: { value: meeting("2026-03-12", "14:00"), evidenceQuote: "q", decision: "AUTO", reason: "r" },
      }),
    ]);
    expect(fields(await baselineSelfAssess.run(input, llm))).toEqual({ budget: "ASK", decisionMaker: "ABSTAIN", nextMeeting: "ACT" });
  });

  it("malformed output twice → error, no writes", async () => {
    const { llm } = llmWith([{ text: "{" }, json({ budget: { value: { amount: "lots" } } })]);
    const out = await baselineNaive.run(input, llm);
    expect(out.error).toMatch(/schema validation failed/);
    expect(Object.values(out.fields).every((f) => f.action === "ABSTAIN" && f.reasons[0] === "SYSTEM_ERROR")).toBe(true);
  });
});

describe("grounded", () => {
  const extraction = (candidates: unknown[]) => json({ candidates });
  const budgetCandidate = (quote: string) => ({
    field: "budget",
    value: usd(75000),
    evidence: [{ turnId: "t2", speakerId: "carl", quote }],
  });

  it("happy path: grounded, explicit, direct claims ACT", async () => {
    const { llm, sent } = llmWith([
      extraction([
        budgetCandidate("We have $75K approved for this project."),
        {
          field: "nextMeeting",
          value: meeting("2026-03-12", "14:00", "Thursday at 2"),
          evidence: [
            { turnId: "t3", speakerId: "rita", quote: "Can we meet Thursday at 2?" },
            { turnId: "t4", speakerId: "carl", quote: "Thursday at 2 works" },
          ],
        },
      ]),
      json({
        classifications: [
          { claimId: "c1", status: "CURRENT", certainty: "EXPLICIT", sufficiency: "DIRECT", explanation: "" },
          { claimId: "c2", status: "CURRENT", certainty: "EXPLICIT", sufficiency: "DIRECT", explanation: "" },
        ],
      }),
    ]);
    const out = await grounded.run(input, llm);
    expect(fields(out)).toEqual({ budget: "ACT", decisionMaker: "ABSTAIN", nextMeeting: "ACT" });
    expect(out.llmCalls.map((c) => c.label)).toEqual(["grounded.extract", "grounded.classify"]);
    expect(sent[1].user).toContain('"id": "c1"'); // call 2 sees the candidates with ids
  });

  it("a hallucinated quote cannot ACT even if the classifier says EXPLICIT/DIRECT", async () => {
    const { llm } = llmWith([
      extraction([budgetCandidate("Our budget is $75K.")]),
      json({ classifications: [{ claimId: "c1", status: "CURRENT", certainty: "EXPLICIT", sufficiency: "DIRECT", explanation: "" }] }),
    ]);
    const out = await grounded.run(input, llm);
    expect(out.fields.budget).toMatchObject({ action: "ABSTAIN", reasons: ["UNGROUNDED_EVIDENCE"] });
  });

  it("classification failure → claims kept but nothing written, error recorded", async () => {
    const { llm } = llmWith([extraction([budgetCandidate("We have $75K approved")]), { text: "oops" }, { text: "oops again" }]);
    const out = await grounded.run(input, llm);
    expect(out.error).toMatch(/classification failed/);
    expect(out.fields.budget).toMatchObject({ action: "ABSTAIN", reasons: ["CLASSIFICATION_MISSING"] });
    expect((out.trace as { records: unknown[] }).records).toHaveLength(1);
  });

  it("missing or duplicated classification ids → that claim abstains", async () => {
    const { llm } = llmWith([
      extraction([budgetCandidate("We have $75K approved"), { ...budgetCandidate("$75K approved"), field: "budget" }]),
      json({
        classifications: [
          { claimId: "c1", status: "CURRENT", certainty: "EXPLICIT", sufficiency: "DIRECT", explanation: "" },
          { claimId: "c1", status: "CURRENT", certainty: "EXPLICIT", sufficiency: "DIRECT", explanation: "" },
        ],
      }),
    ]);
    const out = await grounded.run(input, llm);
    expect(out.fields.budget).toMatchObject({ action: "ABSTAIN", reasons: ["CLASSIFICATION_MISSING"] });
  });

  it("no candidates → skips call 2 and abstains everywhere", async () => {
    const { llm, sent } = llmWith([extraction([])]);
    const out = await grounded.run(input, llm);
    expect(sent).toHaveLength(1);
    expect(fields(out)).toEqual({ budget: "ABSTAIN", decisionMaker: "ABSTAIN", nextMeeting: "ABSTAIN" });
  });

  it("extraction failure → error output, no writes", async () => {
    const { llm } = llmWith([new Error("network")]);
    const out = await grounded.run(input, llm);
    expect(out.error).toMatch(/extraction failed/);
    expect(Object.values(out.fields).every((f) => f.action === "ABSTAIN")).toBe(true);
  });
});

describe("evaluation runner (scripted model, example cases)", () => {
  it("produces a schema-valid run with raw outputs, scores and metrics, and survives a crashing system", async () => {
    const { cases, files } = loadSplit("example");
    const crashing = { ...baselineNaive, name: "crash", run: async () => { throw new Error("bug"); } };
    const run = await runEvaluation({ system: crashing, llm: llmWith([]).llm, split: "example", cases, files, frozen: false });
    expect(() => EvaluationRun.parse(run)).not.toThrow();
    expect(run.items).toHaveLength(18);
    expect(run.metrics.overall.systemErrors).toBe(18);
    expect(run.metrics.overall.actPrecision.value).toBeNull();
    expect(run.caseFiles).toHaveLength(6);
  });
});

describe("integrity guards", () => {
  const prompts = [NAIVE_SYSTEM_PROMPT, SELF_ASSESS_SYSTEM_PROMPT, EXTRACT_SYSTEM_PROMPT, CLASSIFY_SYSTEM_PROMPT].join("\n").toLowerCase();

  it("no prompt contains a 6-word phrase from any benchmark transcript", () => {
    const allCases = [...loadSplit("example").cases, ...loadSplit("dev").cases, ...loadSplit("test").cases];
    for (const c of allCases)
      for (const turn of c.transcript.turns) {
        const words = turn.text.toLowerCase().replace(/[^a-z0-9$' ]/g, " ").split(/\s+/).filter(Boolean);
        for (let i = 0; i + 6 <= words.length; i++) {
          const phrase = words.slice(i, i + 6).join(" ");
          expect(prompts.includes(phrase), `${c.id}/${turn.id}: "${phrase}"`).toBe(false);
        }
      }
  });

  it("every model-facing schema converts to an API JSON schema", () => {
    for (const s of [NaiveOutput, SelfAssessOutput, ExtractionOutput, ClassificationOutput]) {
      expect(() => zodOutputFormat(s)).not.toThrow();
    }
  });
});
