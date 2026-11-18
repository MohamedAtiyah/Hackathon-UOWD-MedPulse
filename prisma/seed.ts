// MedPulse AI demo seed. Fictional patients; values chosen to be clinically coherent.
// Wipes and recreates all demo data, so it is safe to re-run (`npm run db:seed`).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const json = (v: unknown) => JSON.stringify(v);
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000);

const patients = [
  {
    key: "sepsis",
    cohort: "Sepsis",
    mrn: "MRN-100231",
    name: "Harold Brennan",
    age: 68,
    gender: "Male",
    bloodType: "A+",
    chronicConditions: ["Type 2 diabetes mellitus", "CKD stage 3a", "Benign prostatic hyperplasia"],
    vitals: { hr: 124, sbp: 88, dbp: 52, spo2: 92, temp: 39.4, wbc: 18.6, lactate: 4.2 },
    riskScore: 94,
    flaggedConditions: [
      "Sepsis risk: SIRS 3/4 + hypotension (SBP 88), qSOFA ≥2",
      "Lactate 4.2 mmol/L (≥4): tissue hypoperfusion",
      "Leukocytosis WBC 18.6 ×10⁹/L",
    ],
    outcomeStatus: "Critical",
  },
  {
    key: "acs",
    cohort: "Acute Coronary Syndrome",
    mrn: "MRN-100458",
    name: "Daniel Okafor",
    age: 57,
    gender: "Male",
    bloodType: "O+",
    chronicConditions: ["Hypertension", "Hyperlipidemia", "Active smoker (30 pack-years)"],
    vitals: { hr: 108, sbp: 158, dbp: 94, spo2: 95, temp: 36.9, wbc: 9.8, lactate: 1.6 },
    riskScore: 88,
    flaggedConditions: [
      "Cardiac anomaly: ST elevation II, III, aVF (inferior STEMI pattern)",
      "Lab red flag: hs-troponin I 1,240 ng/L (>99th percentile)",
      "Tachycardia HR 108",
    ],
    outcomeStatus: "Improving",
  },
  {
    key: "retinopathy",
    cohort: "Diabetic Retinopathy",
    mrn: "MRN-100517",
    name: "Priya Raman",
    age: 49,
    gender: "Female",
    bloodType: "B+",
    chronicConditions: ["Type 2 diabetes mellitus (12 yrs)", "Hypertension"],
    vitals: { hr: 82, sbp: 146, dbp: 88, spo2: 98, temp: 36.7, wbc: 7.2, lactate: 1.1 },
    riskScore: 62,
    flaggedConditions: [
      "Imaging red flag: fundus photo shows neovascularization of the disc, both eyes (proliferative DR)",
      "Lab red flag: HbA1c 9.8%",
      "Stage 2 hypertension BP 146/88",
    ],
    outcomeStatus: "Stable",
  },
  {
    key: "copd",
    cohort: "COPD Exacerbation",
    mrn: "MRN-100602",
    name: "Margaret Lindqvist",
    age: 72,
    gender: "Female",
    bloodType: "AB-",
    chronicConditions: ["COPD GOLD 3", "Heart failure with preserved EF", "Former smoker"],
    vitals: { hr: 112, sbp: 138, dbp: 82, spo2: 86, temp: 37.8, wbc: 13.1, lactate: 2.1 },
    riskScore: 81,
    flaggedConditions: [
      "Respiratory distress: SpO₂ 86% on room air",
      "Readmission within 30 days (COPD exacerbation)",
      "Leukocytosis WBC 13.1 ×10⁹/L: possible infective trigger",
    ],
    outcomeStatus: "Readmitted",
  },
  {
    key: "asthma",
    cohort: null,
    mrn: "MRN-100744",
    name: "Sofia Alvarez",
    age: 34,
    gender: "Female",
    bloodType: "O-",
    chronicConditions: ["Mild persistent asthma"],
    vitals: { hr: 74, sbp: 118, dbp: 76, spo2: 99, temp: 36.6, wbc: 6.4, lactate: 0.9 },
    riskScore: 12,
    flaggedConditions: [],
    outcomeStatus: "Stable",
  },
  {
    key: "tka",
    cohort: null,
    mrn: "MRN-100819",
    name: "Kenji Watanabe",
    age: 63,
    gender: "Male",
    bloodType: "A-",
    chronicConditions: ["Osteoarthritis", "Hypertension (controlled)"],
    vitals: { hr: 78, sbp: 128, dbp: 80, spo2: 97, temp: 37.1, wbc: 8.1, lactate: 1.0 },
    riskScore: 24,
    flaggedConditions: ["Post-op day 10, right total knee arthroplasty: monitor wound and DVT signs"],
    outcomeStatus: "Improving",
  },
] as const;

type Key = (typeof patients)[number]["key"];

async function main() {
  // Children first; Patient delete also cascades, but this keeps intent explicit.
  await prisma.$transaction([
    prisma.appointment.deleteMany(),
    prisma.soapNote.deleteMany(),
    prisma.triageSession.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.outcomeMetric.deleteMany(),
  ]);

  const ids = {} as Record<Key, string>;
  for (const p of patients) {
    const created = await prisma.patient.create({
      data: {
        mrn: p.mrn,
        name: p.name,
        age: p.age,
        gender: p.gender,
        bloodType: p.bloodType,
        chronicConditions: json(p.chronicConditions),
        vitalsJson: json(p.vitals),
        riskScore: p.riskScore,
        flaggedConditions: json(p.flaggedConditions),
        outcomeStatus: p.outcomeStatus,
        cohortCategory: p.cohort,
      },
    });
    ids[p.key] = created.id;
  }

  const triageRuns = [
      {
        patientId: ids.sepsis,
        rawInput:
          "68M, 2 days of dysuria and flank pain, now confused with rigors. Wife says he's barely passing urine.",
        urgencyLevel: "CRITICAL",
        flaggedRisks: json(["Sepsis", "Hypotension", "Acute kidney injury risk", "Altered mentation"]),
        recommendedDepartment: "Critical Care",
        agentReasoning:
          "qSOFA 2/3 (SBP ≤100, altered mentation) with lactate 4.2 mmol/L and a probable urinary source meets Sepsis-3 criteria with hypoperfusion. Escalated to CRITICAL: start the Hour-1 bundle and give ICU consult.",
      },
      {
        patientId: ids.acs,
        rawInput:
          "Crushing central chest pain radiating to left jaw for 40 minutes, sweaty and nauseous, started while shoveling snow.",
        urgencyLevel: "CRITICAL",
        flaggedRisks: json(["Acute coronary syndrome", "Inferior STEMI", "Elevated troponin"]),
        recommendedDepartment: "Cardiology",
        agentReasoning:
          "Classic ischemic chest pain >20 min with diaphoresis, inferior ST elevation and positive hs-troponin. STEMI pathway: activate the cath lab, door-to-balloon target <90 min.",
      },
      {
        patientId: ids.copd,
        rawInput:
          "Discharged 12 days ago for COPD flare. Worse breathlessness for 3 days, green sputum, can't finish sentences.",
        urgencyLevel: "HIGH",
        flaggedRisks: json(["Respiratory distress", "Hypoxemia", "30-day readmission"]),
        recommendedDepartment: "Pulmonology",
        agentReasoning:
          "SpO₂ 86% with increased dyspnea and purulent sputum (Anthonisen type 1) within 30 days of discharge. Controlled O₂ to target 88–92%; ABG to exclude hypercapnia.",
      },
  ];
  // Keyed by patientId so SOAP notes/appointments can link to the run that produced them.
  const runId: Record<string, string> = {};
  for (const data of triageRuns) runId[data.patientId] = (await prisma.triageSession.create({ data })).id;

  await prisma.soapNote.createMany({
    data: [
      {
        patientId: ids.sepsis,
        triageSessionId: runId[ids.sepsis],
        rawTranscript:
          "Patient confused, febrile 39.4, BP 88/52, HR 124. Two days of dysuria. Lactate came back 4.2. Starting fluids and cultures.",
        subjective:
          "68-year-old male with T2DM and CKD 3a. Two days of dysuria and right flank pain, then rigors and new confusion today per spouse. Reduced urine output.",
        objective:
          "T 39.4 °C, HR 124, BP 88/52 (MAP 64), SpO₂ 92% RA. GCS 14. Right CVA tenderness. WBC 18.6 ×10⁹/L, lactate 4.2 mmol/L. UA: nitrite +, leukocyte esterase 3+.",
        assessment:
          "Sepsis with hypoperfusion, likely urosepsis (acute pyelonephritis). At risk of septic shock and AKI on CKD.",
        plan:
          "Hour-1 bundle: blood cultures ×2 before antibiotics, IV piperacillin-tazobactam (renally dosed), 30 mL/kg crystalloid. Repeat lactate in 2 h. Start norepinephrine if MAP <65 after fluids. Foley catheter for strict I/O. ICU consult.",
        icd10Codes: json(["A41.9", "R65.20", "N10", "E11.22"]),
      },
      {
        patientId: ids.acs,
        triageSessionId: runId[ids.acs],
        rawTranscript:
          "Chest pain 40 minutes, radiating to jaw, diaphoretic. ECG shows ST elevation in II, III, aVF. Troponin 1240. Cath lab activated.",
        subjective:
          "57-year-old male smoker with HTN and hyperlipidemia. Crushing retrosternal chest pain for 40 min radiating to the left jaw, with diaphoresis and nausea, onset during exertion.",
        objective:
          "HR 108, BP 158/94, SpO₂ 95% RA, afebrile. ECG: 2–3 mm ST elevation in II, III, aVF with reciprocal depression in I/aVL. hs-troponin I 1,240 ng/L.",
        assessment: "Acute inferior STEMI, likely RCA occlusion. Killip class I.",
        plan:
          "Aspirin 325 mg chewed, ticagrelor 180 mg load, unfractionated heparin bolus. Emergent primary PCI (door-to-balloon <90 min). Hold nitrates until RV infarct is excluded (right-sided leads). High-intensity statin. Post-PCI: echo, cardiac rehab referral, smoking cessation.",
        icd10Codes: json(["I21.11", "I10", "E78.5", "F17.210"]),
      },
      {
        patientId: ids.retinopathy,
        rawTranscript:
          "Diabetic, A1c 9.8. Fundus screening flagged new vessels on the disc in both eyes. Some blurry vision lately.",
        subjective:
          "49-year-old female with 12-year T2DM. Gradual blurring of vision over 2 months, no flashes or curtain. Reports inconsistent metformin adherence.",
        objective:
          "BP 146/88, HR 82. VA 6/12 OD, 6/9 OS. Fundus photography: NVD both eyes, scattered dot-blot hemorrhages, no macular edema on OCT. HbA1c 9.8%.",
        assessment:
          "Proliferative diabetic retinopathy, bilateral, without macular edema. Poorly controlled T2DM with hyperglycemia.",
        plan:
          "Urgent retina referral (within 1 week) for panretinal photocoagulation or anti-VEGF. Intensify glycemic therapy (add GLP-1 RA), target HbA1c <7%. BP target <130/80 (start ACE inhibitor). Annual nephropathy screen.",
        icd10Codes: json(["E11.3593", "E11.65", "I10"]),
      },
      {
        patientId: ids.copd,
        triageSessionId: runId[ids.copd],
        rawTranscript:
          "Readmitted COPD, sats 86 on air, wheezy, green sputum, HR 112. Discharged 12 days ago.",
        subjective:
          "72-year-old female with COPD GOLD 3 and HFpEF, discharged 12 days ago. Three days of worsening dyspnea, increased purulent sputum and wheeze. Unable to complete sentences.",
        objective:
          "SpO₂ 86% RA, HR 112, BP 138/82, T 37.8 °C. Diffuse expiratory wheeze, accessory muscle use. WBC 13.1 ×10⁹/L, lactate 2.1 mmol/L. CXR: hyperinflation, no consolidation.",
        assessment:
          "Acute exacerbation of COPD with acute hypoxemic respiratory failure, likely infective trigger. 30-day readmission.",
        plan:
          "Controlled O₂ to SpO₂ 88–92%, ABG. Nebulized salbutamol + ipratropium, prednisolone 40 mg × 5 days, doxycycline. NIV if pH <7.35 with hypercapnia. Pulmonary rehab and transitional-care follow-up within 7 days of discharge.",
        icd10Codes: json(["J44.1", "J96.01", "I50.30"]),
      },
    ],
  });

  await prisma.appointment.createMany({
    data: [
      { patientId: ids.sepsis, triageSessionId: runId[ids.sepsis], doctorName: "Dr. Elena Vasquez", department: "Critical Care", scheduledAt: hoursFromNow(0.5), status: "Confirmed", autoBooked: true },
      { patientId: ids.acs, triageSessionId: runId[ids.acs], doctorName: "Dr. Marcus Chen", department: "Cardiology", scheduledAt: hoursFromNow(1), status: "Confirmed", autoBooked: true },
      { patientId: ids.retinopathy, doctorName: "Dr. Aisha Rahman", department: "Ophthalmology", scheduledAt: hoursFromNow(24 * 5), status: "Scheduled", autoBooked: true },
      { patientId: ids.copd, triageSessionId: runId[ids.copd], doctorName: "Dr. Thomas Byrne", department: "Pulmonology", scheduledAt: hoursFromNow(4), status: "Confirmed", autoBooked: true },
      { patientId: ids.asthma, doctorName: "Dr. Grace Mensah", department: "Primary Care", scheduledAt: hoursFromNow(24 * 14), status: "Scheduled", autoBooked: true },
    ],
  });

  await prisma.outcomeMetric.createMany({
    data: [
      { cohortCategory: "Sepsis", treatmentProtocol: "SEP-1 Hour-1 Bundle", recoveryRate: 78.4, avgLengthOfStay: 7.2, readmissionRate: 19.6, sampleSize: 212 },
      { cohortCategory: "Acute Coronary Syndrome", treatmentProtocol: "Primary PCI (D2B <90 min)", recoveryRate: 94.1, avgLengthOfStay: 3.4, readmissionRate: 11.8, sampleSize: 168 },
      { cohortCategory: "COPD Exacerbation", treatmentProtocol: "GOLD Bundle + Pulmonary Rehab", recoveryRate: 81.3, avgLengthOfStay: 5.1, readmissionRate: 22.7, sampleSize: 143 },
      { cohortCategory: "Heart Failure", treatmentProtocol: "GDMT Titration + Transitional Care", recoveryRate: 84.0, avgLengthOfStay: 4.6, readmissionRate: 18.9, sampleSize: 176 },
      { cohortCategory: "Diabetic Retinopathy", treatmentProtocol: "Anti-VEGF + PRP", recoveryRate: 86.5, avgLengthOfStay: 0.3, readmissionRate: 6.2, sampleSize: 94 },
    ],
  });

  const counts = await Promise.all([
    prisma.patient.count(),
    prisma.triageSession.count(),
    prisma.soapNote.count(),
    prisma.appointment.count(),
    prisma.outcomeMetric.count(),
  ]);
  console.log(
    `Seeded: ${counts[0]} patients, ${counts[1]} triage sessions, ${counts[2]} SOAP notes, ${counts[3]} appointments, ${counts[4]} outcome metrics`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
