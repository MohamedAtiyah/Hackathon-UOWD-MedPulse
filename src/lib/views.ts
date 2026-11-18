// Prisma row → API view mappers (JSON columns parsed, Dates → ISO). Opus-owned, shared by all modules.
import type { Appointment, OutcomeMetric, SoapNote, TriageSession } from "@prisma/client";
import { parseStringArray } from "./json";
import {
  APPOINTMENT_STATUSES,
  OUTCOME_STATUSES,
  URGENCY_LEVELS,
  type AppointmentStatus,
  type AppointmentView,
  type OutcomeMetricView,
  type OutcomeStatus,
  type SoapNoteView,
  type TriageSessionView,
  type UrgencyLevel,
} from "./types";

// String columns are unconstrained in SQLite; coerce unknown values to a safe default.
const oneOf = <T extends string>(allowed: readonly T[], value: string, fallback: T): T =>
  (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

export const asUrgency = (v: string): UrgencyLevel => oneOf(URGENCY_LEVELS, v, "LOW");
export const asOutcome = (v: string): OutcomeStatus => oneOf(OUTCOME_STATUSES, v, "Stable");
export const asApptStatus = (v: string): AppointmentStatus => oneOf(APPOINTMENT_STATUSES, v, "Scheduled");

export const toTriageSessionView = (r: TriageSession): TriageSessionView => ({
  id: r.id,
  patientId: r.patientId,
  rawInput: r.rawInput,
  urgencyLevel: asUrgency(r.urgencyLevel),
  flaggedRisks: parseStringArray(r.flaggedRisks),
  recommendedDepartment: r.recommendedDepartment,
  agentReasoning: r.agentReasoning,
  createdAt: r.createdAt.toISOString(),
});

export const toSoapNoteView = (r: SoapNote): SoapNoteView => ({
  id: r.id,
  patientId: r.patientId,
  rawTranscript: r.rawTranscript,
  subjective: r.subjective,
  objective: r.objective,
  assessment: r.assessment,
  plan: r.plan,
  icd10Codes: parseStringArray(r.icd10Codes),
  triageSessionId: r.triageSessionId,
  createdAt: r.createdAt.toISOString(),
});

export const toAppointmentView = (r: Appointment): AppointmentView => ({
  id: r.id,
  patientId: r.patientId,
  doctorName: r.doctorName,
  department: r.department,
  scheduledAt: r.scheduledAt.toISOString(),
  status: asApptStatus(r.status),
  autoBooked: r.autoBooked,
  triageSessionId: r.triageSessionId,
});

export const toOutcomeMetricView = (r: OutcomeMetric): OutcomeMetricView => ({ ...r });
