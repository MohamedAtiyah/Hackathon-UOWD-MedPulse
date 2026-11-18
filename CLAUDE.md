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
- Push: git push origin main:Main; remote default branch Main; do not create lowercase main
- Command Centre score = effectiveRiskScore = max(stored riskScore, live evaluateRisk score)
- Reseed after any rehearsal/smoke: npm run db:seed (pristine 6 patients/3 sessions/4 SOAP/5 appts)
- No ANTHROPIC_API_KEY in .env; demo runs on offline rule engine
- Commit messages end with Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

### Key Decisions
- Decision: skip pushing origin main (lowercase) — Reason: case-insensitive filesystems collide refs main/Main, breaking fetch for team; default branch Main already serves judges
- Decision: no seed changes during freeze — Reason: Brennan displayed score derives from vitals (100); lowering stored score would not change Command Centre display and alters clinical story
- Decision: Kenji Watanabe typed ECG beat as optional visible escalation — Reason: largest on-screen jump 24 LOW → 70 CRITICAL, also reranks Command Centre
- Decision: DEMO.md says risk bar 100 / rules 100 · stored 94 for Brennan — Reason: presenter must say what screen shows

<!-- handoff:learnings:end -->
