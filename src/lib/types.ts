// Shared contracts for MedPulse AI. Opus-owned: builders import, never redeclare.

/** Ascending severity; index order is used for comparisons (see maxLevel). */
export const URGENCY_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const OUTCOME_STATUSES = ["Improving", "Stable", "Critical", "Readmitted"] as const;
export type OutcomeStatus = (typeof OUTCOME_STATUSES)[number];

export const APPOINTMENT_STATUSES = ["Scheduled", "Confirmed", "Completed", "Cancelled"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const DEPARTMENTS = [
  "Critical Care",
  "Emergency Medicine",
  "Cardiology",
  "Pulmonology",
  "Neurology",
  "Infectious Disease",
  "Endocrinology",
  "Ophthalmology",
  "Gastroenterology",
  "Orthopedics",
  "Primary Care",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const levelRank = (l: UrgencyLevel): number => URGENCY_LEVELS.indexOf(l);
export const maxLevel = (...ls: UrgencyLevel[]): UrgencyLevel =>
  ls.reduce<UrgencyLevel>((a, b) => (levelRank(b) > levelRank(a) ? b : a), "LOW");

/** Shape of Patient.vitalsJson. Any field may be missing; rules skip missing values. */
export interface Vitals {
  hr?: number; // beats/min
  sbp?: number; // mmHg systolic
  dbp?: number; // mmHg diastolic
  spo2?: number; // %
  temp?: number; // °C
  wbc?: number; // ×10⁹/L
  lactate?: number; // mmol/L
}

// ── Pillar 1: diagnostic risk ────────────────────────────────────────────────
export type RiskCategory = "SEPSIS" | "CARDIAC" | "RESPIRATORY" | "LAB" | "IMAGING";

export interface RiskFlag {
  category: RiskCategory;
  severity: UrgencyLevel;
  /** Short human label, e.g. "Sepsis risk". */
  label: string;
  /** Evidence, e.g. "Lactate 4.2 mmol/L ≥ 4; SBP 88 ≤ 100". */
  reason: string;
}

export interface RiskAssessment {
  score: number; // 0-100
  level: UrgencyLevel; // highest flag severity, LOW when no flags
  flags: RiskFlag[];
}

// ── Pillar 2: agent ──────────────────────────────────────────────────────────
export type DecisionSource = "rules" | "llm";

export interface TriageAssessment {
  level: UrgencyLevel;
  department: Department;
  flaggedRisks: string[];
  reasoning: string;
  source: DecisionSource;
}

export interface SoapDraft {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icd10Codes: string[];
  source: DecisionSource;
}

/** Context the agent passes to triage/SOAP builders. */
export interface PatientContext {
  name: string;
  age: number;
  gender: string;
  chronicConditions: string[];
  vitals: Vitals;
}

export type AgentStepName = "risk" | "triage" | "booking" | "soap" | "persist";

export interface AgentStep {
  name: AgentStepName;
  label: string; // UI title, e.g. "Severity triage"
  detail: string; // one-line result, e.g. "CRITICAL → Cardiology"
  source: DecisionSource;
  durationMs: number;
}

export interface AppointmentView {
  id: string;
  patientId: string;
  doctorName: string;
  department: string;
  scheduledAt: string; // ISO
  status: AppointmentStatus;
  autoBooked: boolean;
  triageSessionId: string | null;
}

export interface SoapNoteView extends Omit<SoapDraft, "source"> {
  id: string;
  patientId: string;
  rawTranscript: string;
  triageSessionId: string | null;
  createdAt: string; // ISO
}

export interface TriageSessionView {
  id: string;
  patientId: string;
  rawInput: string;
  urgencyLevel: UrgencyLevel;
  flaggedRisks: string[];
  recommendedDepartment: string;
  agentReasoning: string;
  createdAt: string; // ISO
}

export interface AgentInput {
  patientId: string;
  text: string;
}

/** POST /api/agent response body. Frozen contract between API (B2) and UI (B3). */
export interface AgentResult {
  triageSessionId: string;
  patientId: string;
  risk: RiskAssessment;
  triage: TriageAssessment;
  appointment: AppointmentView;
  soap: SoapNoteView;
  steps: AgentStep[];
  /** Patient record after the run (riskScore only ever rises). */
  patientAfter: { previousRiskScore: number; riskScore: number; outcomeStatus: OutcomeStatus };
  /** "llm" if any step used the LLM, else "rules". */
  source: DecisionSource;
}

// ── Patients ─────────────────────────────────────────────────────────────────
export interface PatientView {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  bloodType: string;
  chronicConditions: string[];
  vitals: Vitals;
  /** Stored score (clinician + prior runs). */
  riskScore: number;
  /** Stored findings text (includes imaging/ECG/labs not in vitals). */
  flaggedConditions: string[];
  outcomeStatus: OutcomeStatus;
  cohortCategory: string | null;
  createdAt: string; // ISO
  /** Live rule output over vitals + stored findings. */
  risk: RiskAssessment;
  /** max(riskScore, risk.score): what the UI ranks and displays. */
  effectiveRiskScore: number;
}

export interface PatientDetail extends PatientView {
  triageSessions: TriageSessionView[];
  soapNotes: SoapNoteView[];
  appointments: AppointmentView[];
}

// ── Pillar 3: insights ───────────────────────────────────────────────────────
export interface OutcomeMetricView {
  id: string;
  cohortCategory: string;
  treatmentProtocol: string;
  recoveryRate: number; // %
  avgLengthOfStay: number; // days
  readmissionRate: number; // %
  sampleSize: number;
}

export type ReadmissionTier = "high" | "elevated" | "low";

export interface CohortInsight extends OutcomeMetricView {
  readmissionTier: ReadmissionTier; // high ≥ 18%, elevated ≥ 10%, else low
  livePatients: number; // patients currently tagged with this cohort
  liveAvgRisk: number | null; // avg effectiveRiskScore of those patients
}

export interface Insights {
  totals: {
    patients: number;
    critical: number; // outcomeStatus Critical
    readmitted: number;
    highRisk: number; // effectiveRiskScore ≥ 70
    autoBookedAppointments: number;
    upcomingAppointments: number; // scheduledAt ≥ now and not Cancelled/Completed
    triageSessions: number;
  };
  /** Sample-size-weighted means across all metrics. */
  weighted: { recoveryRate: number; readmissionRate: number; avgLengthOfStay: number; sampleSize: number };
  cohorts: CohortInsight[]; // sorted by recoveryRate desc
  outcomeDistribution: Record<OutcomeStatus, number>;
  urgencyDistribution: Record<UrgencyLevel, number>; // from TriageSession
  departmentLoad: { department: string; count: number }[]; // upcoming appts, desc
}
