import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getInsights } from "@/lib/insights";
import { listPatients } from "@/lib/patients";
import { maxLevel } from "@/lib/types";
import { OutcomeBadge, PageHeader, RiskScoreBar, SEVERITY_STYLES, SeverityBadge, StatTile, VitalsGrid, scoreLevel } from "@/components/ui";

export const metadata: Metadata = { title: "Command Centre" };

const BORDER = { CRITICAL: "border-l-red-500", HIGH: "border-l-orange-500", MODERATE: "border-l-amber-400", LOW: "border-l-emerald-500" } as const;

export default async function CommandCentre() {
  await connection();
  const [patients, insights] = await Promise.all([listPatients(), getInsights()]);
  const t = insights.totals;

  return (
    <>
      <PageHeader
        title="Command Centre"
        subtitle="Live cohort ranked by diagnostic risk · rule engine re-scores vitals and documented findings on every load"
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Patients" value={t.patients} />
        <StatTile label="Critical" value={t.critical} tone="red" />
        <StatTile label="High risk ≥70" value={t.highRisk} tone="orange" />
        <StatTile label="Readmitted" value={t.readmitted} tone="purple" />
        <StatTile label="Upcoming appts" value={t.upcomingAppointments} tone="teal" />
        <StatTile label="Agent triage runs" value={t.triageSessions} />
      </div>

      <p className="mb-3 text-xs text-zinc-600">
        Score shown = effective risk, the higher of the stored clinician score and the live rule-engine score. Left
        border and badge show urgency.
      </p>

      <ol className="space-y-3">
        {patients.map((p, i) => {
          const level = maxLevel(p.risk.level, scoreLevel(p.effectiveRiskScore));
          const flags = p.risk.flags.slice(0, 2);
          const more = p.risk.flags.length - flags.length;
          return (
            <li key={p.id} className={`rounded-xl border border-l-4 border-zinc-200/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-md ${level === "CRITICAL" ? "bg-gradient-to-b from-red-50/70 to-white" : "bg-white"} ${BORDER[level]}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold tracking-tight text-zinc-900">
                    <span className="mr-2 font-mono text-sm text-zinc-500">#{i + 1}</span>
                    <Link href={`/patients/${p.id}`} className="text-teal-700 underline-offset-4 hover:underline">
                      {p.name}
                    </Link>
                  </h2>
                  <p className="text-xs text-zinc-600">
                    {p.mrn} · {p.age}y · {p.gender} · {p.bloodType}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge level={level} />
                  <OutcomeBadge status={p.outcomeStatus} />
                  {p.cohortCategory && <span className="text-xs text-zinc-600">{p.cohortCategory}</span>}
                </div>
              </div>

              <div className="mt-3 max-w-md">
                <RiskScoreBar score={p.effectiveRiskScore} />
                <p className="mt-0.5 text-xs text-zinc-600">
                  rules {p.risk.score} · stored {p.riskScore}
                </p>
              </div>

              <div className="mt-3">
                <VitalsGrid vitals={p.vitals} compact />
              </div>

              <div className="mt-3 text-xs">
                {flags.length > 0 ? (
                  <ul className="space-y-1">
                    {flags.map((f, j) => (
                      <li key={j} className="text-zinc-600">
                        <span className={`font-semibold ${SEVERITY_STYLES[f.severity].text}`}>{f.label}</span>: {f.reason}
                      </li>
                    ))}
                    {more > 0 && <li className="text-zinc-600">+{more} more</li>}
                  </ul>
                ) : p.flaggedConditions.length > 0 ? (
                  <p className="text-zinc-600">
                    <span className="font-semibold">Documented:</span> {p.flaggedConditions[0]}
                  </p>
                ) : null}
              </div>

              <div className="mt-3">
                <Link
                  href={`/agent?patientId=${p.id}`}
                  className="inline-flex rounded-lg border border-teal-600/80 bg-white px-3 py-1 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-50"
                >
                  Run triage agent<span className="sr-only"> for {p.name}</span>
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
