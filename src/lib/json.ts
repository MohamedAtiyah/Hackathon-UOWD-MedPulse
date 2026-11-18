// The only reader for JSON-in-String Prisma columns (vitalsJson, flaggedConditions, icd10Codes, ...).

/** Parse a JSON column; returns `fallback` on malformed JSON or a top-level type mismatch. */
export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(fallback) !== Array.isArray(value)) return fallback;
    if (typeof value !== typeof fallback || value === null) return fallback;
    return value as T;
  } catch {
    return fallback;
  }
}

/** Parse a JSON string[] column, dropping non-string entries. */
export const parseStringArray = (raw: string | null | undefined): string[] =>
  parseJson<unknown[]>(raw, []).filter((x): x is string => typeof x === "string");

export const toJson = (value: unknown): string => JSON.stringify(value);
