// Shared presentational components (L1, lead-owned). Server-safe: no hooks, no client state.
import type { ReactNode } from "react";
import type { DecisionSource, OutcomeStatus, RiskFlag, UrgencyLevel, Vitals } from "@/lib/types";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

// ── Severity ────────────────────────────────────────────────────────────────
export const SEVERITY_STYLES: Record<UrgencyLevel, { badge: string; dot: string; bar: string; text: string }> = {
  CRITICAL: { badge: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500", bar: "bg-red-500", text: "text-red-700" },
  HIGH: { badge: "bg-orange-50 text-orange-700 ring-orange-600/20", dot: "bg-orange-500", bar: "bg-orange-500", text: "text-orange-700" },
  MODERATE: { badge: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-400", bar: "bg-amber-400", text: "text-amber-800" },
  LOW: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500", bar: "bg-emerald-500", text: "text-emerald-700" },
};

/** Map a 0-100 score to the severity band used for colouring. */
export const scoreLevel = (score: number): UrgencyLevel =>
  score >= 70 ? "CRITICAL" : score >= 40 ? "HIGH" : score >= 20 ? "MODERATE" : "LOW";

export function SeverityBadge({ level, className }: { level: UrgencyLevel; className?: string }) {
  const s = SEVERITY_STYLES[level];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ring-1 ring-inset", s.badge, className)}>
      <span className={cx("size-1.5 rounded-full", s.dot)} aria-hidden />
      {level}
    </span>
  );
}

export function RiskScoreBar({ score, className }: { score: number; className?: string }) {
  const s = SEVERITY_STYLES[scoreLevel(score)];
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 ring-1 ring-inset ring-zinc-200/60"
        role="meter"
        aria-label="Risk score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <div className={cx("h-full rounded-full transition-[width] duration-500 ease-out", s.bar)} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
      <span className={cx("w-8 text-right text-sm font-semibold tabular-nums", s.text)}>{score}</span>
    </div>
  );
}

// ── Status / source ─────────────────────────────────────────────────────────
const OUTCOME_STYLES: Record<OutcomeStatus, string> = {
  Critical: "bg-red-50 text-red-700 ring-red-600/20",
  Readmitted: "bg-purple-50 text-purple-700 ring-purple-600/20",
  Stable: "bg-sky-50 text-sky-700 ring-sky-600/20",
  Improving: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export function OutcomeBadge({ status }: { status: OutcomeStatus }) {
  return (
    <span className={cx("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", OUTCOME_STYLES[status])}>
      {status}
    </span>
  );
}

export function SourceBadge({ source }: { source: DecisionSource }) {
  return (
    <span
      title={source === "llm" ? "LLM-assisted (rules remain the safety floor)" : "Deterministic rule engine"}
      className={cx(
        "inline-flex rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        source === "llm" ? "bg-violet-50 text-violet-700 ring-violet-600/20" : "bg-zinc-50 text-zinc-600 ring-zinc-500/20",
      )}
    >
      {source === "llm" ? "LLM" : "Rules"}
    </span>
  );
}

// ── Layout primitives ───────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[28px] sm:leading-9">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-600">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-xl border border-zinc-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-md", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 rounded-t-xl border-b border-zinc-200/70 bg-zinc-50/60 px-5 py-3">
          {title && <h2 className="text-sm font-semibold tracking-tight text-zinc-900">{title}</h2>}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "slate" | "red" | "orange" | "teal" | "purple";
}) {
  const toneText = { slate: "text-zinc-900", red: "text-red-600", orange: "text-orange-600", teal: "text-teal-700", purple: "text-purple-700" }[tone];
  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-md">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">{label}</p>
      <p className={cx("mt-1.5 text-3xl font-semibold tracking-tight tabular-nums", toneText)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-600">{hint}</p>}
    </div>
  );
}

// ── Clinical readouts ───────────────────────────────────────────────────────
type VitalKey = "hr" | "bp" | "spo2" | "temp" | "wbc" | "lactate";

// Display-only highlight thresholds (the risk engine in src/lib/risk.ts is the source of truth for flags).
const VITAL_DEFS: { key: VitalKey; label: string; unit: string; value: (v: Vitals) => string | null; abnormal: (v: Vitals) => boolean }[] = [
  { key: "hr", label: "HR", unit: "bpm", value: (v) => num(v.hr), abnormal: (v) => out(v.hr, 50, 100) },
  {
    key: "bp",
    label: "BP",
    unit: "mmHg",
    value: (v) => (v.sbp != null ? `${v.sbp}/${v.dbp ?? "–"}` : null),
    abnormal: (v) => out(v.sbp, 90, 179) || (v.dbp != null && v.dbp >= 120),
  },
  { key: "spo2", label: "SpO₂", unit: "%", value: (v) => num(v.spo2), abnormal: (v) => v.spo2 != null && v.spo2 < 92 },
  { key: "temp", label: "Temp", unit: "°C", value: (v) => num(v.temp), abnormal: (v) => out(v.temp, 36, 38.3) },
  { key: "wbc", label: "WBC", unit: "×10⁹/L", value: (v) => num(v.wbc), abnormal: (v) => out(v.wbc, 4, 12) },
  { key: "lactate", label: "Lactate", unit: "mmol/L", value: (v) => num(v.lactate), abnormal: (v) => v.lactate != null && v.lactate >= 2 },
];
function num(n: number | undefined) {
  return n == null ? null : String(n);
}
function out(n: number | undefined, lo: number, hi: number) {
  return n != null && (n < lo || n > hi);
}

export function VitalsGrid({ vitals, compact = false }: { vitals: Vitals; compact?: boolean }) {
  return (
    <dl className={cx("grid gap-2", compact ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6")}>
      {VITAL_DEFS.map((d) => {
        const value = d.value(vitals);
        const bad = value != null && d.abnormal(vitals);
        return (
          <div
            key={d.key}
            className={cx(
              "rounded-lg border px-2.5 py-1.5",
              bad ? "border-red-200 bg-red-50" : "border-zinc-200/80 bg-zinc-50/70",
            )}
          >
            <dt className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">{d.label}</dt>
            <dd className={cx("font-semibold tabular-nums", compact ? "text-sm" : "text-lg", bad ? "text-red-700" : "text-zinc-900")}>
              {value ?? "—"}
              {!compact && value != null && <span className="ml-1 text-xs font-normal text-zinc-600">{d.unit}</span>}
              {bad && <span className="sr-only"> (abnormal)</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function RiskFlagList({ flags, empty = "No rule-based red flags." }: { flags: RiskFlag[]; empty?: string }) {
  if (!flags.length) return <p className="text-sm text-zinc-600">{empty}</p>;
  return (
    <ul className="space-y-2">
      {flags.map((f, i) => (
        <li key={`${f.category}-${f.label}-${i}`} className="flex items-start gap-3">
          <SeverityBadge level={f.severity} className="mt-0.5 shrink-0" />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-zinc-900">
              {f.label} <span className="font-mono text-[10px] font-normal uppercase text-zinc-500">{f.category}</span>
            </p>
            <p className="text-zinc-600">{f.reason}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Formatting ──────────────────────────────────────────────────────────────
/** Fixed locale + UTC so server and client render identical strings (no hydration mismatch). */
export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso)) + " UTC";
