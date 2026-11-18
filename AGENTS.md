<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

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
