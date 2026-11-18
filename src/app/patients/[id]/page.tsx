import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getPatient } from "@/lib/patients";
import { maxLevel } from "@/lib/types";
import { Card, OutcomeBadge, RiskFlagList, RiskScoreBar, SeverityBadge, VitalsGrid, formatDateTime, scoreLevel } from "@/components/ui";

export const metadata: Metadata = { title: "Patient" };
const nowMs = () => Date.now();

const Chip = ({ children, mono }: { children: React.ReactNode; mono?: boolean }) => (
  <span className={`rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 ${mono ? "font-mono" : ""}`}>{children}</span>
);

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const p = await getPatient(id);
  if (!p) notFound();

  const level = maxLevel(p.risk.level, scoreLevel(p.effectiveRiskScore));
  const now = nowMs();
  const sessionIds = new Set(p.triageSessions.map((s) => s.id));
  const sessions = [...p.triageSessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const empty = (t: string) => <p className="text-sm text-zinc-600">{t}</p>;

  return (
    <>
      <Link href="/" className="text-sm font-medium text-teal-700 hover:underline">
        ← Command Centre
      </Link>
      <div className="mb-6 mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900">
            {p.name} <SeverityBadge level={level} /> <OutcomeBadge status={p.outcomeStatus} />
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {p.mrn} · {p.age}y · {p.gender} · {p.bloodType}
            {p.cohortCategory && ` · ${p.cohortCategory}`}
          </p>
          <div className="mt-3 w-64 max-w-full">
            <RiskScoreBar score={p.effectiveRiskScore} />
          </div>
        </div>
        <Link
          href={`/agent?patientId=${p.id}`}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Run triage agent
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Vitals" className="lg:col-span-2">
          <VitalsGrid vitals={p.vitals} />
        </Card>
        <Card title="Chronic conditions">
          {p.chronicConditions.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {p.chronicConditions.map((c) => (
                <li key={c}>
                  <Chip>{c}</Chip>
                </li>
              ))}
            </ul>
          ) : (
            empty("None recorded.")
          )}
        </Card>
        <Card title={`Live diagnostic flags · rules score ${p.risk.score}/100`} className="lg:col-span-2">
          <RiskFlagList flags={p.risk.flags} />
        </Card>
        <Card title="Documented findings">
          {p.flaggedConditions.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {p.flaggedConditions.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : (
            empty("No documented findings.")
          )}
        </Card>
      </div>

      <div className="mt-4 space-y-4">
        <Card title="Appointments">
          {p.appointments.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="text-xs uppercase text-zinc-600">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Date</th>
                    <th className="pb-2 pr-3 font-medium">Department</th>
                    <th className="pb-2 pr-3 font-medium">Doctor</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {p.appointments.map((a) => {
                    const upcoming = new Date(a.scheduledAt).getTime() >= now && a.status !== "Cancelled" && a.status !== "Completed";
                    return (
                      <tr key={a.id}>
                        <td className="py-2 pr-3 tabular-nums">{formatDateTime(a.scheduledAt)}</td>
                        <td className="py-2 pr-3">{a.department}</td>
                        <td className="py-2 pr-3">{a.doctorName}</td>
                        <td className="py-2">
                          <span className="mr-1.5">{a.status}</span>
                          <Chip>{upcoming ? "Upcoming" : "Past"}</Chip>
                          {a.autoBooked && (
                            <span className="ml-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-600/20">
                              Auto-booked
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            empty("No appointments.")
          )}
        </Card>

        <Card title="Triage history">
          {sessions.length ? (
            <div className="space-y-4">
              {sessions.map((s) => (
                <article key={s.id} className="rounded-lg border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <SeverityBadge level={s.urgencyLevel} />
                    <span className="font-medium text-zinc-900">→ {s.recommendedDepartment}</span>
                    <span className="text-xs text-zinc-600">{formatDateTime(s.createdAt)}</span>
                  </div>
                  <blockquote className="mt-2 border-l-2 border-zinc-300 pl-3 text-sm italic text-zinc-600">{s.rawInput}</blockquote>
                  <p className="mt-2 text-sm text-zinc-700">{s.agentReasoning}</p>
                  {s.flaggedRisks.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {s.flaggedRisks.map((r) => (
                        <li key={r}>
                          <Chip>{r}</Chip>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          ) : (
            empty("No triage runs yet.")
          )}
        </Card>

        <Card title="SOAP notes">
          {p.soapNotes.length ? (
            <div className="space-y-4">
              {p.soapNotes.map((n) => (
                <article key={n.id} id={n.id} className="scroll-mt-20 rounded-lg border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                    <a href={`#${n.id}`} className="font-medium text-zinc-700 hover:underline">
                      {formatDateTime(n.createdAt)}
                    </a>
                    {n.triageSessionId && sessionIds.has(n.triageSessionId) && <span>from triage run</span>}
                    {n.icd10Codes.map((c) => (
                      <Chip key={c} mono>
                        {c}
                      </Chip>
                    ))}
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    {(
                      [
                        ["Subjective", n.subjective],
                        ["Objective", n.objective],
                        ["Assessment", n.assessment],
                        ["Plan", n.plan],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{k}</dt>
                        <dd className="mt-0.5 whitespace-pre-line text-zinc-700">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            empty("No SOAP notes yet.")
          )}
        </Card>
      </div>
    </>
  );
}
