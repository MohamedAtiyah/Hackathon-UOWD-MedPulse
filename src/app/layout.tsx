import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { HeartPulse, ShieldAlert } from "lucide-react";
import { NavLinks, NavList } from "@/components/nav-links";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "MedPulse AI", template: "%s · MedPulse AI" },
  description: "Clinical command centre: diagnostic risk flagging, agentic triage with SOAP notes, and outcome insights.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col text-zinc-900">
        <div role="note" className="border-b border-amber-200/70 bg-amber-50/80 px-4 py-1.5 text-center text-xs leading-relaxed text-amber-900">
          <ShieldAlert className="mr-1.5 inline size-3.5 -tranzinc-y-px" aria-hidden />
          <strong className="font-semibold">Clinical decision support, not a diagnosis.</strong> All patients are
          synthetic. Every flag, triage level and SOAP draft requires clinician review.
        </div>
        <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-zinc-900">
              <span className="grid size-8 place-items-center rounded-lg bg-teal-600 text-white shadow-sm ring-1 ring-inset ring-white/20">
                <HeartPulse className="size-5" aria-hidden />
              </span>
              MedPulse <span className="text-teal-600">AI</span>
              <span className="relative ml-0.5 flex size-2" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
            </Link>
            <Suspense fallback={<NavList pathname={null} />}>
              <NavLinks />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        <footer className="border-t border-zinc-200/80 bg-white px-4 py-4 text-center text-xs leading-relaxed text-zinc-600">
          MedPulse AI · rule engine is the safety floor; the LLM (when configured) can escalate but never downgrade urgency.
        </footer>
      </body>
    </html>
  );
}
