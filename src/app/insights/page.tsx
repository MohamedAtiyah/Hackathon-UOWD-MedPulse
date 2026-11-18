import type { Metadata } from "next";
import { connection } from "next/server";
import { Card, PageHeader, SEVERITY_STYLES, SeverityBadge, StatTile, scoreLevel } from "@/components/ui";
import { getInsights } from "@/lib/insights";
import { listPatients } from "@/lib/patients";
import { OUTCOME_STATUSES, URGENCY_LEVELS, type ReadmissionTier, type UrgencyLevel } from "@/lib/types";
import { ColumnChart, Empty, HBar, ProtocolChart, StackedBar, TierPill } from "./charts";

export const metadata: Metadata = { title: "Outcomes Insights" };

const OUTCOME_BAR = { Improving: "bg-emerald-500", Stable: "bg-sky-500", Critical: "bg-red-500", Readmitted: "bg-purple-500" } as const;
const TIERS: ReadmissionTier[] = ["high", "elevated", "low"];

export default async function InsightsPage() {
  await connection();
  const [insights, patients] = await Promise.all([getInsights(), listPatients()]);
  const { weighted, cohorts, totals } = insights;
  const top = cohorts.reduce<(typeof cohorts)[number] | null>((a, c) => (!a || c.readmissionRate > a.readmissionRate ? c : a), null);
  const topLive = top && top.livePatients > 0 ? ` and ${top.livePatients} live patient${top.livePatients > 1 ? "s" : ""} currently in this cohort` : "";

  const riskBuckets = (["CRITICAL", "HIGH", "MODERATE", "LOW"] as UrgencyLevel[]).map((level) => ({
    level,
    people: patients.filter((p) => scoreLevel(p.effectiveRiskScore) === level),
  }));

  return (
    <div>
      <PageHeader
        title="Outcomes Insights"
        subtitle={`Cohort outcome patterns, protocol effectiveness and readmission risk · benchmarks from ${weighted.sampleSize} historical cases + live patients`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Recovery rate" value={`${weighted.recoveryRate}%`} tone="teal" hint="Weighted by sample size" />
        <StatTile label="30-day readmission" value={`${weighted.readmissionRate}%`} tone="orange" hint="Weighted by sample size" />
        <StatTile label="Avg length of stay" value={`${weighted.avgLengthOfStay} d`} hint="Weighted, days" />
        <StatTile label="Live high-risk" value={totals.highRisk} tone="red" hint={`of ${totals.patients} patients, score ≥ 70`} />
        <StatTile label="Triage runs" value={totals.triageSessions} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Recovery vs 30-day readmission by protocol" className="lg:col-span-3">
          <ProtocolChart
            rows={cohorts.map((c) => ({ name: c.cohortCategory, protocol: c.treatmentProtocol, n: c.sampleSize, recovery: c.recoveryRate, readmission: c.readmissionRate, tier: c.readmissionTier }))}
            avgRecovery={weighted.recoveryRate}
            avgReadmission={weighted.readmissionRate}
          />
        </Card>

        <Card title="Readmission risk clusters" className="lg:col-span-2">
          {top ? (
            <p className="mb-4 text-sm text-zinc-700">
              <strong>{top.cohortCategory}</strong> has the highest 30-day readmission at {top.readmissionRate}%{topLive}.
            </p>
          ) : (
            <Empty />
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            {TIERS.map((tier) => {
              const group = cohorts.filter((c) => c.readmissionTier === tier);
              return (
                <div key={tier}>
                  <TierPill tier={tier} />
                  {group.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-500">No cohorts</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {group.map((c) => (
                        <li key={c.id} className="text-sm">
                          <p className="font-medium text-zinc-900">{c.cohortCategory}</p>
                          <p className="text-xs text-zinc-600">
                            {c.readmissionRate}% readmit · {c.livePatients} live
                            {c.liveAvgRisk != null && (
                              <>
                                {" "}· avg risk{" "}
                                <span className={`font-semibold ${SEVERITY_STYLES[scoreLevel(c.liveAvgRisk)].text}`}>{c.liveAvgRisk}</span>
                              </>
                            )}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Average length of stay">
          <ColumnChart cols={cohorts.map((c) => ({ label: c.cohortCategory, value: c.avgLengthOfStay }))} unit=" d" bar="bg-zinc-500" />
        </Card>

        <Card title="Live patient outcome status">
          <StackedBar label="Live patient outcome status" parts={OUTCOME_STATUSES.map((s) => ({ label: s, value: insights.outcomeDistribution[s], bar: OUTCOME_BAR[s] }))} />
        </Card>

        <Card title="Triage urgency mix">
          <HBar rows={URGENCY_LEVELS.map((l) => ({ label: l, value: insights.urgencyDistribution[l], bar: SEVERITY_STYLES[l].bar }))} />
        </Card>

        <Card title="Department load (upcoming appointments)">
          <HBar rows={insights.departmentLoad.map((d) => ({ label: d.department, value: d.count, bar: "bg-teal-600" }))} />
        </Card>

        <Card title="Risk distribution" className="lg:col-span-3">
          {patients.length === 0 ? (
            <Empty />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {riskBuckets.map((b) => (
                <div key={b.level}>
                  <div className="flex items-center justify-between">
                    <SeverityBadge level={b.level} />
                    <span className="text-2xl font-semibold tabular-nums text-zinc-900">{b.people.length}</span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-600">{b.people.map((p) => p.name).join(", ") || "None"}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
