import assert from "node:assert/strict";
import { test } from "node:test";
import { readmissionTier, summarizeMetrics } from "./insights";

const m = (recoveryRate: number, sampleSize: number) => ({
  id: "x", cohortCategory: "c", treatmentProtocol: "p", recoveryRate, avgLengthOfStay: 5, readmissionRate: 10, sampleSize,
});

test("readmissionTier boundaries", () => {
  assert.equal(readmissionTier(18), "high");
  assert.equal(readmissionTier(17.9), "elevated");
  assert.equal(readmissionTier(10), "elevated");
  assert.equal(readmissionTier(9.9), "low");
});

test("summarizeMetrics weights by sample size", () => {
  assert.equal(summarizeMetrics([m(80, 100), m(90, 300)]).recoveryRate, 87.5);
});

test("summarizeMetrics empty is all zeros", () => {
  assert.deepEqual(summarizeMetrics([]), { recoveryRate: 0, readmissionRate: 0, avgLengthOfStay: 0, sampleSize: 0 });
});
