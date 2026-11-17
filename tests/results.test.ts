/**
 * Results data integrity (src/product/results.ts). Every displayed experimental number must be
 * derived from the committed TEST run files; curated labels must match the derived sets.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { allMetrics } from "@/core/scoring";
import { LOST_CAUSES, loadResults, loadRun, SYSTEM_ORDER, UNSAFE_CAUSES } from "@/product/results";

const r = loadResults();
const row = (s: string) => r.systems.find((x) => x.system === s)!;

describe("headline metrics equal the stored run metrics", () => {
  it.each(SYSTEM_ORDER.map((s) => [s] as const))("%s", (s) => {
    const m = loadRun(s).metrics.overall;
    const v = row(s);
    expect([v.actPrecision.num, v.actPrecision.den]).toEqual([m.actPrecision.num, m.actPrecision.den]);
    expect([v.coverage.num, v.coverage.den]).toEqual([m.coverage.num, m.coverage.den]);
    expect([v.unsafe.num, v.unsafe.den]).toEqual([m.unsafeWriteRate.num, m.unsafeWriteRate.den]);
    expect(v.reviews).toBe(m.reviewRate.num);
  });
  it.each(SYSTEM_ORDER.map((s) => [s] as const))("%s: stored metrics equal a fresh aggregation of the stored items", (s) => {
    const run = loadRun(s);
    expect(allMetrics(run.items).overall).toEqual(run.metrics.overall);
  });
  it("shows the frozen TEST numbers", () => {
    const fmt = (s: string) => {
      const v = row(s);
      return [v.actPrecision, v.coverage, v.unsafe].map((x) => `${x.num}/${x.den} ${x.pct}`);
    };
    expect(fmt("baseline-naive")).toEqual(["56/91 61.5%", "56/59 94.9%", "32/121 26.4%"]);
    expect(fmt("baseline-self-assess")).toEqual(["50/56 89.3%", "50/59 84.7%", "6/121 5.0%"]);
    expect(fmt("grounded")).toEqual(["54/59 91.5%", "54/59 91.5%", "4/121 3.3%"]);
    expect([r.transcripts, r.items, r.goldAct, r.goldNonAct]).toEqual([60, 180, 59, 121]);
  });
  it("re-scoring the stored outputs with frozen scoring reproduces every stored outcome", () => {
    expect(r.rescore).toEqual({ matched: 540, total: 540 });
  });
});

describe("overwrite finding is derived from stored outcomes", () => {
  it("self-assess autonomously replaced 4 existing CRM values; Grounded 0", () => {
    expect(r.overwrites.cases.map((c) => `${c.caseId}:${c.field}`)).toEqual([
      "test-gen-010:nextMeeting",
      "test-gen-022:decisionMaker",
      "test-gen-025:nextMeeting",
      "test-gen-047:decisionMaker",
    ]);
    expect(r.overwrites.groundedOverwrites).toBe(0);
  });
  it("Grounded sent each of them to review because of the existing CRM value", () => {
    for (const c of r.overwrites.cases) expect([c.groundedLabel, c.groundedReasonCode]).toEqual(["Needs review", "CONFLICTS_WITH_EXISTING"]);
  });
  it("shows the baseline's stored reason verbatim", () => {
    const self = loadRun("baseline-self-assess");
    for (const c of r.overwrites.cases) {
      const trace = self.outputs.find((o) => o.caseId === c.caseId)!.trace as Record<string, { reason: string }>;
      expect(c.selfReason).toBe(trace[c.field].reason);
      expect(c.selfReason.length).toBeGreaterThan(0);
      // The displayed excerpt is verbatim: every non-ellipsis fragment appears in the stored reason.
      for (const part of c.selfReasonExcerpt.split(" … ").join("\n").replace(/^… |…$/g, "").split("\n")) {
        expect(c.selfReason).toContain(part.replace(/^… /, "").replace(/ …$/, "").trim());
      }
      expect(c.selfReasonExcerpt).toMatch(/CRM|replac|supersed|updat/i);
    }
  });
});

describe("validator, failures, recall, cost", () => {
  it("meeting-v1 on TEST: 2 of 66 activations, 1 unsafe write prevented, 0 correct writes blocked", () => {
    expect(r.validator).toMatchObject({ meetingCandidates: 66, activations: 2, prevented: 1, blocked: 0 });
    expect(r.validator.example).toMatchObject({ caseId: "test-gen-034", removedText: "Tue, Jun 30", keptText: "4:00 PM" });
    expect(r.validator.example!.checks.map((c) => c.rule)).toEqual(["DATE_NOT_FUTURE"]);
    expect(r.validator.example!.alsoWrittenBy).toEqual(["Naive", "Self-assess"]);
  });
  it("curated failure labels cover exactly the derived failure sets", () => {
    expect(r.failures.unsafe.map((f) => f.key).sort()).toEqual(Object.keys(UNSAFE_CAUSES).sort());
    expect(r.failures.lost.map((f) => f.key).sort()).toEqual(Object.keys(LOST_CAUSES).sort());
    for (const f of [...r.failures.unsafe, ...r.failures.lost]) expect(f.cause).not.toBe("Unlabelled");
  });
  it("signal recall: 125/130 CRM-relevant, 6/23 contextual", () => {
    expect([r.recall.crmRelevant.num, r.recall.crmRelevant.den]).toEqual([125, 130]);
    expect([r.recall.contextual.num, r.recall.contextual.den]).toEqual([6, 23]);
  });
  it("cost estimates and ratios", () => {
    expect(row("baseline-self-assess").estCostUsd.toFixed(2)).toBe("0.68");
    expect(row("grounded").estCostUsd.toFixed(2)).toBe("1.38");
    expect([row("baseline-self-assess").modelCalls, row("grounded").modelCalls]).toEqual([60, 118]);
    expect(r.ratios.input.toFixed(1)).toBe("1.8");
    expect(r.ratios.output.toFixed(1)).toBe("2.5");
  });
  it("limitations facts", () => {
    expect([r.multiCustomerTranscripts, r.existingCrmTranscripts, r.medianTurns]).toEqual([7, 28, 6]);
  });
});

describe("no experimental number is typed into page components", () => {
  const files = ["src/components/results/ResultsView.tsx", "src/components/how/HowItWorksView.tsx", "src/app/results/page.tsx", "src/app/how-it-works/page.tsx"];
  it.each(files)("%s", (f) => {
    const src = fs.readFileSync(f, "utf8");
    for (const n of ["61.5", "94.9", "26.4", "89.3", "84.7", "91.5", "56/91", "50/56", "54/59", "32/121", "6/121", "4/121", "125", "/130", "6/23", "0.68", "1.38", "540"]) {
      expect(src, `${f} contains ${n}`).not.toContain(n);
    }
  });
});
