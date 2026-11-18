# MedPulse AI — Update Plan for Claude Code (v2, reviewed against GitHub `Main` @ 3c467bd on 2026-11-18)

> **How to use:** open the repo in VS Code, start Claude Code, and say:
> *"Read MEDPULSE_UPDATE_PLAN.md and carry it out task by task. Stop and report after each task."*

You are working on **MedPulse AI** (Next.js 16.4.6, React 19.3, Prisma 6.19.3, Tailwind 4.3, zod 4,
`openai` 7.59.0 as the AI provider, rule-engine safety fallback).

> **AI provider decision: OpenAI.** The app's AI runs on the OpenAI Responses API (`src/lib/llm.ts`,
> `OPENAI_API_KEY`). Do not add Anthropic or any other provider. `CLAUDE.md` / `AGENTS.md` are coding-agent
> files and keep their names. The rule engine stays as the safety floor and fallback; **the demo runs with
> OpenAI switched on**, and we also prove it works with the key unset.

## What the review found (read this first)

Reviewed against GitHub `MohamedAtiyah/Hackathon-UOWD-Unnamed` @ `3c467bd` (branch `Main`). Verified facts:

| v1 assumption | Actual state |
|---|---|
| UI exists (`/agent`, `/insights`, `/patients/[id]`, `src/components/ui.tsx`) | ✅ Yes, Phases 0–3 are done (L1, A2, B3, C2, R1, R2, D2) |
| UI says "Claude-assisted" | It says **"LLM-assisted"** (`src/components/ui.tsx:67`, `src/app/agent/page.tsx:33`, `docs/DEMO.md` step 3). No Claude/Anthropic references anywhere except the `CLAUDE.md` filename |
| README has `ANTHROPIC_API_KEY` | No. README is already project-specific and says `OPENAI_API_KEY` |
| Bucket wording inconsistent | Consistent in `.env.example`, `CLAUDE.md`, `AGENTS.md`. Missing from README and DEMO.md (Task 2 adds it) |
| LLM timeout 5 s in docs | Already 15 s everywhere |
| `insights.test.ts` fails | 32/32 pass after `npx prisma generate`. `insights.test.ts` imports `db.ts` → `@prisma/client`, which needs a generated client; that was the earlier failure |
| Seed has SQLite-specific code | No. `deleteMany` children-first in one transaction; `createMany` works on Postgres |
| Search uses `contains` filters | None in `src/lib`. Task 5.3 is a check only |
| `OPENAI_API_KEY` set | `.env` has it **empty** |
| Toolchain healthy | On the iCloud Desktop folder `npm test` took ~190 s; quarantine flag removed. Move the repo off Desktop if it stays slow |
## Rules (from CLAUDE.md / AGENTS.md)

- TypeScript strict, no `any`. No new npm dependencies (Manrope via `next/font` is not a dependency).
- One Prisma client (`src/lib/db.ts`). JSON-in-String columns parsed only via `src/lib/json.ts`.
- The LLM may never lower a rule-derived urgency. Every feature must work with no `OPENAI_API_KEY`.
- Never print, log or commit secrets. `.env*` stays gitignored (`!.env.example` is already whitelisted).
- After **every** task run `npm run typecheck`, `npm run lint`, `npm test` and report output verbatim.
- One git commit per task. Do not push unless asked.
- `npm run db:reset` is blocked for AI agents (Prisma `--force-reset`). Use `npm run db:push && npm run db:seed`.
- Next 16 differs from older versions: check `node_modules/next/dist/docs/` before unfamiliar APIs.

---

## Task order

| # | Task | Why this order |
|---|---|---|
| 0 | Baseline | Know what's broken before changing anything |
| 1 | Provider wording → "OpenAI-assisted" | Small, visible to judges |
| 2 | Object-storage guidance in README | Tiny, docs only |
| 3 | Apply the brand identity | Self-contained, no backend risk |
| 4 | Move the DB to Neon Postgres | Risky infra change, so do it once the UI is stable |
| 5 | Wire Neon into code + deploy env | Depends on 4 |
| 5b | Confirm OpenAI is live | Needs the key; can run in parallel with 4–5 |
| 6 | Test and report | Final gate |

---

## Task 0 — Environment and baseline

1. Work in a git checkout of `origin/Main` (done for the Desktop folder on 2026-11-18).
2. `npm install`, `npx prisma generate`, `npm run db:push && npm run db:seed`.
3. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Report verbatim.

**Done when:** 32/32 tests pass and typecheck, lint and build are clean.

---

## Task 1 — Provider wording ("LLM-assisted" → "OpenAI-assisted")

- `src/components/ui.tsx` ~67: `"LLM-assisted (rules remain the safety floor)"` → `"OpenAI-assisted (rules remain the safety floor)"`.
- `src/app/agent/page.tsx` ~33: `"LLM-assisted · rules as safety floor"` → `"OpenAI-assisted · rules as safety floor"`.
- `docs/DEMO.md` step 3: same label change; keep the "Offline rule engine" wording.
- Bucket wording is already consistent; leave `riskBuckets` in `src/app/insights/page.tsx` alone (chart grouping).

Re-grep `grep -rniE "anthropic|claude" --exclude-dir=node_modules --exclude=package-lock.json .` and list what remains
(expected: `CLAUDE.md` filename, TASKS.md's mention of it, and this plan).

---

## Task 2 — Object storage section in README

Add "Object storage (optional)", ≤ 12 lines, plus a one-line pointer in `docs/DEMO.md`:
- Naming `<app>-<env>` → `medpulse-ai-dev`, `medpulse-ai-prod`; lowercase, hyphens, no personal names.
- Private by default; access via signed URLs only.
- Object keys never contain patient names/MRNs (e.g. `patients/<cuid>/<uuid>.pdf`).
- Separate bucket per environment; never point dev at prod.
- If uploads are ever added, use object storage (e.g. Vercel Blob, S3, R2, or Neon Object Storage), not DB columns.
- The current demo uploads nothing; the variable is reserved.

---

## Task 3 — Apply the brand identity to the existing UI

### Identity
- **Concept:** a calm clinical instrument that notices what you might miss. Logo = heartbeat line in a rounded teal square.
- **Voice:** plain, precise, reassuring. State what was found and why ("SpO2 88% < 90%"). Always "Clinical decision support, not a diagnosis".
- **Colour:** deeper brand teal (primary), cool-tinted slate neutrals. **Severity colours (red/orange/amber/emerald) are fixed**; teal never signals risk.
- **Type:** Manrope (headings + wordmark), Geist Sans (UI/body), Geist Mono + `tabular-nums` (MRN, ICD-10, vitals).
- **Shape:** cards 14px radius, 1px `slate-200` border, soft two-layer shadow; controls 8px; badges full pill.

### 3.1 Replace `src/app/globals.css`
Use the v1 stylesheet with these **corrections**:
- **Remove `border-radius: 0.25rem` from `:focus-visible`.** It reshapes every focused element (pill buttons become squared).
- **Drop the `@view-transition { navigation: auto }` block.** It only affects full page loads (cross-document), and Next `<Link>` navigation happens client-side, so it does nothing here.
- Use `@theme inline` only for the semantic aliases (`--color-brand`, `--color-ink`, …) that reference other variables. Put the raw ramps in plain `@theme`.
- The current file's `body { font-family: Arial … }` and dark-mode block must go (the new file replaces them).

```css
@import "tailwindcss";

/* MedPulse AI brand tokens (docs/BRAND.md). Ramps re-declared on Tailwind's own names so every
   teal-* / slate-* utility rebrands. Severity colours (red/orange/amber/emerald) are deliberately untouched. */
@theme {
  --color-teal-50: oklch(0.982 0.014 190);
  --color-teal-100: oklch(0.955 0.03 190);
  --color-teal-200: oklch(0.91 0.055 190);
  --color-teal-300: oklch(0.84 0.085 190);
  --color-teal-400: oklch(0.76 0.11 190);
  --color-teal-500: oklch(0.67 0.115 190);
  --color-teal-600: oklch(0.55 0.1 192);
  --color-teal-700: oklch(0.47 0.088 195);
  --color-teal-800: oklch(0.39 0.072 198);
  --color-teal-900: oklch(0.32 0.058 200);

  --color-slate-50: oklch(0.985 0.005 225);
  --color-slate-100: oklch(0.968 0.008 228);
  --color-slate-200: oklch(0.93 0.012 230);
  --color-slate-300: oklch(0.87 0.016 232);
  --color-slate-400: oklch(0.72 0.022 235);
  --color-slate-500: oklch(0.54 0.03 238);
  --color-slate-600: oklch(0.45 0.034 240);
  --color-slate-700: oklch(0.37 0.034 242);
  --color-slate-800: oklch(0.28 0.03 244);
  --color-slate-900: oklch(0.21 0.03 246);

  --radius-card: 0.875rem;
  --shadow-card: 0 1px 2px oklch(0.21 0.03 246 / 0.05), 0 4px 14px -6px oklch(0.21 0.03 246 / 0.1);
}

@theme inline {
  --color-brand: var(--color-teal-600);
  --color-brand-strong: var(--color-teal-700);
  --color-brand-soft: var(--color-teal-50);
  --color-ink: var(--color-slate-900);
  --color-ink-muted: var(--color-slate-600);
  --color-surface: var(--color-slate-50);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --font-display: var(--font-manrope), var(--font-geist-sans);
}

/* Clinical light theme only: severity colours must read the same on every screen. */
:root { color-scheme: light; }
html { -webkit-tap-highlight-color: transparent; }

h1, h2, h3 { font-family: var(--font-display); letter-spacing: -0.015em; text-wrap: balance; }
p, li { text-wrap: pretty; }

:focus-visible { outline: 2px solid var(--color-teal-600); outline-offset: 2px; }

.mp-card { container-type: inline-size; border-radius: var(--radius-card); box-shadow: var(--shadow-card); }

@keyframes mp-pulse-draw { from { stroke-dashoffset: 60; } to { stroke-dashoffset: 0; } }
.mp-pulse-line { stroke-dasharray: 60; animation: mp-pulse-draw 0.9s ease-out 0.15s both; }

@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

@media (forced-colors: active) { .mp-card { border: 1px solid CanvasText; } }
```

### 3.2 `src/components/brand.tsx`: `PulseMark`, unchanged from v1
```tsx
// MedPulse AI logo mark. Decorative SVG; the wordmark beside it carries the name.
export function PulseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <rect width="32" height="32" rx="9" fill="var(--color-teal-600)" />
      <path className="mp-pulse-line" d="M4 17h6l3-8 5 15 3-7h7" fill="none" stroke="#fff"
        strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

### 3.3 Favicon
Create `src/app/icon.svg` (v1 SVG, `fill="#00897f"` is the closest hex to teal-600) and **delete
`src/app/favicon.ico`** (it is the default Next.js icon; if both exist, browsers may keep showing the old one).
Also delete unused `public/{file,globe,next,vercel,window}.svg` once `page.tsx` no longer references them.

### 3.4 Edit `src/app/layout.tsx`
- `import { Geist, Geist_Mono, Manrope } from "next/font/google";` and
  `const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });`; add `${manrope.variable}` to `<html>`.
- Remove `HeartPulse` from the lucide import (keep `ShieldAlert`); import `PulseMark` from `@/components/brand`.
- Replace the `<span className="grid size-8 …"><HeartPulse …/></span>MedPulse <span…>AI</span>` block with:
  ```tsx
  <PulseMark className="size-8" />
  <span className="font-display text-lg font-extrabold tracking-tight">
    MedPulse <span className="text-teal-600">AI</span>
  </span>
  ```
- `<body>`: `bg-slate-50 text-slate-900` → `bg-surface text-ink`. Keep the amber disclaimer banner and footer.

### 3.5 Edit `src/components/ui.tsx` and pages
- `Card` (~103): `rounded-xl border border-slate-200 bg-white shadow-sm` → `mp-card border border-slate-200 bg-white`.
- `StatTile` (~128): `rounded-xl border border-slate-200 bg-white p-4 shadow-sm` → `mp-card border border-slate-200 bg-white p-4`.
- Patient rows in `src/app/page.tsx` (~44) use the same `rounded-xl … shadow-sm` pattern: swap to `mp-card` too (keep the severity left border).
- Do **not** change `SEVERITY_STYLES` or `OUTCOME_STYLES`.

### 3.6 Insights reflow
Use `@container` variants (`@sm:` / `@md:`) inside cards in `src/app/insights/page.tsx` / `charts.tsx` so charts reflow by card width.

### 3.7 `docs/BRAND.md`
Concept and voice; colour table (brand / brand-strong / brand-soft / ink / ink-muted / surface → token + oklch);
severity colours are separate and always paired with a label; type scale; shape and depth; logo usage (clear space =
half mark height, teal or white-on-teal only, wordmark "MedPulse" in ink + "AI" in teal-600); modern-CSS
practices applied; next candidates from 3.8.

### 3.8 Optional polish (only if time allows, one commit each)
- Flag explanations as Popover API tooltips with CSS anchor positioning inside `@supports (anchor-name: --x)`, inline fallback.
- Patient quick-view as native `<dialog>`.
- WCAG AA check (≥ 4.5:1), especially `slate-500` on `slate-50` and white on `teal-600`.

**Done when:** build passes; `npm run dev` shows logo (animates once), wordmark, Manrope headings, softer cards on
`/`, `/agent`, `/insights`, `/patients/[id]`; severity badges unchanged.

---

## Task 4 — Move the DB to Neon Postgres

> ⚠️ **Decision to confirm with me first:** after this change the app needs internet for its database. The
> "works offline" claim in CHALLENGE.md/DEMO.md then only means *works without an AI key*. Prisma can't
> switch providers by env var, so we can't keep SQLite as a fallback. Mitigations: record a backup screen
> video and reword "runs fully offline" in README/CHALLENGE/DEMO. Neon is still needed to deploy (Vercel can't host a SQLite file).

> The Neon MCP/plugin in this environment needs authorisation first (`/mcp` in an interactive session).
> Otherwise ask me to create the project in the Neon console and paste the strings into `.env` myself.
> **Never print or commit connection strings.**

1. Neon project `medpulse-ai`, region `aws-ap-southeast-1` (Singapore), Postgres 17 (Neon default). Branches `main` (demo/prod) and `dev`.
2. Per branch: **pooled** (`-pooler` host) → `DATABASE_URL`; **direct** → `DIRECT_URL`; both `?sslmode=require`.
3. `prisma/schema.prisma`: `provider = "postgresql"`, `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`.
   Update the header comment (currently "SQLite schema…"). **Keep JSON-as-String columns and String enums**; note native `Json`/enums as post-hackathon.
4. `.env.example`: replace the `file:./dev.db` line with
   ```bash
   # Neon Postgres. Pooled URL for the app, direct URL for Prisma schema changes.
   DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
   DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/neondb?sslmode=require"
   ```
5. `npx prisma generate && npm run db:push && npm run db:seed` against **dev**, then **main**.
6. Seed: already Postgres-safe (verified). Only fix if it actually fails.
7. Replace "SQLite" wording: `CHALLENGE.md` (stack line), `ARCHITECTURE.md` (layout comment, data-model note "SQLite has no enums", "reads live SQLite"),
   `CLAUDE.md`/`AGENTS.md` learnings (stack line, "short SQLite txn", `Env:` line adds `DIRECT_URL`), `src/lib/db.ts` comment
   ("exhausting SQLite connections" → "database connections"), README quickstart. `.gitignore` SQLite lines can stay.

**Done when:** seed succeeds on Neon dev; `npx prisma studio` shows 6 patients and 5 outcome metrics.

---

## Task 5 — Wire Neon into code and deploy env

1. `src/lib/db.ts`: comment only.
2. Add `"postinstall": "prisma generate"` to `package.json` scripts.
3. Case sensitivity: no `contains`/search filters exist today (verified). If Task 3 adds search, use `mode: "insensitive"`.
4. Dates: `booking.ts` and seed use JS `Date` → Postgres `timestamp(3)` in UTC. Confirm appointment times render the same as on SQLite (render with an explicit timezone in the UI to avoid server/client mismatch).
5. Deployment env list to give me (I set them; you don't): `DATABASE_URL` (pooled), `DIRECT_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `LLM_TIMEOUT_MS` (optional). All server-only, never `NEXT_PUBLIC_`.
6. Storage: no code. `STORAGE_BUCKET` stays reserved.

**Done when:** `npm run build` passes with Neon env set and `npm run dev` loads every page from Neon.

---

## Task 5b — Confirm OpenAI is live

1. `.env` currently has `OPENAI_API_KEY=` **empty**. Ask me to paste the organisers' key (never print it).
2. Keep `OPENAI_MODEL=gpt-4o-mini`. Ask before switching models; keep it env-only.
3. Already verified: `openai@7.59.0` ships `openai/helpers/zod` and `responses.parse`. Still to do: a real call
   returns parsed output for triage and SOAP (`src/lib/triage.ts`, `src/lib/soap.ts`). Note zod 4 is installed;
   if `zodTextFormat` rejects a schema, report the error class, don't loosen the safety merge.
4. `llm.ts` already logs fallbacks (`[llm] falling back to rules: <ErrorName>`). Add one success line
   `[llm] ok <model> <ms>ms`: no prompt content, no key. Optionally log once when no key is set.
5. Keep `LLM_TIMEOUT_MS=15000` unless venue Wi-Fi times out.

**Done when:** a Triage Studio run shows "OpenAI-assisted" and the server log shows `[llm] ok`.

---

## Task 6 — Test and report

1. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Paste results.
2. Manual pass on Neon-backed `npm run dev`, following `docs/DEMO.md`:
   - `/`: patients ranked by risk (Harold Brennan top, score 94); severity badge colours + labels correct.
   - `/patients/[id]`: flags show rule + triggering value; Priya Raman shows the imaging flag.
   - `/agent`: all four scenarios **with the key set**, then once with it unset; Okafor → CRITICAL / Cardiology / Dr. Marcus Chen +30 min;
     Alvarez → LOW / Primary Care / Dr. Grace Mensah +7 d. OpenAI never lowers urgency; label switches "OpenAI-assisted" ↔ "Offline rule engine".
   - `/insights`: COPD readmission 22.7% highest, ACS/PCI recovery 94.1% best.
   - A triage run writes TriageSession, SoapNote, Appointment rows in Neon (check Prisma Studio). Re-seed afterwards (`npm run db:seed`).
3. Brand: logo animates once; reduced-motion disables it; Tab shows the teal focus ring; favicon shows.
4. Lighthouse (Performance, Accessibility, Best Practices) on `/` and `/insights` against `npm run build && npm start`, not dev. List scores < 90 with top fixes; watch LCP, CLS, INP.
5. Report in chat and update `TASKS.md`: passed, failed, left, live-demo risks (Wi-Fi now needed for the DB and for OpenAI; backup video).

---

## Final deliverable checklist
- [ ] Task 0 baseline green
- [ ] Labels say "OpenAI-assisted"; no stale provider refs
- [ ] Object-storage guidance in README
- [ ] Brand identity applied + `docs/BRAND.md`
- [ ] Offline-trade-off decision confirmed; Prisma on Neon (pooled + direct), seeded dev + main
- [ ] OpenAI confirmed live (badge + `[llm] ok` log); key only in env
- [ ] `postinstall` prisma generate; build passes
- [ ] Typecheck, lint, tests pass; manual demo pass done
- [ ] Lighthouse results + final report; `TASKS.md` updated
