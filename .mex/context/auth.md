---
name: auth
description: Auth flow, roles, permissions, and lab-scoping. Load when working on authentication, authorization, user management, or lab filtering logic.
triggers:
  - "auth"
  - "login"
  - "permission"
  - "role"
  - "admin"
  - "lab scope"
  - "assignedLabs"
  - "ProtectedRoute"
edges:
  - target: context/architecture.md
    condition: when understanding how auth fits into the overall system flow
  - target: context/decisions.md
    condition: when understanding why Supabase Auth was chosen
  - target: patterns/supabase-query.md
    condition: when querying user-scoped data
last_updated: 2026-04-09
---

# Auth

## Auth Flow

1. `AuthProvider` calls `supabase.auth.getSession()` on mount — resolves session from stored token
2. `fetchUserProfile(authUser)` queries the `profiles` table with a join on `user_laboratories → laboratories` to get `full_name`, `avatar_url`, `role`, and `assignedLabs`
3. `user` in context is `{ ...authUser, profile, role }` — `role` comes from `profiles.role` (preferred) or `authUser.user_metadata.role` (fallback)
4. Password recovery: `supabase.auth.onAuthStateChange` fires `PASSWORD_RECOVERY` event → `passwordRecovery: true` in context → `ResetPasswordPage` at `/reset-password` handles the new-password form
5. `AuthProvider` renders `null` while `loading: true` — children only mount after session is resolved

## Roles

- **`admin`** — can view all labs (`currentLabId = 'all'`), manage users, manage equipment across labs
- **Regular user** — scoped to `assignedLabs`; `currentLabId` defaults to `assignedLabs[0].id` on load; cannot switch to 'all'

Role is checked via `user.role` (string). Permission helper is in `src/utils/permissions.js` — use `hasPermission(user, 'action')` rather than inline role checks in components.

## Key DB Tables

- `profiles` — `id` (FK to auth.users), `full_name`, `avatar_url`, `role`
- `user_laboratories` — junction: `user_id`, `laboratory_id` — drives `assignedLabs`
- `laboratories` — `id`, `name`, `is_active`

## Lab Scoping

- Admin: `currentLabId` can be `'all'` or a specific lab UUID
- Non-admin: `currentLabId` is always a specific lab UUID from `assignedLabs`
- Equipment and QC data is filtered by `currentLabId` in `QCDataContext.fetchAllData()` — when `'all'`, no `laboratory_id` filter is applied to the Supabase query

## RLS

Supabase RLS policies enforce lab-level data isolation at the database level. Client-side scoping via `currentLabId` is a UX convenience, not the security boundary. Always verify that RLS policies exist for any new table that holds lab-specific data.

## Gotchas

- `user.role` may be `null` briefly during initial session resolution — always guard before role checks
- `assignedLabs` can be an empty array for users not yet assigned — `QCDataContext` will not set a valid `currentLabId` in this case; UI should show an empty state rather than crashing
- Never check `user.user_metadata.role` directly — it may be stale; use `user.role` (set from `profiles.role` in `handleSession`)
