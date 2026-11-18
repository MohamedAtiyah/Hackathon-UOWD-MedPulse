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
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <div role="note" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
          <ShieldAlert className="mr-1.5 inline size-3.5 -translate-y-px" aria-hidden />
          <strong className="font-semibold">Clinical decision support, not a diagnosis.</strong> All patients are
          synthetic. Every flag, triage level and SOAP draft requires clinician review.
        </div>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-8 place-items-center rounded-lg bg-teal-600 text-white">
                <HeartPulse className="size-5" aria-hidden />
              </span>
              MedPulse <span className="text-teal-600">AI</span>
            </Link>
            <Suspense fallback={<NavList pathname={null} />}>
              <NavLinks />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500">
          MedPulse AI · rule engine is the safety floor; the LLM (when configured) can escalate but never downgrade urgency.
        </footer>
      </body>
    </html>
  );
}
