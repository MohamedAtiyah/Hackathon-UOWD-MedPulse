import { prisma } from "./db";
import { listPatients } from "./patients";
import {
  OUTCOME_STATUSES,
  URGENCY_LEVELS,
  type CohortInsight,
  type Insights,
  type OutcomeMetricView,
  type ReadmissionTier,
} from "./types";
import { asUrgency, toOutcomeMetricView } from "./views";

export const readmissionTier = (rate: number): ReadmissionTier =>
  rate >= 18 ? "high" : rate >= 10 ? "elevated" : "low";

const round1 = (n: number) => Math.round(n * 10) / 10;

export function summarizeMetrics(metrics: OutcomeMetricView[]): Insights["weighted"] {
  const sampleSize = metrics.reduce((s, m) => s + m.sampleSize, 0);
  if (sampleSize === 0) return { recoveryRate: 0, readmissionRate: 0, avgLengthOfStay: 0, sampleSize: 0 };
  const mean = (pick: (m: OutcomeMetricView) => number) =>
    round1(metrics.reduce((s, m) => s + pick(m) * m.sampleSize, 0) / sampleSize);
  return {
    recoveryRate: mean((m) => m.recoveryRate),
    readmissionRate: mean((m) => m.readmissionRate),
    avgLengthOfStay: mean((m) => m.avgLengthOfStay),
    sampleSize,
  };
}

export async function getInsights(now: Date = new Date()): Promise<Insights> {
  const [patients, metricRows, urgencyGroups, triageSessions, autoBooked, upcoming] = await Promise.all([
    listPatients(),
    prisma.outcomeMetric.findMany(),
    prisma.triageSession.groupBy({ by: ["urgencyLevel"], _count: { _all: true } }),
    prisma.triageSession.count(),
    prisma.appointment.count({ where: { autoBooked: true } }),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: now }, status: { notIn: ["Cancelled", "Completed"] } },
      select: { department: true },
    }),
  ]);

  const metrics = metricRows.map(toOutcomeMetricView);
  const cohorts: CohortInsight[] = metrics
    .map((m) => {
      const live = patients.filter((p) => p.cohortCategory === m.cohortCategory);
      return {
        ...m,
        readmissionTier: readmissionTier(m.readmissionRate),
        livePatients: live.length,
        liveAvgRisk: live.length ? Math.round(live.reduce((s, p) => s + p.effectiveRiskScore, 0) / live.length) : null,
      };
    })
    .sort((a, b) => b.recoveryRate - a.recoveryRate);

  const outcomeDistribution = Object.fromEntries(OUTCOME_STATUSES.map((s) => [s, 0])) as Insights["outcomeDistribution"];
  for (const p of patients) outcomeDistribution[p.outcomeStatus]++;

  const urgencyDistribution = Object.fromEntries(URGENCY_LEVELS.map((l) => [l, 0])) as Insights["urgencyDistribution"];
  for (const g of urgencyGroups) urgencyDistribution[asUrgency(g.urgencyLevel)] += g._count._all;

  const load = new Map<string, number>();
  for (const a of upcoming) load.set(a.department, (load.get(a.department) ?? 0) + 1);

  return {
    totals: {
      patients: patients.length,
      critical: outcomeDistribution.Critical,
      readmitted: outcomeDistribution.Readmitted,
      highRisk: patients.filter((p) => p.effectiveRiskScore >= 70).length,
      autoBookedAppointments: autoBooked,
      upcomingAppointments: upcoming.length,
      triageSessions,
    },
    weighted: summarizeMetrics(metrics),
    cohorts,
    outcomeDistribution,
    urgencyDistribution,
    departmentLoad: [...load].map(([department, count]) => ({ department, count })).sort((a, b) => b.count - a.count),
  };
}
