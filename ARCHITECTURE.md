# Architecture: MedPulse AI

## Layout

```
prisma/
  schema.prisma          Patient, TriageSession, SoapNote, Appointment, OutcomeMetric (SQLite)
  seed.ts                6 patients, 3 triage sessions, 4 SOAP notes, 5 appointments, 5 metrics
src/lib/                 (Opus-owned: types, json, views, llm, db)
  db.ts                  Prisma singleton
  types.ts               all shared types + URGENCY_LEVELS/DEPARTMENTS, maxLevel()
  json.ts                parseJson / parseStringArray / toJson: the only JSON-column helpers
  views.ts               Prisma row → *View mappers (shared by every module)
  llm.ts                 llmStructured(zodSchema, system, user) → T | null (no key/timeout/refusal → null; OpenAI Responses API, OPENAI_API_KEY / OPENAI_MODEL)
  risk.ts                A1 evaluateRisk(vitals, findings) → RiskAssessment            pure
  triage.ts              B1 ruleTriage / llmTriage / mergeTriage                          pure + LLM
  soap.ts                B1 buildSoap / icd10ForText / llmSoap / mergeSoap                pure + LLM
  booking.ts             B2 planAppointment(level, department, now)                       pure
  agent.ts               B2 parseAgentInput / runAgent → AgentResult                       DB
  patients.ts            P  listPatients / getPatient / admitPatient / parseAdmitInput      DB
  insights.ts            C1 summarizeMetrics / readmissionTier / getInsights               DB
  *.test.ts              node:test + node:assert, run with `npm test`
src/app/api/
  agent/route.ts         POST { patientId, text } → 201 AgentResult  (persists TriageSession+Appointment+SoapNote, updates Patient)
  patients/route.ts      GET → PatientView[] (by effectiveRiskScore desc) · POST admit → 201 PatientView (risk engine scores on intake)
  patients/[id]/route.ts GET → PatientDetail | 404
  insights/route.ts      GET → Insights
src/app/ (Phase 2)       page.tsx · patients/[id] · agent · insights
```

Route handlers stay thin: parse JSON → `parse*Input` (zod) → lib call → `Response.json`. Errors return `{ error: string }` with 400 (validation), 404 (unknown patient) or 500 (logged, generic message). Handlers are uncached by default in Next 16, so every GET reads live SQLite.

## Module contracts (signatures are binding; types from `@/lib/types`)

```ts
// risk.ts
export const SEVERITY_WEIGHT: Record<UrgencyLevel, number>   // CRITICAL 70, HIGH 40, MODERATE 20, LOW 5
export function evaluateRisk(vitals: Vitals, findings?: string[]): RiskAssessment
//   per category take its worst flag's weight; score = min(100, round(top + 0.5 × Σ other categories))
//   so one CRITICAL ≥ 70 ("high risk"), multi-system involvement pushes toward 100. level = maxLevel(flags) or LOW

// triage.ts
export function ruleTriage(text: string, risk: RiskAssessment): TriageAssessment            // source "rules"
export function llmTriage(text: string, patient: PatientContext, risk: RiskAssessment)
  : Promise<Omit<TriageAssessment, "source"> | null>
export function mergeTriage(rule: TriageAssessment, llm: Omit<TriageAssessment, "source"> | null): TriageAssessment
//   level = maxLevel(rule, llm). LLM never downgrades. Department from whichever side has the higher level (rule wins ties)

// soap.ts
export function icd10ForText(text: string, risk: RiskAssessment): string[]
export function buildSoap(text: string, patient: PatientContext, risk: RiskAssessment, triage: TriageAssessment): SoapDraft
export function llmSoap(text: string, patient: PatientContext, risk: RiskAssessment, triage: TriageAssessment)
  : Promise<Omit<SoapDraft, "source"> | null>
export function mergeSoap(rule: SoapDraft, llm: Omit<SoapDraft, "source"> | null): SoapDraft   // invalid ICD codes dropped

// booking.ts
export const DOCTOR_ROSTER: Record<Department, string>
export function planAppointment(level: UrgencyLevel, department: Department, now?: Date)
  : { doctorName: string; department: Department; scheduledAt: Date; status: AppointmentStatus; autoBooked: true }
//   CRITICAL +30m Confirmed · HIGH +2h Confirmed · MODERATE +1d Scheduled · LOW +7d Scheduled, rounded up to :15

// agent.ts
export class NotFoundError extends Error {}
export function parseAgentInput(body: unknown): AgentInput          // throws ZodError
export function runAgent(input: AgentInput): Promise<AgentResult>   // throws NotFoundError

// patients.ts
export interface AdmitInput { name; age; gender; bloodType?; chronicConditions?; vitals: Vitals; findings?; cohortCategory? }
export function parseAdmitInput(body: unknown): AdmitInput          // throws ZodError
export function toPatientView(row: Patient): PatientView
export function listPatients(): Promise<PatientView[]>
export function getPatient(id: string): Promise<PatientDetail | null>
export function admitPatient(input: AdmitInput): Promise<PatientView>

// insights.ts
export function readmissionTier(rate: number): ReadmissionTier     // ≥18 high, ≥10 elevated, else low
export function summarizeMetrics(metrics: OutcomeMetricView[]): Insights["weighted"]
export function getInsights(now?: Date): Promise<Insights>
```

## Data model notes

- SQLite has no enums or arrays. Enum-like fields are `String` (allowed values are listed in schema comments), and lists are JSON strings read through `parseJson`.
- `vitalsJson`: `{ hr, sbp, dbp, spo2, temp, wbc, lactate }`, all numbers (BP split into systolic/diastolic for rules).
- Children cascade-delete with their `Patient`. `OutcomeMetric` is unique on (cohortCategory, treatmentProtocol).
- **Agent-run audit trail:** `SoapNote.triageSessionId` and `Appointment.triageSessionId` (nullable, `SetNull` on delete) link each record to the `TriageSession` that produced it. Write all three in one `$transaction`.
- **Insights join:** `Patient.cohortCategory` (nullable) matches `OutcomeMetric.cohortCategory`, so live patient outcomes can sit beside cohort benchmarks.
- **Stored vs computed risk:** seeded `riskScore` / `flaggedConditions` include clinician-entered findings that aren't in vitals (ECG, troponin, fundus imaging, HbA1c). The UI shows `max(stored, evaluateRisk(vitals).score)` and the union of both flag sets, so rules never hide a documented finding.

## Agent pipeline (pillar 2)

```
POST /api/agent { patientId, text }            (step trace order shown in the Triage Studio)
  1 evaluateRisk(vitals, storedFindings + text)  deterministic safety floor & risk score
  2 stripNegated(text) → cue triage; level = max(rules, risk floor, llm?)   LLM can only escalate
  3 buildSoap (llm ?? template) + ICD-10 codes   invalid LLM codes dropped
  4 planAppointment: CRITICAL +30m · HIGH +2h · MODERATE +1d · LOW +7d (rounded to :15)
  5 prisma.$transaction: TriageSession + SoapNote + Appointment(autoBooked) linked by triageSessionId;
    Patient.riskScore = max(old, new), flags ∪, outcomeStatus → Critical on CRITICAL
  → AgentResult { steps[], risk, triage, soap, appointment, patientAfter, source: "llm" | "rules" }
```

## UI (Phase 2)

| Route | Owner | Pillar | Notes |
|---|---|---|---|
| `layout.tsx`, `components/nav-links.tsx`, `components/ui.tsx` | L1 (lead) | all | shell, nav, disclaimer banner, shared badges/vitals/flags/cards |
| `/` | A2 | 1 | KPIs + patients ranked by effective risk, vitals, explainable flags |
| `/patients/[id]` | A2 | 1 | full vitals, flags, findings, triage history, SOAP notes, appointments |
| `/agent` | B3 | 2 | presets + free text → POST /api/agent → step trace, SOAP, booking, risk delta |
| `/insights` | C2 | 3 | recovery vs readmission by protocol, clusters, LOS, outcome/urgency/department mixes |

Pages are Server Components that call `src/lib` directly after `await connection()` (per-request SQLite reads); only the agent workspace is a client component.

## Risk rules (pillar 1): starting thresholds

| Flag | Rule (any vitals missing → rule skipped) |
|------|------|
| Sepsis | ≥2 of: temp >38.3 or <36, HR >90, WBC >12 or <4 (SIRS), **plus** SBP ≤100 or lactate ≥2. Lactate ≥4 → CRITICAL |
| Cardiac anomaly | HR >120 or <45, SBP ≥180 or <90 |
| Respiratory distress | SpO₂ <92 (CRITICAL <88) |
| Lab red flag | WBC >15 or <3, lactate ≥2 |
| Imaging red flag | from diagnostic metadata (`flaggedConditions` text), not vitals |

qSOFA needs respiratory rate, which we don't capture, so the rules use a SIRS + hypoperfusion proxy. Say so to judges.

## Key risks

1. **Clinical safety:** rules are heuristics. Show the disclaimer, and the LLM can never downgrade urgency.
2. **LLM fragility:** validate the response shape, use a 15s timeout (LLM_TIMEOUT_MS), fall back to rules, and show `source` in the UI.
3. **Agent API ↔ UI contract drift:** freeze `AgentResult` in `types.ts` at T+50 before B2/B3 run in parallel.
