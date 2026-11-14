/**
 * Runs one system over a set of benchmark cases and produces a complete EvaluationRun:
 * metadata, raw system outputs (including raw model text), per-item scores, and metrics.
 * Every reported metric must be reproducible from this file.
 */
import fs from "node:fs";
import path from "node:path";
import { POLICY_CONFIG } from "@/core/policy";
import { BenchmarkCase, EvaluationRun, SystemOutput } from "@/core/schemas";
import { allMetrics, SCORING_VERSION, scoreCase } from "@/core/scoring";
import type { LLMClient } from "@/llm/client";
import type { System } from "@/systems/types";
import { errorOutput } from "@/systems/shared";
import type { LoadedSplit, Split } from "./benchmark";

export const RUNS_ROOT = path.join(process.cwd(), "data", "runs");

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function runEvaluation(opts: {
  system: System;
  llm: LLMClient;
  split: Split;
  cases: BenchmarkCase[];
  files: LoadedSplit["files"];
  frozen: boolean;
  concurrency?: number;
  onCaseDone?: (out: SystemOutput) => void;
}): Promise<EvaluationRun> {
  const { system, llm, split, cases } = opts;
  const createdAt = new Date().toISOString();

  const outputs = await mapWithConcurrency(cases, opts.concurrency ?? 4, async (c) => {
    let out: SystemOutput;
    try {
      // Systems see only the case input: never labels, tags, or notes.
      out = await system.run({ caseId: c.id, crm: c.crm, transcript: c.transcript }, llm);
    } catch (e) {
      // A crash in system code is still recorded as a no-write error, never dropped.
      out = errorOutput(c.id, system.name, `system threw: ${(e as Error).message}`, []);
    }
    opts.onCaseDone?.(out);
    return out;
  });

  const items = cases.flatMap((c, i) => scoreCase(c, outputs[i]));
  const responseModels = [
    ...new Set(outputs.flatMap((o) => o.llmCalls.map((c) => c.responseModel)).filter((m): m is string => m !== null)),
  ];

  return EvaluationRun.parse({
    schemaVersion: 1,
    runId: `${createdAt.replace(/[:.]/g, "-")}_${system.name}_${split}`,
    createdAt,
    system: system.name,
    systemVersion: system.version,
    requestedModel: llm.config.model,
    responseModels,
    effort: llm.config.effort,
    promptHashes: system.promptHashes,
    policyConfig: system.name === "grounded" ? POLICY_CONFIG : "n/a (model decides)",
    scoringVersion: SCORING_VERSION,
    split,
    benchmarkFrozen: opts.frozen,
    caseFiles: opts.files.map((f) => ({ caseId: f.caseId, sha256: f.sha256 })),
    outputs,
    items,
    metrics: allMetrics(items),
  });
}

/** Run files are append-only: writing fails if the file already exists. */
export function saveRun(run: EvaluationRun): string {
  const dir = path.join(RUNS_ROOT, run.split);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${run.runId}.json`);
  fs.writeFileSync(file, JSON.stringify(run, null, 2) + "\n", { flag: "wx" });
  return file;
}
