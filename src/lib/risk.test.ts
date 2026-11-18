import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateRisk } from "./risk";

const normal = { hr: 74, sbp: 118, dbp: 76, spo2: 99, temp: 36.6, wbc: 6.4, lactate: 0.9 };

test("sepsis", () => {
  const r = evaluateRisk({ hr: 124, sbp: 88, dbp: 52, spo2: 92, temp: 39.4, wbc: 18.6, lactate: 4.2 });
  assert.equal(r.level, "CRITICAL");
  assert.ok(r.flags.some((f) => f.category === "SEPSIS" && f.severity === "CRITICAL"));
  assert.equal(r.score, 100);
});
test("healthy", () => {
  const r = evaluateRisk(normal);
  assert.deepEqual(r.flags, []);
  assert.equal(r.score, 0);
  assert.equal(r.level, "LOW");
});
test("empty vitals", () => assert.equal(evaluateRisk({}).score, 0));
test("COPD", () => {
  const r = evaluateRisk({ hr: 112, sbp: 138, dbp: 82, spo2: 86, temp: 37.8, wbc: 13.1, lactate: 2.1 });
  assert.ok(r.flags.some((f) => f.category === "RESPIRATORY" && f.severity === "CRITICAL"));
  assert.equal(r.level, "CRITICAL");
});
test("ST elevation finding", () => {
  const r = evaluateRisk(normal, ["ECG: ST elevation II, III, aVF; hs-troponin I 1,240 ng/L"]);
  const c = r.flags.filter((f) => f.label === "Acute coronary syndrome marker");
  assert.equal(c.length, 1);
  assert.equal(c[0].severity, "CRITICAL");
  assert.ok(r.score >= 70);
});
test("imaging + HbA1c", () => {
  const r = evaluateRisk(normal, ["fundus photo shows neovascularization of the disc", "HbA1c 9.8%"]);
  assert.ok(r.flags.some((f) => f.category === "IMAGING" && f.severity === "HIGH"));
  assert.ok(r.flags.some((f) => f.category === "LAB" && f.severity === "MODERATE"));
  assert.equal(r.score, 50);
});
test("score bounded", () => {
  for (const v of [{}, normal, { hr: 300, sbp: 20, dbp: 200, spo2: 50, temp: 45, wbc: 90, lactate: 20 }, { hr: NaN, spo2: Infinity }]) {
    const s = evaluateRisk(v, ["stemi pneumothorax afib respiratory distress hba1c 12"]).score;
    assert.ok(s >= 0 && s <= 100);
  }
});
