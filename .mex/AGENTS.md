---
name: agents
description: Always-loaded project anchor. Read this first. Contains project identity, non-negotiables, commands, and pointer to ROUTER.md for full context.
last_updated: 2026-04-09
---

# DIMMA QC

## What This Is
A React SPA for quality control management in clinical laboratory equipment — technicians load QC results per equipment/lot/level, Westgard rules are evaluated automatically, and supervisors validate and review reports.

## Non-Negotiables
- Never query Supabase directly from a page component for data that belongs in `QCDataContext` — use context actions (`addQCReport`, `updateQCReport`, etc.)
- Always strip joined/relational objects (`laboratory`, `type`, `unit`, `lots`) before sending updates to Supabase — sending them causes column-not-found errors
- Map DB snake_case to app camelCase explicitly when reading from Supabase; reverse when writing
- All routes except `/login` and `/reset-password` must be wrapped in `<ProtectedRoute>`
- Never commit `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` values

## Commands
- Dev: `npm run dev` (port 3000)
- Build: `npm run build`
- Test: `npm test` (Jest + jsdom)
- Preview: `npm run preview`

## Scaffold Growth
After every task: if no pattern exists for the task type you just completed, create one. If a pattern or context file is now out of date, update it. The scaffold grows from real work, not just setup. See the GROW step in `ROUTER.md` for details.

## Navigation
At the start of every session, read `ROUTER.md` before doing anything else.
For full project context, patterns, and task guidance — everything is there.
