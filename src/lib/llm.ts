import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

// Optional LLM layer. Every failure mode (no key, timeout, refusal, bad JSON) returns null
// so callers fall back to deterministic rules and the demo works offline.

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 15_000;

let client: OpenAI | null = null;

export const llmEnabled = (): boolean => Boolean(process.env.OPENAI_API_KEY);

/** One structured-output call validated against `schema`; null on any failure. */
export async function llmStructured<S extends z.ZodType>(
  schema: S,
  system: string,
  user: string,
): Promise<z.infer<S> | null> {
  if (!llmEnabled()) return null;
  client ??= new OpenAI({ timeout: TIMEOUT_MS, maxRetries: 0 });
  try {
    const res = await client.responses.parse({
      model: MODEL,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      text: { format: zodTextFormat(schema, "structured_result") },
    });
    return (res.output_parsed ?? null) as z.infer<S> | null;
  } catch (err) {
    // Log the class only, never request content (synthetic PHI) or credentials.
    console.warn(`[llm] falling back to rules: ${err instanceof Error ? err.name : "unknown error"}`);
    return null;
  }
}
