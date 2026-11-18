import type { Patient } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { parseJson, parseStringArray, toJson } from "./json";
import { evaluateRisk } from "./risk";
import type { PatientDetail, PatientView, Vitals } from "./types";
import { asOutcome, toAppointmentView, toSoapNoteView, toTriageSessionView } from "./views";

const textList = z.array(z.string().trim().min(1).max(200)).max(20).default([]);
const num = (min: number, max: number) => z.number().finite().min(min).max(max).optional();

const admitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  age: z.number().int().min(0).max(120),
  gender: z.enum(["Male", "Female", "Other"]),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]).default("Unknown"),
  chronicConditions: textList,
  vitals: z.object({
    hr: num(20, 250),
    sbp: num(40, 300),
    dbp: num(20, 200),
    spo2: num(50, 100),
    temp: num(30, 45),
    wbc: num(0, 100),
    lactate: num(0, 30),
  }),
  findings: textList,
  cohortCategory: z.string().trim().min(1).max(80).optional(),
});

export type AdmitInput = z.infer<typeof admitSchema>;

export const parseAdmitInput = (body: unknown): AdmitInput => admitSchema.parse(body);

export function toPatientView(row: Patient): PatientView {
  const vitals = parseJson<Vitals>(row.vitalsJson, {});
  const flaggedConditions = parseStringArray(row.flaggedConditions);
  const risk = evaluateRisk(vitals, flaggedConditions);
  return {
    id: row.id,
    mrn: row.mrn,
    name: row.name,
    age: row.age,
    gender: row.gender,
    bloodType: row.bloodType,
    chronicConditions: parseStringArray(row.chronicConditions),
    vitals,
    riskScore: row.riskScore,
    flaggedConditions,
    outcomeStatus: asOutcome(row.outcomeStatus),
    cohortCategory: row.cohortCategory,
    createdAt: row.createdAt.toISOString(),
    risk,
    effectiveRiskScore: Math.max(row.riskScore, risk.score),
  };
}

export async function listPatients(): Promise<PatientView[]> {
  const rows = await prisma.patient.findMany();
  return rows
    .map(toPatientView)
    .sort((a, b) => b.effectiveRiskScore - a.effectiveRiskScore || a.name.localeCompare(b.name));
}

export async function getPatient(id: string): Promise<PatientDetail | null> {
  const row = await prisma.patient.findUnique({
    where: { id },
    include: {
      triageSessions: { orderBy: { createdAt: "desc" } },
      soapNotes: { orderBy: { createdAt: "desc" } },
      appointments: { orderBy: { scheduledAt: "asc" } },
    },
  });
  if (!row) return null;
  return {
    ...toPatientView(row),
    triageSessions: row.triageSessions.map(toTriageSessionView),
    soapNotes: row.soapNotes.map(toSoapNoteView),
    appointments: row.appointments.map(toAppointmentView),
  };
}

export async function admitPatient(input: AdmitInput): Promise<PatientView> {
  const risk = evaluateRisk(input.vitals, input.findings);
  const flagged = [...new Set([...input.findings, ...risk.flags.map((f) => `${f.label}: ${f.reason}`)])];
  for (let attempt = 1; ; attempt++) {
    try {
      const created = await prisma.patient.create({
        data: {
          mrn: "MRN-" + String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0"),
          name: input.name,
          age: input.age,
          gender: input.gender,
          bloodType: input.bloodType,
          chronicConditions: toJson(input.chronicConditions),
          vitalsJson: toJson(input.vitals),
          riskScore: risk.score,
          flaggedConditions: toJson(flagged),
          outcomeStatus: risk.level === "CRITICAL" ? "Critical" : "Stable",
          cohortCategory: input.cohortCategory ?? null,
        },
      });
      return toPatientView(created);
    } catch (e) {
      const dup = typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
      if (!dup || attempt >= 3) throw e;
    }
  }
}
