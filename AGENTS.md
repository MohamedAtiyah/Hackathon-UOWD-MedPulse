<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

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
