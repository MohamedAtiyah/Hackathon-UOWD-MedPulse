@AGENTS.md

# MedPulse AI: Agent Governance

Project context: [CHALLENGE.md](CHALLENGE.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [TASKS.md](TASKS.md)

## Model hierarchy (Opus → Sonnet → Haiku)

| Tier | Owns | Never does |
|------|------|-----------|
| **Opus** (lead) | Architecture, `prisma/schema.prisma`, cross-module interfaces (`src/lib/types.ts`), code review, merge decisions, demo-freeze sign-off | Bulk UI work |
| **Sonnet** (builders) | Feature modules in `src/lib/*` and `src/app/*`, API routes, risk/triage rules | Schema changes, editing files it doesn't own |
| **Haiku** (support) | Docs, demo script, copy, seed data text, mechanical renames | Logic in `src/lib/*`, API routes |

Escalate up a tier when a task touches an interface, the schema, or clinical-safety logic.

## Subagent rules

- **Single-file ownership.** Every file has exactly one owner per phase (see the owner column in TASKS.md). Do not edit a file you don't own. To change another owner's file, report the needed change to the lead.
- **Schema is frozen** after Gate G0. Only Opus edits `prisma/schema.prisma`, and every edit is followed by `npm run db:reset`.
- Shared types live in `src/lib/types.ts` (Opus-owned). Builders import from there instead of redeclaring them.
- Before handing back, run `npm run typecheck` and report the result verbatim.

## Code rules

- TypeScript strict, no `any`. Validate untrusted input (request bodies, LLM output) at the boundary before use.
- Modular: one concern per file in `src/lib/`. Keep business logic pure and out of components and route handlers so it stays testable. Route handlers only do validation → lib call → response.
- Use the single Prisma client from `src/lib/db.ts`. Never `new PrismaClient()` in app code.
- JSON-in-String columns (`vitalsJson`, `flaggedConditions`, `icd10Codes`, …) are parsed only through one helper. Never `JSON.parse` inline in components.
- Server Components by default. Add `"use client"` only for interactivity.
- Tailwind for styling; icons from `lucide-react`. No new dependencies without lead approval.
- Next.js 16 differs from older versions. Check `node_modules/next/dist/docs/` before using an unfamiliar API.

## Secrets & safety

- **Zero hardcoded secrets.** Keys come only from `process.env` and are documented in `.env.example`. `.env*` is gitignored. Never log env values.
- The LLM is optional: with no `ANTHROPIC_API_KEY` set, every feature must still work through rule-based fallbacks.
- The LLM may never *lower* a rule-derived urgency level.
- All data is synthetic. Every clinical screen shows "Clinical decision support, not a diagnosis".

## Commands

```bash
npm run dev          # http://localhost:3000
npm run db:reset     # wipe + push schema + reseed demo data (human-only: Prisma blocks --force-reset for AI agents)
npm run db:push && npm run db:seed   # agent-safe: additive schema sync + idempotent reseed
npm run typecheck    # tsc --noEmit
npm test             # node:test unit tests (src/lib/*.test.ts)
npm run build
```

<!-- handoff:learnings:begin -->
## Session Learnings (auto-updated by handoff)

### Implicit Rules
- Stack: Next.js 16.4.6, React 19.3, Tailwind 4, TS strict, Prisma 6.19.3 SQLite, zod 4, @anthropic-ai/sdk 1.x, tsx tests via node:test
- Inside src/lib import siblings relatively ('./types') so tsx tests resolve; src/app uses '@/lib/...'
- Route handlers thin: req.json try/catch → zod parse → lib → Response.json; errors { error } 400/404/500
- Env: DATABASE_URL required; ANTHROPIC_API_KEY optional; ANTHROPIC_MODEL, LLM_TIMEOUT_MS optional
- Reset demo data: npx prisma db seed (idempotent); smoke tests mutate DB so reseed after
- Every keyword matcher must call stripNegated first

### Key Decisions
- Decision: added deps @anthropic-ai/sdk ^1.10 + zod ^4.6 (lead-approved) — Reason: claude-api skill mandates official SDK over raw fetch in TS; zod gives structured-output schemas via betaZodOutputFormat and API body validation
- Decision: llm.ts uses client.beta.messages.parse, model env ANTHROPIC_MODEL default claude-opus-5-5, effort low, timeout LLM_TIMEOUT_MS default 15s, maxRetries 0, server-side fallbacks 'default' (beta server-side-fallback-2026-07-01); returns null on no key/error/refusal/max_tokens — Reason: offline demo + rule fallback, never block pipeline
- Decision: LLM zod schemas have no min/max constraints — Reason: structured outputs reject some JSON-schema constraints; enforce after parse
- Decision: risk score = per-category worst weight (CRITICAL 70/HIGH 40/MOD 20/LOW 5), top + 0.5×others, cap 100 — Reason: single CRITICAL ≥ 70 = high risk; avoid double counting within category
- Decision: evaluateRisk(vitals, findings) scans stored flaggedConditions + transcript text — Reason: ECG/troponin/imaging findings not in vitals still flag
- Decision: mergeTriage level = maxLevel(rule, llm); dept from LLM only if LLM strictly higher — Reason: LLM can escalate, never downgrade
- Decision: agent runs LLM calls before one interactive $transaction writing TriageSession+Appointment+SoapNote (linked triageSessionId) + patient update (riskScore max, flags union, outcomeStatus Critical if CRITICAL) — Reason: short SQLite txn, audit trail
- Decision: booking offsets CRITICAL +30m Confirmed, HIGH +2h Confirmed, MODERATE +1d, LOW +7d Scheduled, rounded up to :15; roster reuses seed doctor names — Reason: deterministic demo
- Decision: patientId required for /api/agent; new patients via POST /api/patients (risk engine scores on intake) — Reason: TriageSession.patientId non-null; two persisting demo actions
- Decision: shared views.ts mappers + text.ts stripNegated owned by lead — Reason: prevent concurrent edits; one fix point for negation
- Decision: no /api/triage,/api/soap,/api/appointments separate routes — Reason: /api/agent does all three atomically; ARCHITECTURE.md lists actual routes

<!-- handoff:learnings:end -->
