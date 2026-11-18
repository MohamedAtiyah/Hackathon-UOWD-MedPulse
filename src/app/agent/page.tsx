import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader, scoreLevel } from "@/components/ui";
import { llmEnabled } from "@/lib/llm";
import { listPatients } from "@/lib/patients";
import { maxLevel } from "@/lib/types";
import { AgentWorkspace } from "./agent-workspace";

export const metadata: Metadata = { title: "Triage Studio" };

export default async function AgentPage({ searchParams }: { searchParams: Promise<{ patientId?: string }> }) {
  await connection();
  const { patientId } = await searchParams;
  const patients = (await listPatients()).map((p) => ({
    id: p.id,
    name: p.name,
    mrn: p.mrn,
    age: p.age,
    gender: p.gender,
    effectiveRiskScore: p.effectiveRiskScore,
    level: maxLevel(p.risk.level, scoreLevel(p.effectiveRiskScore)),
  }));
  const llmMode = llmEnabled();
  return (
    <>
      <PageHeader
        title="Agentic Triage Studio"
        subtitle="Free-text symptoms or a clinician transcript → urgency triage → SOAP note with ICD-10 → auto-booked specialist slot, persisted to the record."
      >
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${llmMode ? "bg-violet-100 text-violet-700" : "bg-zinc-100 text-zinc-600"}`}
        >
          {llmMode ? "LLM-assisted · rules as safety floor" : "Offline rule engine"}
        </span>
      </PageHeader>
      <AgentWorkspace
        patients={patients}
        initialPatientId={patients.some((p) => p.id === patientId) ? patientId : undefined}
      />
    </>
  );
}
