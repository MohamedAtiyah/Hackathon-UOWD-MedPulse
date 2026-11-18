import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

// Optional LLM layer. Every failure mode (no key, timeout, refusal, bad JSON) returns null
// so callers fall back to deterministic rules and the demo works offline.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 15_000;

let client: Anthropic | null = null;

export const llmEnabled = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);

/** One structured-output call validated against `schema`; null on any failure. */
export async function llmStructured<S extends z.ZodType>(
  schema: S,
  system: string,
  user: string,
): Promise<z.infer<S> | null> {
  if (!llmEnabled()) return null;
  client ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 });
  try {
    const res = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort: "low", format: betaZodOutputFormat(schema) },
      // On a safety decline the API retries on a fallback model inside the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
    return res.parsed_output ?? null;
  } catch (err) {
    // Log the class only, never request content (synthetic PHI) or credentials.
    console.warn(`[llm] falling back to rules: ${err instanceof Error ? err.name : "unknown error"}`);
    return null;
  }
}
