import { test } from "node:test";
import assert from "node:assert/strict";
import { ICD10_PATTERN, ICD10_TABLE, buildSoap, icd10ForText, llmSoap, mergeSoap } from "./soap";
import type { PatientContext, RiskAssessment, TriageAssessment } from "./types";

const noRisk: RiskAssessment = { score: 0, level: "LOW", flags: [] };
const sepsisRisk: RiskAssessment = {
  score: 80,
  level: "CRITICAL",
  flags: [{ category: "SEPSIS", severity: "CRITICAL", label: "Sepsis risk", reason: "Lactate 4.2 mmol/L" }],
};
const patient: PatientContext = {
  name: "Test",
  age: 67,
  gender: "Female",
  chronicConditions: ["Hypertension"],
  vitals: { hr: 124, sbp: 88, dbp: 52, spo2: 92, temp: 39.4, wbc: 18.6, lactate: 4.2 },
};
const triage: TriageAssessment = {
  level: "CRITICAL",
  department: "Critical Care",
  flaggedRisks: ["Sepsis risk"],
  reasoning: "x",
  source: "rules",
};
const DISCLAIMER = "Clinical decision-support draft — requires clinician review and signature.";

test("STEMI text gives I21.9 not R07.9", () => {
  const c = icd10ForText("Chest pain, ST elevation on ECG", noRisk);
  assert.ok(c.includes("I21.9"));
  assert.ok(!c.includes("R07.9"));
});

test("critical sepsis gives A41.9 and R65.20, omits R50.9", () => {
  const c = icd10ForText("fever and confusion", sepsisRisk);
  assert.ok(c.includes("A41.9") && c.includes("R65.20"));
  assert.ok(!c.includes("R50.9"));
});

test("no match gives R69; all table codes are valid", () => {
  assert.deepEqual(icd10ForText("hello", noRisk), ["R69"]);
  for (const e of ICD10_TABLE) assert.match(e.code, ICD10_PATTERN);
});

test("buildSoap fills sections and ends with disclaimer", () => {
  const s = buildSoap("fever, confusion", patient, sepsisRisk, triage);
  for (const k of ["subjective", "objective", "assessment", "plan"] as const) assert.ok(s[k].length > 0);
  assert.ok(s.plan.endsWith(DISCLAIMER));
  assert.ok(s.objective.includes("HR 124 bpm, BP 88/52 mmHg"));
  assert.equal(s.source, "rules");
});

test("mergeSoap drops invalid codes and falls back", () => {
  const rule = buildSoap("cough", patient, noRisk, { ...triage, level: "LOW", department: "Primary Care" });
  const base = { subjective: "s", objective: "o", assessment: "a", plan: "p" };
  const bad = mergeSoap(rule, { ...base, icd10Codes: ["XYZ", "123"] });
  assert.deepEqual(bad.icd10Codes, rule.icd10Codes);
  assert.ok(bad.plan.endsWith(DISCLAIMER));
  assert.equal(bad.source, "llm");
  const mixed = mergeSoap(rule, { ...base, icd10Codes: [" r05.9 ", "XYZ", "R05.9"] });
  assert.deepEqual(mixed.icd10Codes, ["R05.9"]);
  assert.equal(mergeSoap(rule, null), rule);
});

test("llmSoap returns null without API key", async () => {
  delete process.env.OPENAI_API_KEY;
  assert.equal(await llmSoap("cough", patient, noRisk, triage), null);
});
