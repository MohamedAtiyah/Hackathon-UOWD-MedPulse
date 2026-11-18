import test from "node:test";
import assert from "node:assert/strict";
import { DEPARTMENTS } from "./types";
import { DOCTOR_ROSTER, planAppointment } from "./booking";

const now = new Date("2026-11-18T10:07:30Z");

test("CRITICAL +30m rounds up to next quarter", () => {
  const p = planAppointment("CRITICAL", "Cardiology", now);
  assert.equal(p.scheduledAt.toISOString(), "2026-11-18T10:45:00.000Z");
  assert.equal(p.status, "Confirmed");
  assert.equal(p.autoBooked, true);
});
test("HIGH +2h", () => {
  assert.equal(planAppointment("HIGH", "Cardiology", now).scheduledAt.toISOString(), "2026-11-18T12:15:00.000Z");
});
test("LOW +7d Scheduled", () => {
  const p = planAppointment("LOW", "Primary Care", now);
  assert.equal(p.scheduledAt.toISOString(), "2026-11-25T10:15:00.000Z");
  assert.equal(p.status, "Scheduled");
});
test("exact quarter stays", () => {
  const p = planAppointment("CRITICAL", "Cardiology", new Date("2026-11-18T10:15:00Z"));
  assert.equal(p.scheduledAt.toISOString(), "2026-11-18T10:45:00.000Z");
});
test("roster covers every department", () => {
  for (const d of DEPARTMENTS) assert.ok(DOCTOR_ROSTER[d]);
});
