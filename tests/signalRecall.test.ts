import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BenchmarkCase, EvaluationRun, SystemOutput } from "@/core/schemas";
import { loadSplit } from "@/eval/benchmark";
import { computeSignalRecall } from "@/eval/signalRecall";
import { meeting } from "./helpers";

const c = loadSplit("example").cases.find((x) => x.id === "meeting-ex-02")! as BenchmarkCase; // gold meeting ASK, budget/DM null
const abstain = { action: "ABSTAIN" as const, value: null, reasons: ["NO_CANDIDATE" as const], claimIds: [] };
const run = (trace: unknown, system = "grounded"): EvaluationRun =>
  ({ system, outputs: [{ caseId: c.id, system, fields: { budget: abstain, decisionMaker: abstain, nextMeeting: abstain }, trace, llmCalls: [], error: null } as SystemOutput] }) as EvaluationRun;
const claim = (value: unknown) => ({
  claim: { id: "c1", field: "nextMeeting", value, evidence: [{ turnId: "t1", speakerId: "leo", quote: "x" }] },
});

describe("signal recall (diagnostic)", () => {
  it("counts a gold signal as recalled when any candidate states the same fact, whatever its decision", () => {
    const r = computeSignalRecall(run({ records: [claim(meeting("2026-03-19", "15:00"))] }), [c]);
    expect(r.overall).toEqual({ num: 1, den: 1, value: 1 });
    expect(r.items[0]).toMatchObject({ field: "nextMeeting", recalled: true, matchedClaimIds: ["c1"] });
  });
  it("uses semantic (not scoring) equality: a candidate missing the time is still the same signal", () => {
    expect(computeSignalRecall(run({ records: [claim(meeting("2026-03-19", null))] }), [c]).overall.num).toBe(1);
  });
  it("a different value, no candidates, or an unparseable trace is not recalled", () => {
    expect(computeSignalRecall(run({ records: [claim(meeting("2026-03-20", "15:00"))] }), [c]).overall.num).toBe(0);
    expect(computeSignalRecall(run({ records: [] }), [c]).overall.num).toBe(0);
    expect(computeSignalRecall(run(null), [c]).overall.num).toBe(0);
  });
  it("only counts fields whose gold value is recorded, and refuses non-Grounded runs", () => {
    expect(computeSignalRecall(run({ records: [] }), [c]).items).toHaveLength(1);
    expect(() => computeSignalRecall(run({}, "baseline-self-assess"), [c])).toThrow(/Grounded/);
  });
});

describe("historical run files stay readable", () => {
  it("every stored dev run parses; Run 1 (pre-versioning) has no scoringVersion, later runs record v2", () => {
    const dir = path.join(process.cwd(), "data", "runs", "dev");
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      const r = EvaluationRun.parse(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
      const run1 = r.createdAt < "2026-11-14T10:00:00Z"; // Run 1 predates scoring v2 (POST_RUN1_DECISIONS §1)
      expect(r.scoringVersion, f).toBe(run1 ? undefined : "v2");
    }
  });
});
