/**
 * Small provider abstraction (SPEC.md §7, CLAUDE.md).
 *
 * - `Transport` = one raw model call. The Anthropic implementation is the only SDK import in the repo.
 * - `createClient` adds the provider-independent part: JSON parsing, Zod validation,
 *   one bounded retry on invalid output, and a raw record of every attempt.
 *
 * A failed call returns { ok: false }. Callers turn that into "no write" (DECISIONS.md D6).
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { LLMCallRecord } from "@/core/schemas";
import { MAX_ATTEMPTS, ModelConfig } from "./config";

export type StructuredRequest<T> = {
  /** Identifies the call in run records, e.g. "grounded.extract". */
  label: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
};

export type StructuredResult<T> =
  | { ok: true; data: T; calls: LLMCallRecord[] }
  | { ok: false; error: string; calls: LLMCallRecord[] };

export interface LLMClient {
  readonly config: ModelConfig;
  generate<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>>;
}

export type TransportResponse = {
  text: string | null;
  stopReason: string | null;
  responseModel: string | null;
  usage: { inputTokens: number; outputTokens: number } | null;
};
export type Transport = (args: {
  system: string;
  user: string;
  schema: z.ZodType;
  config: ModelConfig;
}) => Promise<TransportResponse>;

/** Hash of everything that defines a prompt except the per-case data. Recorded per run. */
export function promptHash(system: string, schema: z.ZodType): string {
  const jsonSchema = JSON.stringify(z.toJSONSchema(schema, { unrepresentable: "any" }));
  return createHash("sha256").update(system).update("\n---\n").update(jsonSchema).digest("hex").slice(0, 16);
}

export function createClient(transport: Transport, config: ModelConfig): LLMClient {
  return {
    config,
    async generate<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
      const calls: LLMCallRecord[] = [];
      const hash = promptHash(req.system, req.schema);
      let lastError = "no attempts made";

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const started = Date.now();
        const record = (r: Partial<LLMCallRecord> & Pick<LLMCallRecord, "ok" | "error">): LLMCallRecord => ({
          label: req.label,
          requestedModel: config.model,
          responseModel: null,
          attempt,
          promptHash: hash,
          durationMs: Date.now() - started,
          stopReason: null,
          rawText: null,
          usage: null,
          ...r,
        });

        let res: TransportResponse;
        try {
          res = await transport({ system: req.system, user: req.user, schema: req.schema, config });
        } catch (e) {
          // API/network errors: the SDK already retried transient failures. Don't retry again.
          lastError = `api error: ${(e as Error).message}`;
          calls.push(record({ ok: false, error: lastError }));
          return { ok: false, error: lastError, calls };
        }
        const base = { responseModel: res.responseModel, stopReason: res.stopReason, rawText: res.text, usage: res.usage };

        if (res.stopReason === "refusal") {
          // Not retried, and no fallback model (DECISIONS.md D10).
          lastError = "model refused";
          calls.push(record({ ...base, ok: false, error: lastError }));
          return { ok: false, error: lastError, calls };
        }

        let json: unknown;
        try {
          json = JSON.parse(res.text ?? "");
        } catch {
          lastError = `invalid JSON (stop_reason=${res.stopReason})`;
          calls.push(record({ ...base, ok: false, error: lastError }));
          continue;
        }
        const parsed = req.schema.safeParse(json);
        if (!parsed.success) {
          lastError = `schema validation failed: ${parsed.error.issues
            .slice(0, 5)
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")}`;
          calls.push(record({ ...base, ok: false, error: lastError }));
          continue;
        }
        calls.push(record({ ...base, ok: true, error: null }));
        return { ok: true, data: parsed.data, calls };
      }
      return { ok: false, error: lastError, calls };
    },
  };
}

/**
 * Anthropic Messages API transport using structured outputs (output_config.format).
 * We parse and validate ourselves (in createClient) so the raw text is always recorded.
 */
export function anthropicTransport(client: Anthropic = new Anthropic()): Transport {
  return async ({ system, user, schema, config }) => {
    const format = zodOutputFormat(schema);
    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort: config.effort, format: { type: "json_schema", schema: format.schema } },
    });
    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    return {
      text: text.length > 0 ? text : null,
      stopReason: response.stop_reason ?? null,
      responseModel: response.model ?? null,
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  };
}

export function createAnthropicClient(config: ModelConfig): LLMClient {
  return createClient(anthropicTransport(), config);
}
