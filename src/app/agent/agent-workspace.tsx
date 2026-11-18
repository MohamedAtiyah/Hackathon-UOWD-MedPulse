"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, Bot, CalendarCheck, CircleCheck, FileText, LoaderCircle, Sparkles, Stethoscope, TriangleAlert } from "lucide-react";
import {
  Card,
  OutcomeBadge,
  RiskFlagList,
  RiskScoreBar,
  SEVERITY_STYLES,
  SeverityBadge,
  SourceBadge,
  formatDateTime,
} from "@/components/ui";
import type { AgentResult, UrgencyLevel } from "@/lib/types";

export interface PatientOption {
  id: string;
  name: string;
  mrn: string;
  age: number;
  gender: string;
  effectiveRiskScore: number;
  level: UrgencyLevel;
}

const PRESETS: { title: string; patient: string; dot: string; text: string }[] = [
  {
    title: "Acute Sepsis Escalation",
    patient: "Harold Brennan",
    dot: "bg-red-500",
    text: "68M, 2 days of dysuria and flank pain, now confused with fever and rigors. Wife says he's barely passing urine.",
  },
  {
    title: "Chest Pain / ACS Triage",
    patient: "Daniel Okafor",
    dot: "bg-red-500",
    text: "Crushing central chest pain radiating to my left jaw for 40 minutes, sweating and nauseous.",
  },
  {
    title: "Respiratory Deterioration",
    patient: "Margaret Lindqvist",
    dot: "bg-orange-500",
    text: "Worse breathlessness for 3 days, green sputum, can't finish sentences. No chest pain.",
  },
  {
    title: "Routine Follow-up",
    patient: "Sofia Alvarez",
    dot: "bg-emerald-500",
    text: "Need a refill of my asthma inhaler, routine follow-up, no wheeze today.",
  },
];

const STAGES = [
  "Deterministic safety floor & risk scoring",
  "Symptom & negation parsing → urgency",
  "Structured SOAP note + ICD-10 coding",
  "Autonomous specialist slot booking",
  "Persist to patient record",
];

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600";

export function AgentWorkspace({ patients, initialPatientId }: { patients: PatientOption[]; initialPatientId?: string }) {
  const [patientId, setPatientId] = useState(initialPatientId ?? patients[0]?.id ?? "");
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentResult | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (running || !text.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null); // never show a previous run's trace next to a new error
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) setError(data?.error ?? "The agent could not process this request.");
      else setResult(data as AgentResult);
    } catch {
      setError("Network error: could not reach the agent. Please try again.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
      <div className="lg:sticky lg:top-6">
        <Card title="Scenario input">
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-600">Quick-fill scenarios</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {PRESETS.map((p) => {
                const match = patients.find((x) => x.name.toLowerCase().includes(p.patient.toLowerCase()));
                return (
                  <button
                    key={p.title}
                    type="button"
                    disabled={!match || running}
                    onClick={() => match && (setPatientId(match.id), setText(p.text))}
                    className={`rounded-lg border border-zinc-200/80 bg-white px-3 py-2 text-left text-sm shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors hover:border-teal-400 hover:bg-teal-50/60 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`}
                  >
                    <span className="flex items-center gap-2 font-medium text-zinc-900">
                      <span className={`size-2 shrink-0 rounded-full ${p.dot}`} aria-hidden />
                      {p.title}
                    </span>
                    <span className="block pl-4 text-xs text-zinc-600">{match ? match.name : `${p.patient} (not found)`}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="patient" className="mb-1 block text-sm font-medium text-zinc-700">
                Patient
              </label>
              <select
                id="patient"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className={`w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm ${focus}`}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.mrn} · {p.level}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="text" className="mb-1 block text-sm font-medium text-zinc-700">
                Symptoms or clinician transcript
              </label>
              <textarea
                id="text"
                rows={6}
                maxLength={4000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe symptoms, or paste a transcript…"
                className={`w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm ${focus}`}
              />
              <p className="mt-1 text-right text-xs tabular-nums text-zinc-600">{text.length} / 4000</p>
            </div>
            <button
              type="submit"
              disabled={running || !text.trim() || !patientId}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 active:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`}
            >
              {running ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Bot className="size-4" aria-hidden />}
              Run triage agent
            </button>
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {error}
              </div>
            )}
          </form>
        </Card>
      </div>

      <div aria-busy={running} className="min-w-0 space-y-4">
        {running ? <Pending /> : result ? <Results r={result} /> : <Empty />}
      </div>
    </div>
  );
}

function Pending() {
  return (
    <Card title="Agent step trace">
      <p role="status" aria-live="polite" className="mb-3 text-sm font-medium text-teal-700">
        Agent running…
      </p>
      <ol className="space-y-2">
        {STAGES.map((s) => (
          <li key={s} className="flex items-center gap-3 text-sm text-zinc-600">
            <LoaderCircle className="size-4 shrink-0 animate-spin text-teal-600" aria-hidden />
            {s}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Empty() {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-teal-600" aria-hidden />
        <div className="text-sm text-zinc-600">
          <p className="font-semibold text-zinc-900">One input, four autonomous stages</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Triage: parse symptoms (negation-aware) and set urgency over a deterministic safety floor.</li>
            <li>SOAP: draft a structured note with ICD-10 codes.</li>
            <li>Booking: reserve the right specialist slot automatically.</li>
            <li>Persist: write everything to the patient record.</li>
          </ol>
          <p className="mt-3 font-medium text-teal-700">Pick a scenario to try it in one click.</p>
        </div>
      </div>
    </Card>
  );
}

function Results({ r }: { r: AgentResult }) {
  const total = r.steps.reduce((a, s) => a + s.durationMs, 0);
  const { appointment: a, soap, triage, patientAfter } = r;
  const sections: [string, string][] = [
    ["Subjective", soap.subjective],
    ["Objective", soap.objective],
    ["Assessment", soap.assessment],
    ["Plan", soap.plan],
  ];
  return (
    <>
      <Card title="Agent step trace" action={<SourceBadge source={r.source} />}>
        <ol>
          {r.steps.map((s, i) => (
            <li key={s.name} className="relative flex gap-3 pb-6 last:pb-0">
              {i < r.steps.length - 1 && <span className="absolute left-[13px] top-8 h-[calc(100%-2rem)] w-0.5 rounded-full bg-teal-200" aria-hidden />}
              <span className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold tabular-nums text-white shadow-sm ring-4 ring-teal-50">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-sm font-medium tracking-tight text-zinc-900">{s.label}</p>
                  <CircleCheck className="size-4 text-emerald-600" aria-label="Done" />
                  <SourceBadge source={s.source} />
                  <span className="ml-auto font-mono text-xs tabular-nums text-zinc-500">{s.durationMs} ms</span>
                </div>
                <p className="mt-1 break-words text-sm leading-relaxed text-zinc-600">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 border-t border-zinc-200/70 pt-3 text-right text-xs text-zinc-600">
          Total <span className="font-semibold tabular-nums text-zinc-700">{total} ms</span>
        </p>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
            <SeverityBadge level={triage.level} />
            <ArrowRight className="size-4 text-zinc-500" aria-hidden />
            <Stethoscope className="size-4 text-teal-600" aria-hidden />
            {triage.department}
          </div>
          <div className="flex min-w-48 flex-1 items-center gap-3 text-sm text-zinc-600">
            <span className="whitespace-nowrap font-medium tabular-nums text-zinc-900">
              Risk {patientAfter.previousRiskScore} → {patientAfter.riskScore}
            </span>
            <RiskScoreBar score={patientAfter.riskScore} className="flex-1" />
            <OutcomeBadge status={patientAfter.outcomeStatus} />
          </div>
          <Link
            href={`/patients/${r.patientId}#${soap.id}`}
            className={`text-sm font-medium text-teal-700 hover:underline ${focus}`}
          >
            Open patient record →
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Triage reasoning" action={<SourceBadge source={triage.source} />}>
          <p className="text-sm text-zinc-700">{triage.reasoning}</p>
          {triage.flaggedRisks.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {triage.flaggedRisks.map((f) => (
                <li key={f} className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${SEVERITY_STYLES[triage.level].badge}`}>
                  {f}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Risk flags" action={<span className="text-xs font-semibold tabular-nums text-zinc-600">Score {r.risk.score}</span>}>
          <RiskFlagList flags={r.risk.flags} />
        </Card>
      </div>

      <Card
        className="border-emerald-300/70 bg-emerald-50/40 shadow-md ring-1 ring-emerald-500/10 [&>header]:border-emerald-200/70 [&>header]:bg-emerald-50/80"
        title={
          <span className="flex items-center gap-2">
            <CalendarCheck className="size-4 text-emerald-600" aria-hidden /> Booked appointment
          </span>
        }
        action={
          a.autoBooked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <CircleCheck className="size-3" aria-hidden />
              Auto-booked
            </span>
          )
        }
      >
        <p className="text-base font-semibold tracking-tight text-zinc-900">{a.doctorName}</p>
        <p className="mt-0.5 text-sm tabular-nums text-zinc-600">
          {a.department} · {formatDateTime(a.scheduledAt)} · {a.status}
        </p>
      </Card>

      <Card
        title={
          <span className="flex items-center gap-2">
            <FileText className="size-4 text-teal-600" aria-hidden /> SOAP note
          </span>
        }
        action={<SourceBadge source={r.source} />}
      >
        {soap.icd10Codes.length > 0 && (
          <ul className="mb-4 flex flex-wrap gap-1.5">
            {soap.icd10Codes.map((c) => (
              <li key={c} className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-700">
                {c}
              </li>
            ))}
          </ul>
        )}
        <dl className="space-y-3 text-sm">
          {sections.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{k}</dt>
              <dd className="mt-0.5 whitespace-pre-line text-zinc-700">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs italic text-zinc-600">Draft — requires clinician review</p>
      </Card>
    </>
  );
}
