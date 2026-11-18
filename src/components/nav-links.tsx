"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bot, ChartColumn } from "lucide-react";

const LINKS = [
  { href: "/", label: "Command Centre", icon: Activity },
  { href: "/agent", label: "Triage Studio", icon: Bot },
  { href: "/insights", label: "Outcomes Insights", icon: ChartColumn },
] as const;

/** Active link from the URL. Must sit inside <Suspense> (cacheComponents: dynamic routes have unknown params at build). */
export function NavLinks() {
  return <NavList pathname={usePathname()} />;
}

/** Same links with no active state: the prerendered Suspense fallback. */
export function NavList({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Primary" className="grid w-full grid-cols-3 gap-1 sm:flex sm:w-auto">
      {LINKS.map(({ href, label, icon: Icon }) => {
        // Patient detail pages live under the Command Centre.
        const active =
          pathname != null && (href === "/" ? pathname === "/" || pathname.startsWith("/patients") : pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs font-medium transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:text-sm ${
              active ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
