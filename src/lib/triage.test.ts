import { test } from "node:test";
import assert from "node:assert/strict";
import { llmTriage, mergeTriage, ruleTriage } from "./triage";
import type { PatientContext, RiskAssessment, TriageAssessment } from "./types";

const noRisk: RiskAssessment = { score: 0, level: "LOW", flags: [] };
const sepsisRisk: RiskAssessment = {
  score: 80,
  level: "CRITICAL",
  flags: [{ category: "SEPSIS", severity: "CRITICAL", label: "Sepsis risk", reason: "Lactate 4.2 mmol/L" }],
};

test("ACS pattern is CRITICAL Cardiology", () => {
  const t = ruleTriage("Crushing central chest pain radiating to left jaw, sweaty", noRisk);
  assert.equal(t.level, "CRITICAL");
  assert.equal(t.department, "Cardiology");
  assert.equal(t.source, "rules");
});

test("routine request is LOW Primary Care", () => {
  const t = ruleTriage("Need a refill of my inhaler, routine follow-up", noRisk);
  assert.deepEqual([t.level, t.department], ["LOW", "Primary Care"]);
});

test("risk escalates a mild cue", () => {
  const t = ruleTriage("Mild cough", sepsisRisk);
  assert.deepEqual([t.level, t.department], ["CRITICAL", "Critical Care"]);
  assert.ok(t.flaggedRisks.includes("Sepsis risk"));
});

test("empty text is LOW Primary Care", () => {
  const t = ruleTriage("", noRisk);
  assert.deepEqual([t.level, t.department], ["LOW", "Primary Care"]);
});

test("mergeTriage never downgrades", () => {
  const rule: TriageAssessment = { level: "CRITICAL", department: "Cardiology", flaggedRisks: ["a"], reasoning: "r", source: "rules" };
  const m = mergeTriage(rule, { level: "LOW", department: "Primary Care", flaggedRisks: ["b"], reasoning: "l" });
  assert.deepEqual([m.level, m.department], ["CRITICAL", "Cardiology"]);
  assert.deepEqual(m.flaggedRisks, ["a", "b"]);
});

test("mergeTriage takes LLM department when it escalates", () => {
  const rule: TriageAssessment = { level: "MODERATE", department: "Primary Care", flaggedRisks: [], reasoning: "r", source: "rules" };
  const m = mergeTriage(rule, { level: "HIGH", department: "Pulmonology", flaggedRisks: [], reasoning: "l" });
  assert.deepEqual([m.level, m.department, m.source], ["HIGH", "Pulmonology", "llm"]);
  assert.equal(mergeTriage(rule, null), rule);
});

test("llmTriage returns null without API key", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const p: PatientContext = { name: "X", age: 50, gender: "Male", chronicConditions: [], vitals: {} };
  assert.equal(await llmTriage("cough", p, noRisk), null);
});
