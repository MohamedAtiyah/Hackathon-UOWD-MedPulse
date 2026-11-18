// Root Suspense fallback. Required by cacheComponents: every page reads live SQLite after
// `await connection()`, so its content streams in behind this prerendered skeleton.
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-6">
      <span className="sr-only">Loading clinical data…</span>
      <div className="h-8 w-64 rounded-lg bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200" />
        ))}
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-28 rounded-xl bg-slate-200" />
      ))}
    </div>
  );
}
