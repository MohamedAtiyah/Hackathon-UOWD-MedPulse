"use client";

import { TriangleAlert } from "lucide-react";

// Root error boundary: a failed DB read shows a retry card inside the layout (disclaimer stays visible).
export default function RootError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
      <TriangleAlert className="mx-auto size-8 text-red-600" aria-hidden />
      <h1 className="mt-3 text-lg font-semibold text-zinc-900">This view could not load</h1>
      <p className="mt-1 text-sm text-zinc-600">
        The clinical data service did not respond. No data was changed. If this persists, run{" "}
        <code className="rounded bg-zinc-100 px-1 font-mono text-xs">npm run db:push &amp;&amp; npm run db:seed</code>.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        Try again
      </button>
    </div>
  );
}
