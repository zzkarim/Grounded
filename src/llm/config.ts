/**
 * The ONE place the experiment's model is configured (SPEC.md §7).
 * Every system (both baselines and both Grounded calls) uses this model and effort.
 * Both values are recorded in every run file, along with the model id the API reports.
 */
export const DEFAULT_MODEL = "claude-sonnet-5-5";
export const DEFAULT_EFFORT = "medium";
export const EFFORTS = ["low", "medium", "high"] as const;
export type Effort = (typeof EFFORTS)[number];

/** Generous for structured outputs; non-streaming requests stay well under SDK timeouts. */
export const MAX_TOKENS = 16000;
/** Total attempts per structured call when the output fails validation (1 retry). */
export const MAX_ATTEMPTS = 2;

export type ModelConfig = { model: string; effort: Effort; maxTokens: number };

export function getModelConfig(env: NodeJS.ProcessEnv = process.env): ModelConfig {
  const model = env.GROUNDED_MODEL?.trim() || DEFAULT_MODEL;
  const effort = (env.GROUNDED_EFFORT?.trim() || DEFAULT_EFFORT) as Effort;
  if (!EFFORTS.includes(effort)) throw new Error(`GROUNDED_EFFORT must be one of ${EFFORTS.join(", ")}`);
  return { model, effort, maxTokens: MAX_TOKENS };
}
