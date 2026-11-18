import { z } from "zod";
import { llmStructured } from "./llm";
import { stripNegated } from "./text";
import {
  DEPARTMENTS,
  URGENCY_LEVELS,
  levelRank,
  maxLevel,
  type Department,
  type PatientContext,
  type RiskAssessment,
  type RiskFlag,
  type TriageAssessment,
  type UrgencyLevel,
} from "./types";

interface Cue {
  level: UrgencyLevel;
  department: Department;
  label: string;
  /** All regexes must match (combo cues use several). */
  tests: RegExp[];
}

const cue = (level: UrgencyLevel, department: Department, label: string, ...tests: RegExp[]): Cue => ({
  level,
  department,
  label,
  tests,
});

// shortcut: keyword cues over negation-stripped text (see text.ts), upgrade to an NLP/LLM extractor before real use
const CUES: Cue[] = [
  cue("CRITICAL", "Cardiology", "Acute coronary syndrome pattern",
    /chest (pain|pressure|tightness)|crushing/i,
    /radiat|jaw|left arm|sweat|diaphore|nause|short of breath/i),
  cue("CRITICAL", "Neurology", "Stroke warning signs (FAST)",
    /facial droop|slurred speech|one-sided weakness|arm weakness|sudden confusion and weakness/i),
  cue("CRITICAL", "Critical Care", "Suspected sepsis", /confus|drowsy|altered/i, /fever|febrile|rigors|chills/i),
  cue("CRITICAL", "Emergency Medicine", "Anaphylaxis", /anaphyla|throat (swelling|closing)|tongue swelling/i),
  cue("CRITICAL", "Emergency Medicine", "Unresponsive / seizure", /unresponsive|seizure|convuls/i),
  cue("CRITICAL", "Pulmonology", "Severe respiratory distress",
    /(?:can'?t|cannot|unable to) (?:breathe|speak|finish sentences)|cyanos|blue lips|lips (?:are |going |turning )?blue/i),
  cue("HIGH", "Cardiology", "Chest pain", /chest pain|chest tightness/i),
  cue("HIGH", "Cardiology", "Syncope / palpitations", /syncope|faint|passed out|palpitation/i),
  cue("HIGH", "Pulmonology", "Dyspnea", /short(ness)? of breath|breathless|dyspn|wheez/i),
  cue("HIGH", "Ophthalmology", "Acute visual change", /vision loss|blurred vision|blurry vision|floaters|curtain/i),
  cue("HIGH", "Gastroenterology", "GI bleed",
    /(vomit|cough)ing blood|blood in (stool|vomit)|black stool|melena|hematemesis/i),
  cue("HIGH", "Emergency Medicine", "Severe pain", /severe (abdominal|head|back) pain|worst headache/i),
  cue("MODERATE", "Infectious Disease", "Fever", /fever|febrile|rigors/i),
  cue("MODERATE", "Primary Care", "Urinary symptoms", /dysuria|burning (on|when) urinat|urinary/i),
  cue("MODERATE", "Endocrinology", "Glycaemic issue", /high (blood )?sugar|hyperglyc|glucose (is )?high|hypoglyc/i),
  cue("MODERATE", "Orthopedics", "Musculoskeletal / wound", /knee|hip|joint pain|fracture|wound|incision/i),
  cue("MODERATE", "Primary Care", "Cough / vomiting", /cough|vomit/i),
  cue("LOW", "Primary Care", "Routine request", /refill|follow[- ]?up|routine|check[- ]?up|prescription/i),
];

function departmentFromFlag(flag: RiskFlag): Department {
  switch (flag.category) {
    case "SEPSIS":
      return flag.severity === "CRITICAL" ? "Critical Care" : "Infectious Disease";
    case "CARDIAC":
      return "Cardiology";
    case "RESPIRATORY":
      return "Pulmonology";
    case "LAB":
      return "Primary Care";
    case "IMAGING":
      return /retin|fundus|neovasc|macul|disc/i.test(`${flag.reason} ${flag.label}`)
        ? "Ophthalmology"
        : "Emergency Medicine";
  }
}

const dedupe = (xs: string[]) => [...new Set(xs)];

export function ruleTriage(text: string, risk: RiskAssessment): TriageAssessment {
  const clean = stripNegated(text);
  const matched = CUES.filter((c) => c.tests.every((t) => t.test(clean)));
  // CUES is ordered by severity, so the first match is the highest-level cue.
  const best = matched[0];
  const level = maxLevel(best?.level ?? "LOW", risk.level);

  const topFlag = risk.flags.reduce<RiskFlag | undefined>(
    (a, f) => (!a || levelRank(f.severity) > levelRank(a.severity) ? f : a),
    undefined,
  );
  const riskDominates = !best || levelRank(risk.level) > levelRank(best.level);
  const department: Department = riskDominates && topFlag ? departmentFromFlag(topFlag) : best?.department ?? "Primary Care";

  const flaggedRisks = dedupe([...matched.map((c) => c.label), ...risk.flags.map((f) => f.label)]);
  const cueText = matched.length
    ? `Text cues: ${matched.map((c) => `${c.label} (${c.level})`).join(", ")}.`
    : "No urgent text cues.";
  const riskText = risk.flags.length
    ? `Risk engine ${risk.score}/100 (${risk.level}): ${risk.flags.slice(0, 3).map((f) => f.label).join(", ")}.`
    : `Risk engine ${risk.score}/100 (${risk.level}), no flags.`;
  return {
    level,
    department,
    flaggedRisks,
    reasoning: `${cueText} ${riskText} Final: ${level} → ${department}`,
    source: "rules",
  };
}

const triageSchema = z.object({
  level: z.enum(URGENCY_LEVELS),
  department: z.enum(DEPARTMENTS),
  flaggedRisks: z.array(z.string()),
  reasoning: z.string(),
});

const TRIAGE_SYSTEM =
  "You are a clinical triage decision-support assistant. All data is synthetic. " +
  "Choose an urgency level using standard ED triage reasoning (e.g. ESI/Manchester), pick ONE department from the allowed list, " +
  "and cite evidence from the vitals and text. Be concise (reasoning at most 80 words).";

export async function llmTriage(
  text: string,
  patient: PatientContext,
  risk: RiskAssessment,
): Promise<Omit<TriageAssessment, "source"> | null> {
  const user = [
    `Patient: ${patient.age}-year-old ${patient.gender}; chronic conditions: ${patient.chronicConditions.join(", ") || "none"}.`,
    `Vitals: ${JSON.stringify(patient.vitals)}`,
    `Rule-engine risk (score ${risk.score}/100, ${risk.level}): ${
      risk.flags.map((f) => `${f.label} (${f.severity}): ${f.reason}`).join("; ") || "no flags"
    }`,
    `Allowed departments: ${DEPARTMENTS.join(", ")}`,
    `Presenting text: "${text}"`,
  ].join("\n");
  const out = await llmStructured(triageSchema, TRIAGE_SYSTEM, user);
  return out && { ...out, flaggedRisks: out.flaggedRisks.slice(0, 8) };
}

export function mergeTriage(rule: TriageAssessment, llm: Omit<TriageAssessment, "source"> | null): TriageAssessment {
  if (!llm) return rule;
  return {
    level: maxLevel(rule.level, llm.level), // LLM can never downgrade
    department: levelRank(llm.level) > levelRank(rule.level) ? llm.department : rule.department,
    flaggedRisks: dedupe([...rule.flaggedRisks, ...llm.flaggedRisks]),
    reasoning: `${llm.reasoning} | Rules: ${rule.reasoning}`,
    source: "llm",
  };
}
