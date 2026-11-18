// Agent orchestrator: risk → triage → booking → SOAP → one short transaction.
import { z } from "zod";
import { prisma } from "./db";
import { parseJson, parseStringArray, toJson } from "./json";
import { evaluateRisk } from "./risk";
import { llmTriage, mergeTriage, ruleTriage } from "./triage";
import { buildSoap, llmSoap, mergeSoap } from "./soap";
import { planAppointment } from "./booking";
import { toAppointmentView, toSoapNoteView } from "./views";
import type { AgentInput, AgentResult, AgentStep, AgentStepName, DecisionSource, PatientContext, Vitals } from "./types";

export class NotFoundError extends Error {}

const inputSchema = z.object({
  patientId: z.string().trim().min(1).max(64),
  text: z.string().trim().min(1, "text is required").max(4000),
});

export const parseAgentInput = (body: unknown): AgentInput => inputSchema.parse(body);

export async function runAgent(input: AgentInput): Promise<AgentResult> {
  const { text } = input;
  const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
  if (!patient) throw new NotFoundError("Patient not found");

  const ctx: PatientContext = {
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    chronicConditions: parseStringArray(patient.chronicConditions),
    vitals: parseJson<Vitals>(patient.vitalsJson, {}),
  };
  const storedFlags = parseStringArray(patient.flaggedConditions);

  const steps: AgentStep[] = [];
  let t = performance.now();
  const step = (name: AgentStepName, label: string, detail: string, source: DecisionSource) => {
    const now = performance.now();
    steps.push({ name, label, detail, source, durationMs: Math.round(now - t) });
    t = now;
  };

  const risk = evaluateRisk(ctx.vitals, [...storedFlags, text]);
  step("risk", "Diagnostic risk scan", `Score ${risk.score}/100 · ${risk.level} · ${risk.flags.length} flags`, "rules");

  const triage = mergeTriage(ruleTriage(text, risk), await llmTriage(text, ctx, risk));
  step("triage", "Severity triage", `${triage.level} → ${triage.department}`, triage.source);

  const plan = planAppointment(triage.level, triage.department);
  step("booking", "Auto-booking", `${plan.doctorName} · ${plan.department} · ${plan.scheduledAt.toISOString()} (${plan.status})`, "rules");

  const soap = mergeSoap(buildSoap(text, ctx, risk, triage), await llmSoap(text, ctx, risk, triage));
  step("soap", "SOAP documentation", `${soap.icd10Codes.length} ICD-10 codes: ${soap.icd10Codes.join(", ")}`, soap.source);

  // LLM calls are all done; keep the SQLite transaction short.
  const { session, appt, note } = await prisma.$transaction(async (tx) => {
    const session = await tx.triageSession.create({
      data: {
        patientId: patient.id,
        rawInput: text,
        urgencyLevel: triage.level,
        flaggedRisks: toJson(triage.flaggedRisks),
        recommendedDepartment: triage.department,
        agentReasoning: triage.reasoning,
      },
    });
    const appt = await tx.appointment.create({
      data: { ...plan, patientId: patient.id, triageSessionId: session.id },
    });
    const note = await tx.soapNote.create({
      data: {
        patientId: patient.id,
        rawTranscript: text,
        subjective: soap.subjective,
        objective: soap.objective,
        assessment: soap.assessment,
        plan: soap.plan,
        icd10Codes: toJson(soap.icd10Codes),
        triageSessionId: session.id,
      },
    });
    await tx.patient.update({
      where: { id: patient.id },
      data: {
        riskScore: Math.max(patient.riskScore, risk.score),
        flaggedConditions: toJson([...new Set([...storedFlags, ...risk.flags.map((f) => `${f.label}: ${f.reason}`)])]),
        ...(triage.level === "CRITICAL" ? { outcomeStatus: "Critical" } : {}),
      },
    });
    return { session, appt, note };
  });
  step("persist", "Persist to record", "TriageSession + Appointment + SoapNote saved", "rules");

  return {
    triageSessionId: session.id,
    patientId: patient.id,
    risk,
    triage,
    appointment: toAppointmentView(appt),
    soap: toSoapNoteView(note),
    steps,
    source: triage.source === "llm" || soap.source === "llm" ? "llm" : "rules",
  };
}
