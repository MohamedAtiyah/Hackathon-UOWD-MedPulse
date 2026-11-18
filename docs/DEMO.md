# MedPulse AI: 3-Minute Demo Script

All patients are synthetic. MedPulse is clinical decision support, not diagnosis.

## 1. Setup checklist

- [ ] `npm install` (first time only)
- [ ] `npm run db:push && npm run db:seed`
      Seeds 6 patients, 3 triage sessions, 4 SOAP notes, 5 appointments, 5 outcome metrics.
      Re-running wipes and recreates the demo data, so do it before the demo, not during.
- [ ] `npm run dev`, then open http://localhost:3000
- [ ] Optional: add `ANTHROPIC_API_KEY` to `.env` and restart `npm run dev`.
      Without a key the demo runs on rules. With a key, agent steps show `source: "llm"`.
- [ ] Sanity check: `curl -s http://localhost:3000/api/patients` returns a JSON array.

## 2. Beat-by-beat script

| Time        | Pillar                  | Beat                                          |
|-------------|-------------------------|-----------------------------------------------|
| 0:00-0:20   | Intro                   | What MedPulse is, synthetic data disclaimer   |
| 0:20-1:00   | (a) Command centre      | Risk-ranked list, Harold Brennan, Priya Raman |
| 1:00-1:45   | (b) Agent, URGENT       | Daniel Okafor, chest pain transcript          |
| 1:45-2:20   | (b) Agent, ROUTINE      | Sofia Alvarez, inhaler refill                 |
| 2:20-2:45   | (c) Insights            | COPD readmission, ACS recovery                |
| 2:45-3:00   | Close                   | Offline-safe, explainable, never downgrades   |

**0:00-0:20 Intro.** Say: "MedPulse is a clinical command centre. It turns vitals and
clinical text into ranked risk, triage, a booked appointment and a SOAP note. Everything
here is synthetic, and it supports the clinician's decision rather than replacing it."

**0:20-1:00 (a) Command centre.** Open the patient list, which is sorted by risk.
Point to **Harold Brennan** at the top: sepsis, lactate 4.2 mmol/L, SBP 88, risk score
94. Open his flags and show that each one carries its reasoning (SIRS, hypotension,
lactate). Then show **Priya Raman** (risk 62): the **imaging red flag** is proliferative
diabetic retinopathy seen on fundus photo. Vitals alone would miss it. Say: "Clinician
findings are merged with the rule score, so a documented finding is never hidden."

**1:00-1:45 (b) Agent, URGENT.** Select Daniel Okafor and paste this transcript:

> Crushing central chest pain radiating to my left jaw for 40 minutes, sweating and nauseous

Expect: **CRITICAL**, routed to **Cardiology**, and **Dr. Marcus Chen** auto-booked
within 30 minutes (status Confirmed). The SOAP draft carries ICD-10 codes in the
I21.9 / R07.9 family from the keyword map. Walk through the step trace: rules run first,
and the LLM, when present, can only escalate.

**1:45-2:20 (b) Agent, ROUTINE.** Select Sofia Alvarez and paste this transcript:

> Need a refill of my asthma inhaler, routine follow-up, no wheeze today

Expect: **LOW**, routed to **Primary Care**, and **Dr. Grace Mensah** booked about
7 days out (status Scheduled). Say: "Same pipeline, different urgency, different slot."

**2:20-2:45 (c) Insights.** The **COPD Exacerbation** cohort has the highest 30-day
readmission rate at **22.7%**. **Acute Coronary Syndrome** with primary PCI has the best
recovery at **94.1%**. Say: "Cohort benchmarks sit beside live patients through
`cohortCategory`."

**2:45-3:00 Close.** Say: "It works offline on rules. The LLM adds nuance but can never
downgrade urgency, and every flag and triage decision shows its reasoning."

## 3. API fallback (use if the UI is not ready)

Base URL: `http://localhost:3000`. Copy patient ids from the first call.

```bash
# List patients, sorted by risk. Copy the id for Daniel Okafor and Sofia Alvarez.
curl -s http://localhost:3000/api/patients

# URGENT agent run (expect CRITICAL, Cardiology, Dr. Marcus Chen within 30 min)
curl -s -X POST http://localhost:3000/api/agent \
  -H 'Content-Type: application/json' \
  -d '{"patientId":"<Okafor id>","text":"Crushing central chest pain radiating to my left jaw for 40 minutes, sweating and nauseous"}'

# ROUTINE agent run (expect LOW, Primary Care, about 7 days out)
curl -s -X POST http://localhost:3000/api/agent \
  -H 'Content-Type: application/json' \
  -d '{"patientId":"<Alvarez id>","text":"Need a refill of my asthma inhaler, routine follow-up, no wheeze today"}'

# Cohort insights
curl -s http://localhost:3000/api/insights

# Admit a new synthetic patient; the risk engine scores on intake (expect 201, high risk)
curl -s -X POST http://localhost:3000/api/patients \
  -H 'Content-Type: application/json' \
  -d '{"name":"Demo Patient","age":70,"gender":"Female","vitals":{"hr":128,"sbp":86,"dbp":50,"spo2":89,"temp":39.1,"wbc":17,"lactate":4.5}}'
```

Error codes: 400 for validation, 404 for an unknown patient, 500 for a generic logged error.

## 4. Judge Q&A crib

- **Does it work without internet or an API key?** Yes. The rule engine and the template
  SOAP note run offline. The LLM is optional, has a 5-second timeout, and falls back to
  rules on any failure or invalid response.
- **Can the LLM downgrade urgency?** No. Triage level is the maximum of the LLM and rule
  results, and the department follows the higher one.
- **Why not qSOFA?** qSOFA needs respiratory rate, which we do not capture. The rules use
  a SIRS plus hypoperfusion proxy (temperature, HR, WBC, SBP, lactate) instead, and we
  say so.
- **Is the data real?** No. All six patients are fictional, with clinically coherent values.
- **Is this a diagnosis?** No. It is decision support with a disclaimer. A clinician makes
  the decision.
- **Are the bookings real?** No. Booking is simulated. Real scheduling, auth, EHR/FHIR and
  PHI handling are out of scope.
