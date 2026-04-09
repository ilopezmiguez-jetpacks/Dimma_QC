---
name: setup
description: Dev environment setup and commands. Load when setting up the project for the first time or when environment issues arise.
triggers:
  - "setup"
  - "install"
  - "environment"
  - "getting started"
  - "how do I run"
  - "local development"
edges:
  - target: context/stack.md
    condition: when specific technology versions or library details are needed
  - target: context/architecture.md
    condition: when understanding how components connect during setup
last_updated: 2026-04-09
---

# Setup

## Prerequisites

- Node.js 18+ (Vite 6 requirement)
- npm (project uses npm, not pnpm or yarn — `package-lock.json` is present)
- A Supabase project with the required tables and RLS policies

## First-time Setup

1. `npm install`
2. Create `.env` in the project root with the required variables (see below)
3. `npm run dev` — starts dev server on `http://localhost:3000` (also bound to `::` for network access)

## Environment Variables

- `VITE_SUPABASE_URL` (required) — your Supabase project URL (e.g. `https://xxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` (required) — your Supabase anon/public key

Both are read via `import.meta.env` in `src/lib/customSupabaseClient.js`. There is no `.env.example` committed — ask a teammate for values.

## Common Commands

- `npm run dev` — dev server on port 3000 with HMR
- `npm run build` — production build (also runs `tools/generate-llms.js` first, failures are non-fatal)
- `npm run preview` — preview production build on port 3000
- `npm test` — Jest test suite (unit + integration); config in `jest.config.js`

## Common Issues

**Blank screen / context errors on load:** Usually means `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing or wrong. Check the browser console for Supabase auth errors.

**"column not found" Supabase error on update:** A joined relation object (`laboratory`, `type`, `unit`, or `lots`) was included in the update payload. Strip it before calling `.update()` — see conventions.md for the stripping pattern.

**Port already in use:** `lsof -i :3000` to find the process, `kill -9 [PID]` to free it.

**RLS policy block (empty results or 403):** The user's session may not satisfy the RLS policy for the target table. Verify `user.role` and `user.profile.assignedLabs` are populated correctly. Check Supabase dashboard → Authentication → Policies.
