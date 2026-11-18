// Pure Tailwind bar charts (server components). All scales start at 0; every bar has a numeric label.
import type { ReactNode } from "react";

const pct = (v: number, max: number) => (max > 0 ? Math.min(100, Math.max(0, (v / max) * 100)) : 0);

export function Empty({ children = "No data yet" }: { children?: ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-500">{children}</p>;
}

/** Horizontal bars on a 0..max scale. `bar` is a Tailwind bg class. */
export function HBar({
  rows,
  max,
  unit = "",
}: {
  rows: { label: string; value: number; bar: string }[];
  max?: number;
  unit?: string;
}) {
  if (!rows.length) return <Empty />;
  const top = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,8rem)_1fr_3rem] items-center gap-2 text-sm sm:grid-cols-[minmax(0,10rem)_1fr_3rem]">
          <span className="truncate text-slate-700" title={r.label}>{r.label}</span>
          <div className="h-3 rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${r.bar}`} style={{ width: `${pct(r.value, top)}%` }} />
          </div>
          <span className="text-right font-semibold tabular-nums text-slate-900">{r.value}{unit}</span>
        </li>
      ))}
    </ul>
  );
}

/** 100% stacked bar with a legend carrying counts and percentages. */
export function StackedBar({ parts, label }: { parts: { label: string; value: number; bar: string }[]; label: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (!total) return <Empty />;
  return (
    <div>
      <div role="img" aria-label={`${label}: ${parts.map((p) => `${p.label} ${p.value}`).join(", ")}`} className="flex h-6 overflow-hidden rounded-full bg-slate-100">
        {parts.filter((p) => p.value > 0).map((p) => (
          <div key={p.label} className={`${p.bar} flex items-center justify-center text-[11px] font-semibold text-white`} style={{ width: `${pct(p.value, total)}%` }}>
            {p.value}
          </div>
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2">
            <span className={`size-2.5 rounded-sm ${p.bar}`} aria-hidden />
            <span className="text-slate-700">{p.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-slate-900">{p.value} <span className="font-normal text-slate-500">({Math.round(pct(p.value, total))}%)</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Vertical bars from a zero baseline. */
export function ColumnChart({ cols, unit = "", bar }: { cols: { label: string; value: number }[]; unit?: string; bar: string }) {
  if (!cols.length) return <Empty />;
  const top = Math.max(...cols.map((c) => c.value), 1);
  return (
    <div role="img" aria-label={cols.map((c) => `${c.label} ${c.value}${unit}`).join(", ")} className="flex items-end gap-2">
      {cols.map((c) => (
        <div key={c.label} className="flex min-w-0 flex-1 flex-col items-center">
          <span className="text-xs font-semibold tabular-nums text-slate-900">{c.value}{unit}</span>
          <div className="flex h-32 w-full items-end border-b border-slate-300">
            <div className={`w-full rounded-t ${bar}`} style={{ height: `${pct(c.value, top)}%` }} />
          </div>
          <span className="mt-1 line-clamp-2 break-words text-center text-[11px] leading-tight text-slate-600">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

const TIER_PILL = {
  high: "bg-red-50 text-red-700 ring-red-600/20",
  elevated: "bg-amber-50 text-amber-800 ring-amber-600/20",
  low: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
} as const;

export function TierPill({ tier }: { tier: keyof typeof TIER_PILL }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${TIER_PILL[tier]}`}>
      {tier} readmission
    </span>
  );
}

/** One track on a shared 0-100% axis with a dashed weighted-average marker. */
function Track({ value, avg, bar, name }: { value: number; avg: number; bar: string; name: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-4 flex-1 rounded bg-slate-100">
        <div className={`h-full rounded ${bar}`} style={{ width: `${pct(value, 100)}%` }} />
        <div className="absolute inset-y-[-3px] border-l-2 border-dashed border-slate-500" style={{ left: `${pct(avg, 100)}%` }} aria-hidden />
      </div>
      <span className="w-14 text-right text-sm font-semibold tabular-nums text-slate-900">
        {value}%<span className="sr-only"> {name}; weighted average {avg}%</span>
      </span>
    </div>
  );
}

export function ProtocolChart({
  rows,
  avgRecovery,
  avgReadmission,
}: {
  rows: { name: string; protocol: string; n: number; recovery: number; readmission: number; tier: keyof typeof TIER_PILL }[];
  avgRecovery: number;
  avgReadmission: number;
}) {
  if (!rows.length) return <Empty />;
  return (
    <div>
      <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-teal-600" aria-hidden />Recovery rate</li>
        <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-orange-500" aria-hidden />30-day readmission</li>
        <li className="flex items-center gap-1.5"><span className="h-3 border-l-2 border-dashed border-slate-500" aria-hidden />Weighted average (recovery {avgRecovery}%, readmission {avgReadmission}%)</li>
      </ul>
      <ul className="space-y-5">
        {rows.map((r) => (
          <li key={r.name} className="grid gap-2 lg:grid-cols-[14rem_1fr] lg:gap-4">
            <div>
              <p className="font-medium text-slate-900">{r.name}</p>
              <p className="text-xs text-slate-500">{r.protocol} · n={r.n}</p>
              <div className="mt-1"><TierPill tier={r.tier} /></div>
            </div>
            <div className="space-y-1.5">
              <Track value={r.recovery} avg={avgRecovery} bar="bg-teal-600" name="recovery" />
              <Track value={r.readmission} avg={avgReadmission} bar="bg-orange-500" name="readmission" />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-between text-[11px] text-slate-400 lg:ml-[14.5rem] lg:mr-16" aria-hidden>
        <span>0%</span><span>50%</span><span>100%</span>
      </div>
    </div>
  );
}
