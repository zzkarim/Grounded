import type { CaseInput, SystemOutput } from "@/core/schemas";
import type { LLMClient } from "@/llm/client";

/** A system under test. It sees only CaseInput, never labels, tags, or notes. */
export type System = {
  name: string;
  /** Bump manually when prompts or logic change. Recorded per run. */
  version: string;
  /** Hash per prompt (system prompt + output schema). Recorded per run. */
  promptHashes: Record<string, string>;
  run(input: CaseInput, llm: LLMClient): Promise<SystemOutput>;
};
