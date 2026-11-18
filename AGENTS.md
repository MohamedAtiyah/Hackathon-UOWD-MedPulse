<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

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
