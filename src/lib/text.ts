// Shared clinical-text helpers for the keyword engines (risk findings, triage cues, ICD-10 coding).

// A negation cue opens a span that runs to the next clause break or "but":
// "no wheeze today" → removed; "denies chest pain, but short of breath" → "short of breath" kept.
// "and" also ends the span so "no fever and crushing chest pain" keeps the chest pain: over-triage beats a missed positive.
// "not" is deliberately excluded: "could not breathe" is a positive symptom.
const NEGATED_SPAN = /\b(?:no|denies|denied|without|negative for|free of|absence of)\b[^.;,!?\n]*?(?=[.;,!?\n]|\b(?:but|and)\b|$)/gi;

/** Remove negated clauses before keyword matching. */
// shortcut: NegEx-style cue-to-punctuation scope only (no pseudo-negation, no double negatives), upgrade to a clinical NLP negation model for real use
export const stripNegated = (text: string): string => text.replace(NEGATED_SPAN, " ");

/** The negated phrases stripNegated removes, for the agent trace ("no wheeze today"). */
export const negatedSpans = (text: string): string[] =>
  (text.match(NEGATED_SPAN) ?? []).map((s) => s.trim()).filter(Boolean);
