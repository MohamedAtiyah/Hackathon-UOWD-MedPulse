# Challenge: Medical AI Track

**Product:** MedPulse AI, a clinical command centre for physicians.
**Budget:** 120 minutes. **Stack:** Next.js (App Router) + TypeScript + Tailwind + Prisma/SQLite.

## Track pillars → how we satisfy them

| Pillar | Requirement | MedPulse feature | Demo proof |
|--------|-------------|------------------|-----------|
| 1. Diagnostic Support | Automatically flag clinical risks from vitals and diagnostic metadata | Rule engine over `vitalsJson` (HR, SBP/DBP, SpO₂, Temp, WBC, Lactate) produces a risk score 0–100 plus flags: **Sepsis**, **Cardiac anomaly**, **Respiratory distress**, **Lab/Imaging red flags** | Sepsis patient (lactate 4.2, SBP 88) shows CRITICAL; the retinopathy patient shows an imaging flag |
| 2. Agentic AI Assistant | Free-text symptoms or transcript → triage → booking → documentation | `POST /api/agent` pipeline: severity triage (CRITICAL / HIGH / MODERATE / LOW) → department routing → **auto-booked appointment** → **SOAP note + ICD-10**, with a visible step trace | Paste a chest-pain transcript and watch it reach CRITICAL, book Cardiology and draft a SOAP note |
| 3. Clinical Data Insights | Cohort patterns in outcomes, recovery by protocol, readmission risk | Insights dashboard: recovery rate by protocol, readmission rate by cohort, outcome-status distribution, LOS | COPD cohort stands out with the highest readmission rate (22.7%) |

## Judging hooks

- **Works offline:** rule-based fallback, so no API key is needed for the demo.
- **Explainable:** every flag and triage decision shows its reasoning.
- **Safe by design:** the LLM can escalate urgency but never downgrade it. Synthetic data only. Decision-support disclaimer.

## Out of scope

Auth, real EHR/FHIR integration, real scheduling systems, PHI handling, charting libraries.
