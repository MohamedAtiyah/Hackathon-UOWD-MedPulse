<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- handoff:learnings:begin -->
## Session Learnings (auto-updated by handoff)

### Implicit Rules
- Push: git push origin main:Main (plain git push refused; remote default branch capital Main)
- Next 16 error.tsx receives { error, retry } (not reset)
- Smoke test against prod: npm run build then npx next start -p 3100; kill with pkill -f 'next start -p 3100' (exit 144 expected)
- Reseed after any smoke/browser test: npx prisma db seed (seed wipes + recreates; baseline 6 patients/3 sessions/4 SOAP/5 appts)
- No ANTHROPIC_API_KEY in .env; offline rule engine is the demo path
- Playwright artifacts go in .playwright-mcp/ (gitignored)
- Commit messages end with Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

### Key Decisions
- Decision: negation span ends at 'and' — Reason: under-triage of positive after negated item is worse than over-triage of 'denies X and Y'
- Decision: respiratory CRITICAL cue accepts can't|cannot|unable to + breathe/speak/finish sentences, blue lips variants — Reason: plain-language breathing failure triaged LOW
- Decision: mobile nav = 3-col grid with icon over label (sm: flex row) — Reason: removes 375px horizontal scroll without hiding labels
- Decision: root src/app/error.tsx retry card — Reason: DB failure keeps layout + disclaimer, clear UI feedback
- Decision: agent concurrency race not fixed — Reason: single-user demo load; would need re-read inside transaction
- Decision: demo script leads with Acute Sepsis Escalation (Brennan) — Reason: only preset showing visible risk escalation 94→100; Okafor already 88

<!-- handoff:learnings:end -->
