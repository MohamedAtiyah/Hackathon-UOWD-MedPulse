# TASKS: 120-Minute Build Plan

Tiers: **O** = Opus · **S** = Sonnet · **H** = Haiku. One owner per file. `∥` = can run in parallel.

## Phase 0: Foundation (T+0 → T+20) ✅

- [x] Governance docs: CLAUDE.md, CHALLENGE.md, ARCHITECTURE.md, TASKS.md (O)
- [x] Next.js 16 + TS + Tailwind 4 scaffold; lucide-react, prisma@6, @prisma/client@6, tsx (O)
- [x] `prisma/schema.prisma` + `db push` (O)
- [x] `prisma/seed.ts`: 6 patients, 3 triage sessions, 4 SOAP notes, 5 auto-booked appointments, 5 metrics (O)
- [x] **Gate G0:** db push + seed + typecheck + build all green. **Schema frozen.**

## Phase 1: Core logic (T+20 → T+50), all ∥ ✅

| ID | Task | Tier | Time | Owner | Depends |
|----|------|------|------|-------|---------|
| ✅ T0 | Shared types + `parseJson` | O | 5m | `src/lib/types.ts`, `src/lib/json.ts` | G0 |
| ✅ A1 | Risk engine (thresholds in ARCHITECTURE.md) + assert self-check | S | 20m | `src/lib/risk.ts` | T0 |
| ✅ B1 | Triage rules + SOAP/ICD-10 templates + optional LLM | S | 30m | `src/lib/triage.ts`, `soap.ts`, `llm.ts` | T0 |
| ✅ C1 | Insights aggregates | S | 20m | `src/lib/insights.ts` | T0 |
| ✅ D1 | Demo script draft | H | 15m | `docs/DEMO.md` | none |

**T+50 checkpoint:** ✅ `AgentResult` shape frozen in `types.ts`.

Phase 1 extras (lead): `src/lib/views.ts` row mappers, `src/lib/llm.ts` (OpenAI SDK + zod structured output, approved deps), `src/lib/text.ts` negation stripping (fixes the "no wheeze" → HIGH bug found in the smoke test). `npm test`: 32/32.

## Phase 2: API + UI (T+50 → T+85), all ∥ ✅

| ID | Task | Tier | Time | Owner | Depends |
|----|------|------|------|-------|---------|
| ✅ B2 | `runAgent` + `booking.ts` + `POST /api/agent` (validate: non-empty, ≤4k chars) | S | 20m | `src/lib/agent.ts`, `src/app/api/agent/` | B1 |
| ✅ P | Patients + insights services; `GET/POST /api/patients`, `GET /api/patients/[id]`, `GET /api/insights` | S | 20m | `src/lib/patients.ts`, `src/lib/insights.ts`, `src/app/api/patients/`, `src/app/api/insights/` | A1 |
| ✅ B3 | Agent UI: textarea + step-trace timeline + SOAP card | S | 20m | `src/app/agent/` | AgentResult frozen |
| ✅ A2 | Command centre + patient detail with risk badges | S | 25m | `src/app/page.tsx`, `src/app/patients/` | A1 |
| ✅ C2 | Insights dashboard (Tailwind/SVG bars) | S | 25m | `src/app/insights/` | C1 |
| ✅ L1 | Nav + layout + disclaimer banner | H | 10m | `src/app/layout.tsx` | none |

Phase 2 notes (lead): L1 shell built first (`layout.tsx`, `loading.tsx`, `components/nav-links.tsx`, `components/ui.tsx`), then A2/B3/C2 by parallel Sonnet builders with one owner per route folder. `cacheComponents` is on: pages `await connection()` behind the root `loading.tsx` Suspense boundary; nav `usePathname` is Suspense-wrapped. Agent trace relabelled to the 4 demo stages + persist; `AgentResult.patientAfter` added. Verified in a browser at 1440px and 375px.

## Phase 3: Integrate + review (T+85 → T+105) ✅

- [x] R1 Opus review (read-only): no-key fallback, error states, LLM-can't-downgrade, disclaimer, input validation. Owners apply the fixes.
- [x] R2 E2E smoke: `db:reset`, then patients, then agent books an appointment, then insights. Fix blockers only. (S)

Phase 3 notes (lead): R1 fixed two under-triage bugs. "I cannot breathe" / "unable to breathe" were LOW: the cue now accepts cannot/unable to, and blue lips. "No fever and crushing chest pain…" was LOW because the negation scope swallowed the positive: "and" now ends a negated span. Both have regression tests (34/34). Also: nav is a 3-column grid at 375px (no horizontal scroll), the Triage Studio clears the old result on a new run, and a root `error.tsx` shows a retry card inside the layout. R2: production build on :3100; 4 pages + 4 API routes return 200 (unknown patient API 404); validation 400s; all 4 presets run, persist and escalate (Brennan 94 → 100); no console errors; DB reseeded. D2: `docs/DEMO.md` is a 2-minute click-by-click script mapped to the 3 track requirements; `README.md` rewritten for judges.

## 🧊 DEMO FREEZE (T+105)

- [ ] No new features. Crash fixes only, each with Opus sign-off.
- [ ] `npm run db:reset`; confirm the demo works with `OPENAI_API_KEY` unset.

## Phase 4: Rehearse (T+105 → T+120)

- [x] D2 Final `docs/DEMO.md` with 2 canned inputs: urgent (chest pain) and routine (asthma refill). (H)
- [ ] Rehearse twice; make a screen-recording backup.

**Critical path:** G0 → T0 → B1 → B2 → B3 → R2 → freeze. The agent pipeline is the riskiest part, so start it first.
