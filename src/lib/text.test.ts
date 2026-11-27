import { test } from "node:test";
import assert from "node:assert/strict";
import { stripNegated } from "./text";
import { ruleTriage } from "./triage";
import { icd10ForText } from "./soap";
import { evaluateRisk } from "./risk";
import type { RiskAssessment } from "./types";

const noRisk: RiskAssessment = { score: 0, level: "LOW", flags: [] };

test("stripNegated removes negated clauses and keeps the rest", () => {
  assert.doesNotMatch(stripNegated("Refill please, no wheeze today"), /wheeze/);
  assert.match(stripNegated("Denies chest pain, but short of breath"), /short of breath/);
  assert.doesNotMatch(stripNegated("Denies chest pain, but short of breath"), /chest pain/);
  assert.match(stripNegated("I could not breathe"), /breathe/); // "not" is not a negation cue
  assert.match(stripNegated("Severe knee pain"), /knee pain/); // "no" inside words is untouched
});

test("routine asthma refill with negated wheeze triages LOW → Primary Care, uncomplicated code", () => {
  const text = "Need a refill of my asthma inhaler, routine follow-up, no wheeze today";
  const t = ruleTriage(text, noRisk);
  assert.equal(t.level, "LOW");
  assert.equal(t.department, "Primary Care");
  assert.deepEqual(icd10ForText(text, noRisk), ["J45.909"]);
});

test("negated ECG finding does not raise an ACS flag", () => {
  const r = evaluateRisk({}, ["ECG: no ST elevation, normal sinus rhythm"]);
  assert.equal(r.flags.some((f) => f.category === "CARDIAC"), false);
});

test("stored ECG/troponin evidence codes I21.9 instead of R07.9", () => {
  const risk = evaluateRisk({}, ["ST elevation II, III, aVF"]);
  const codes = icd10ForText("Crushing chest pain radiating to jaw", risk);
  assert.ok(codes.includes("I21.9"));
  assert.ok(!codes.includes("R07.9"));
});

test("negation scope ends at 'and', so a following positive symptom still escalates", () => {
  const t = ruleTriage("No fever and crushing chest pain radiating to my left arm", noRisk);
  assert.equal(t.level, "CRITICAL");
  assert.equal(t.department, "Cardiology");
});

test("bare 'no fever and crushing chest pain' still triages CRITICAL", () => {
  const t = ruleTriage("no fever and crushing chest pain", noRisk);
  assert.equal(t.level, "CRITICAL");
  assert.equal(t.department, "Cardiology");
  assert.notEqual(ruleTriage("no chest pain, crushing fatigue", noRisk).level, "CRITICAL");
});

test("plain-language breathing failure triages CRITICAL", () => {
  for (const text of ["I cannot breathe", "unable to breathe, lips going blue"]) {
    assert.equal(ruleTriage(text, noRisk).level, "CRITICAL", text);
  }
});
