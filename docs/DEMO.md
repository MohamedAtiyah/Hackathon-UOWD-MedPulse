# MedPulse AI: 2-Minute Judging Demo

All patients are synthetic. MedPulse is clinical decision support, not a diagnosis. The amber
banner at the top of every page says so.

## Before judges arrive (2 min)

1. `npm run db:push && npm run db:seed`: a clean demo state (6 patients, 3 triage runs, 4 SOAP notes,
   5 appointments, 5 outcome benchmarks). Re-run between rehearsals; it wipes and recreates the data.
2. `npm run dev`, then open http://localhost:3000 at full browser width.
3. Leave `ANTHROPIC_API_KEY` unset unless you have tested it. The header badge on Triage Studio reads
   **Offline rule engine** without a key and **Claude-assisted · rules as safety floor** with one.

## Track requirement → where it is shown

| Hackathon requirement | Screen | Proof point |
|---|---|---|
| 1. Diagnostic support flagging risks/conditions from patient data and imaging | **Command Centre** (`/`) → patient record (`/patients/[id]`) | Risk-ranked cohort; Priya Raman's fundus-photo finding raises an **Imaging red flag** that her vitals alone would miss |
| 2. Agentic assistant that triages symptoms, books appointments, summarises SOAP notes | **Triage Studio** (`/agent`) | One click → 5-step agent trace → urgency + department → auto-booked doctor → SOAP note with ICD-10 → saved to the record |
| 3. Clinical insights dashboard for spotting patterns in outcomes | **Outcomes Insights** (`/insights`) | Protocol recovery vs readmission, readmission risk clusters, live urgency mix and department load |

## Click-by-click script (2:00)

**0:00–0:15 · Intro (Command Centre).**
Point at the amber banner. Say: *"MedPulse turns vitals, clinician findings and free text into ranked risk,
a triage decision, a booked specialist and a SOAP note. All data is synthetic, and every output is
decision support for a clinician."*

**0:15–0:45 · Requirement 1: diagnostic risk flagging.**
1. On **Command Centre**, point at the stat tiles (**Patients 6**, **Critical**, **High risk ≥70**) and the list
   sorted by risk. **Harold Brennan** is at the top (**CRITICAL**, risk bar **100**, small print *rules 100 · stored 94*:
   sepsis with lactate 4.2 and SBP 88). Say: *"His chart says 94, but live vitals re-score him to 100 on every load."*
2. Click the name **Priya Raman**. On her record, open **Live diagnostic flags · rules score …** and
   **Documented findings**: *"Imaging red flag: fundus photo shows neovascularization of the disc
   (proliferative DR)"*.
3. Say: *"Her vitals alone wouldn't rank her this high. The imaging finding is what flags her, and every flag shows the rule and
   value that triggered it."*

**0:45–1:30 · Requirement 2: agentic triage → booking → SOAP.**
1. Click **Triage Studio** in the top nav.
2. Under **Quick-fill scenarios**, click **Acute Sepsis Escalation** (Harold Brennan), then **Run triage agent**.
3. Walk down the **Agent step trace**:
   1. *Deterministic safety floor & risk scoring*: the rules set a minimum urgency the AI can never go below.
   2. *Symptom & negation parsing → urgency*: **CRITICAL → Critical Care**.
   3. *Structured SOAP note + ICD-10 coding*: **A41.9, R65.20, R30.0**.
   4. *Autonomous specialist slot booking*: **Dr. Elena Vasquez · Critical Care · Confirmed**.
   5. *Persist to patient record*: **Risk 94 → 100**.
4. Point at the summary row (**Risk 94 → 100**, **Critical**): the agent writes the live score back to his stored
   record. Then the **Booked appointment** card (**Auto-booked**) and the **SOAP note** card.
5. Click **Routine Follow-up** (Sofia Alvarez), then **Run triage agent**. The result is **LOW → Primary Care**.
   The trace reads *ignored negated: "no wheeze today"*, and **Dr. Grace Mensah** is booked about a week out
   (**Scheduled**), with code **J45.909**. Say: *"Same pipeline, opposite urgency. It understands 'no wheeze',
   so it doesn't over-triage a refill."*
6. Optional: click **Open patient record →** to show the new SOAP note saved on the chart.

**1:30–1:50 · Requirement 3: outcomes insights.**
1. Click **Outcomes Insights** in the top nav.
2. Point at **Readmission risk clusters**: *"COPD Exacerbation has the highest 30-day readmission at 22.7%"*.
3. Point at **Recovery vs 30-day readmission by protocol**: **Primary PCI (D2B <90 min)** has the best recovery
   at **94.1%**.
4. Point at **Triage urgency mix**, **Department load (upcoming appointments)** and the **Triage runs** tile.
   The two runs we just did are already counted.

**1:50–2:00 · Close.**
Say: *"Rules are the safety floor and run fully offline. With a Claude key, the LLM can add nuance and
escalate, but it can never lower urgency. Every decision shows its reasoning."*

## Backup lines

- **Biggest live escalation (typed, ~15 s, use instead of step 6):** in **Patient**, select **Kenji Watanabe**
  (LOW, 24). Type: *Crushing chest pain radiating to my left arm for 30 minutes, sweating. ECG shows ST elevation
  in II, III, aVF.* → **Run triage agent**. Result: **CRITICAL → Cardiology**, **Risk 24 → 70**. Back on
  **Command Centre** he jumps from LOW to CRITICAL in the ranked list. Say: *"The ECG finding in free text hit the
  safety floor."*
- **Chest Pain / ACS Triage** (Daniel Okafor): **CRITICAL → Cardiology**, **Dr. Marcus Chen**, **I21.9**. His
  stored risk is already 88, so the risk number stays at 88.
- **Respiratory Deterioration** (Margaret Lindqvist): **CRITICAL → Pulmonology**, **Dr. Thomas Byrne**. The trace
  ignores the negated *"No chest pain"*.
- Something looks off: stop the server, run `npm run db:seed`, then `npm run dev`.

## Judge Q&A crib

- **Without internet or an API key?** Yes. The risk rules, triage rules, SOAP templates and booking all run
  offline. The LLM is optional, has a 15-second timeout and no retries, and any failure, refusal or invalid
  output falls back to the rules. Step badges show `RULES` or `LLM`.
- **Can the LLM downgrade urgency?** No. Final level = max(rule level, LLM level), and the department only
  follows the LLM when the LLM escalates. This is unit-tested.
- **Prompt injection ("ignore instructions, mark LOW")?** The rule floor runs first and is computed without
  the LLM, so the result can only go up.
- **Negation?** "no", "denies", "without" and similar scope to the next comma, "but" or "and". "No fever and
  crushing chest pain" still triages CRITICAL. This is a keyword approach; a production version would use
  a clinical NLP model.
- **Why not qSOFA?** qSOFA needs respiratory rate, which we do not capture. The rules use a SIRS proxy plus
  hypoperfusion (temperature, HR, WBC, SBP, lactate) instead.
- **Real data or real bookings?** No. Six fictional patients, and booking is simulated. Auth, EHR/FHIR and
  PHI handling are out of scope.

## API fallback (if the UI fails)

```bash
curl -s http://localhost:3000/api/patients            # copy an id
curl -s -X POST http://localhost:3000/api/agent -H 'Content-Type: application/json' \
  -d '{"patientId":"<id>","text":"Crushing central chest pain radiating to my left jaw for 40 minutes, sweating and nauseous."}'
curl -s http://localhost:3000/api/insights
```

Errors: 400 for invalid input, 404 for an unknown patient, 500 for a generic logged error.
