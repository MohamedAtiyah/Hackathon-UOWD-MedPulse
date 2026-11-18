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
- Next 16 cacheComponents + partialPrefetching ON: dynamic data/URL hooks must be inside Suspense; root loading.tsx provides it
- Team repo default branch is 'Main' (capital); local main tracks origin/Main; push with git push (upstream set)
- Playwright artifacts go in .playwright-mcp/ (gitignored)
- Reseed after any smoke/browser test: npx prisma db seed
- Commit messages end with Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

### Key Decisions
- Decision: root src/app/loading.tsx + Suspense around NavLinks — Reason: next.config.ts has cacheComponents: true (scaffold default); runtime/DB data and usePathname must be inside Suspense or prerender fails
- Decision: every page calls await connection() then lib functions directly (no fetch to /api) — Reason: per-request SQLite reads; Server Components
- Decision: agent step order risk → triage → SOAP → booking → persist with user's stage names — Reason: matches demo narrative while staying truthful (risk floor must precede triage)
- Decision: AgentResult.patientAfter added — Reason: UI shows updated patient risk immediately after run
- Decision: light clinical theme only — Reason: severity colours must read consistently
- Decision: shared UI in src/components/ui.tsx owned by lead; builders own only their route folders — Reason: single-file ownership
- Decision: displayed urgency = maxLevel(risk.level, scoreLevel(effectiveRiskScore)); scoreLevel bands ≥70 CRITICAL, ≥40 HIGH, ≥20 MODERATE

<!-- handoff:learnings:end -->
