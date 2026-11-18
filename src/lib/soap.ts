import { z } from "zod";
import { llmStructured } from "./llm";
import type { Department, PatientContext, RiskAssessment, SoapDraft, TriageAssessment, UrgencyLevel } from "./types";
import { stripNegated } from "./text";

export const ICD10_PATTERN = /^[A-TV-Z][0-9][0-9A-Z](\.[0-9A-Z]{1,4})?$/;

const DISCLAIMER = "Clinical decision-support draft — requires clinician review and signature.";

const sepsisSeverity = (r: RiskAssessment) => r.flags.find((f) => f.category === "SEPSIS")?.severity;
const hasFlag = (r: RiskAssessment, cat: string, sev: UrgencyLevel) =>
  r.flags.some((f) => f.category === cat && f.severity === sev);
const isSepsis = (t: string, r: RiskAssessment) =>
  /sepsis|septic/i.test(t) || sepsisSeverity(r) === "HIGH" || sepsisSeverity(r) === "CRITICAL";
// MI evidence from the text or from the risk engine's ECG/troponin finding (stored clinician findings).
const isMI = (t: string, r: RiskAssessment) =>
  /st[- ]?elevation|\bstemi\b|troponin|myocardial infarction/i.test(t) ||
  r.flags.some((f) => f.label === "Acute coronary syndrome marker");
const re = (p: RegExp) => (t: string) => p.test(t);

export const ICD10_TABLE: { code: string; description: string; test: (t: string, r: RiskAssessment) => boolean }[] = [
  { code: "I21.9", description: "Acute myocardial infarction, unspecified", test: isMI },
  { code: "R07.9", description: "Chest pain, unspecified", test: (t, r) => /chest pain|chest tightness/i.test(t) && !isMI(t, r) },
  { code: "A41.9", description: "Sepsis, unspecified organism", test: isSepsis },
  { code: "R65.20", description: "Severe sepsis without septic shock", test: (_t, r) => sepsisSeverity(r) === "CRITICAL" },
  { code: "J44.1", description: "COPD with acute exacerbation", test: re(/copd/i) },
  { code: "J45.901", description: "Asthma with acute exacerbation", test: (t) => /asthma/i.test(t) && /attack|exacerbat|flare|wheez/i.test(t) },
  { code: "J45.909", description: "Asthma, uncomplicated", test: (t) => /asthma/i.test(t) && !/attack|exacerbat|flare|wheez/i.test(t) },
  { code: "R06.00", description: "Dyspnea, unspecified", test: re(/short(ness)? of breath|breathless|dyspn/i) },
  { code: "R09.02", description: "Hypoxemia", test: (_t, r) => hasFlag(r, "RESPIRATORY", "CRITICAL") },
  { code: "R50.9", description: "Fever, unspecified", test: (t, r) => /fever|febrile|rigors/i.test(t) && !isSepsis(t, r) },
  { code: "R05.9", description: "Cough, unspecified", test: re(/cough/i) },
  { code: "R30.0", description: "Dysuria", test: re(/dysuria|burning (on|when) urinat/i) },
  { code: "N39.0", description: "Urinary tract infection, site not specified", test: re(/\buti\b|urinary tract infection/i) },
  { code: "R10.9", description: "Unspecified abdominal pain", test: re(/abdominal pain|stomach pain|belly pain/i) },
  { code: "R11.2", description: "Nausea with vomiting, unspecified", test: re(/vomit/i) },
  { code: "R51.9", description: "Headache, unspecified", test: re(/headache/i) },
  { code: "R55", description: "Syncope and collapse", test: re(/syncope|faint|passed out/i) },
  { code: "R00.2", description: "Palpitations", test: re(/palpitation/i) },
  { code: "R29.810", description: "Facial weakness", test: re(/facial droop|facial weakness/i) },
  { code: "R47.81", description: "Slurred speech", test: re(/slurred speech/i) },
  { code: "E11.319", description: "Type 2 diabetes with unspecified diabetic retinopathy without macular edema", test: (t) => /diabet/i.test(t) && /retinopathy|neovasc/i.test(t) },
  { code: "R73.9", description: "Hyperglycemia, unspecified", test: re(/hyperglyc|high (blood )?sugar/i) },
  { code: "I10", description: "Essential (primary) hypertension", test: re(/hypertension|high blood pressure/i) },
  { code: "M25.569", description: "Pain in unspecified knee", test: re(/knee pain/i) },
  { code: "R21", description: "Rash and other nonspecific skin eruption", test: re(/\brash\b/i) },
  { code: "R56.9", description: "Unspecified convulsions", test: re(/seizure|convuls/i) },
];

export function icd10ForText(text: string, risk: RiskAssessment): string[] {
  const clean = stripNegated(text);
  const codes = ICD10_TABLE.filter((e) => e.test(clean, risk)).map((e) => e.code).slice(0, 6);
  return codes.length ? codes : ["R69"];
}

const PLANS: Record<Department, string> = {
  "Critical Care":
    "Sepsis Hour-1 bundle: blood cultures before antibiotics, broad-spectrum IV antibiotics, 30 mL/kg crystalloid if hypotensive or lactate ≥4, repeat lactate within 2–4 h, vasopressors if MAP <65 after fluids.",
  Cardiology:
    "12-lead ECG within 10 min, serial hs-troponin, aspirin 300 mg unless contraindicated, ACS pathway/cath lab activation if STEMI.",
  Pulmonology:
    "Oxygen to SpO₂ 88–92% if COPD (94–98% otherwise), bronchodilators, ABG, chest X-ray, systemic steroids for exacerbation.",
  Neurology:
    "Activate stroke pathway, document time last known well, urgent CT head, check glucose, assess thrombolysis/thrombectomy window.",
  Ophthalmology: "Dilated fundus exam, urgent retina referral, optimise glucose and blood pressure.",
  "Infectious Disease": "Source identification (cultures, urinalysis, chest X-ray as indicated), targeted antimicrobials, hydration, monitor for deterioration.",
  Endocrinology: "Check capillary and serum glucose, ketones if hyperglycaemic, review insulin/medication regimen, hydration, specialist input.",
  Gastroenterology: "Assess haemodynamics, IV access, FBC/coagulation/group and save, PPI, urgent endoscopy if bleeding suspected.",
  Orthopedics: "Examine and image the affected site, analgesia, wound care/tetanus status, immobilise as needed, orthopaedic review.",
  "Emergency Medicine": "ABCDE assessment, IV access, monitoring, analgesia, targeted investigations, escalate to the appropriate specialty.",
  "Primary Care": "Symptomatic care, medication review, safety-net advice (return or call emergency services if symptoms worsen).",
};

const TIMING: Record<UrgencyLevel, string> = {
  CRITICAL: "Immediate review (≤30 min).",
  HIGH: "Review within 2 h.",
  MODERATE: "Review within 24 h.",
  LOW: "Routine review within 7 days.",
};

function formatVitals(v: PatientContext["vitals"]): string {
  const parts = [
    v.hr != null && `HR ${v.hr} bpm`,
    v.sbp != null && v.dbp != null ? `BP ${v.sbp}/${v.dbp} mmHg` : v.sbp != null && `SBP ${v.sbp} mmHg`,
    v.spo2 != null && `SpO₂ ${v.spo2}% RA`,
    v.temp != null && `T ${v.temp} °C`,
    v.wbc != null && `WBC ${v.wbc} ×10⁹/L`,
    v.lactate != null && `lactate ${v.lactate} mmol/L`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "No vitals recorded.";
}

export function buildSoap(text: string, patient: PatientContext, risk: RiskAssessment, triage: TriageAssessment): SoapDraft {
  const codes = icd10ForText(`${text} ${patient.chronicConditions.join(" ")}`, risk);
  const impression = codes
    .map((c) => `${ICD10_TABLE.find((e) => e.code === c)?.description ?? "Unspecified symptom"} (${c})`)
    .join("; ");
  const riskText = risk.flags.length
    ? risk.flags.map((f) => `${f.label} (${f.severity}): ${f.reason}`).join("; ")
    : "no rule-based red flags";
  return {
    subjective: `${patient.age}-year-old ${patient.gender.toLowerCase()} with ${
      patient.chronicConditions.join(", ") || "no documented chronic conditions"
    }. Presenting complaint (patient/clinician words): "${text}"`,
    objective: `${formatVitals(patient.vitals)} Risk engine: score ${risk.score}/100; ${riskText}`,
    assessment: `Triage ${triage.level} → ${triage.department}. Key risks: ${triage.flaggedRisks.join(", ") || "none"}. Working impression: ${impression}.`,
    plan: `${PLANS[triage.department]} ${TIMING[triage.level]} ${DISCLAIMER}`,
    icd10Codes: codes,
    source: "rules",
  };
}

const soapSchema = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
  icd10Codes: z.array(z.string()),
});

const SOAP_SYSTEM =
  "You are a clinical documentation assistant writing a concise SOAP note (decision support only). " +
  "Do not invent vitals or results that were not provided. Use ICD-10-CM codes only.";

export async function llmSoap(
  text: string,
  patient: PatientContext,
  risk: RiskAssessment,
  triage: TriageAssessment,
): Promise<Omit<SoapDraft, "source"> | null> {
  const user = [
    `Patient: ${patient.age}-year-old ${patient.gender}; chronic conditions: ${patient.chronicConditions.join(", ") || "none"}.`,
    `Vitals: ${JSON.stringify(patient.vitals)}`,
    `Risk (score ${risk.score}/100, ${risk.level}): ${risk.flags.map((f) => `${f.label}: ${f.reason}`).join("; ") || "no flags"}`,
    `Triage: ${triage.level} → ${triage.department}`,
    `Presenting text: "${text}"`,
  ].join("\n");
  return llmStructured(soapSchema, SOAP_SYSTEM, user);
}

export function mergeSoap(rule: SoapDraft, llm: Omit<SoapDraft, "source"> | null): SoapDraft {
  if (!llm) return rule;
  const valid = [...new Set(llm.icd10Codes.map((c) => c.trim().toUpperCase()).filter((c) => ICD10_PATTERN.test(c)))].slice(0, 6);
  const plan = llm.plan.includes(DISCLAIMER) ? llm.plan : `${llm.plan.trimEnd()} ${DISCLAIMER}`;
  return { ...llm, plan, icd10Codes: valid.length ? valid : rule.icd10Codes, source: "llm" };
}
