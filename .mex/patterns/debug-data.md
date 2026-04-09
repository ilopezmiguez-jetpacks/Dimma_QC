---
name: debug-data
description: Diagnose data-loading failures, empty results, and Supabase errors. The primary failure boundary is the browser ↔ Supabase boundary.
triggers:
  - "data not loading"
  - "empty list"
  - "supabase error"
  - "RLS"
  - "column not found"
  - "debug"
  - "not showing"
edges:
  - target: patterns/supabase-query.md
    condition: when the fix involves correcting a query or update call
  - target: context/auth.md
    condition: when the issue is likely an RLS or session problem
  - target: context/architecture.md
    condition: when understanding which layer owns the failing query
last_updated: 2026-04-09
---

# Debug Data

## Context

There are two categories of data fetching:
1. **Context-loaded data** (`equipment`, `laboratories`, `parameters`, `units`) — fetched in `QCDataContext` on mount and on `currentLabId` change
2. **Page-local data** (`qc_reports` history, today's count, pending reports) — fetched directly in page components via `useEffect`

Failures in category 1 show toasts; failures in category 2 are often silent (empty arrays, `null` state).

## Diagnosis Steps

### Step 1 — Check the browser console
Look for:
- Supabase error objects (have `.message`, `.code`, `.details`)
- `"column not found"` → a joined object leaked into an update payload (see supabase-query.md)
- `"JWT expired"` or auth errors → session is stale, user needs to log in again

### Step 2 — Verify the session
Open DevTools → Application → Local Storage → look for `sb-*-auth-token`. If missing or expired, the Supabase client will send anonymous requests, which RLS will block silently (empty results, not errors).

### Step 3 — Check `currentLabId`
If equipment or reports list is unexpectedly empty, check `currentLabId` in `QCDataContext`. If it's `null` or an invalid UUID, the `laboratory_id` filter will return 0 rows. Non-admin users with no `assignedLabs` will hit this.

### Step 4 — Check RLS policies
In the Supabase dashboard → Authentication → Policies, verify that:
- The table has policies for the operation (SELECT, INSERT, UPDATE, DELETE)
- The policy references the correct `auth.uid()` or lab-scoping logic
- You can test a query in the Supabase SQL editor with `set role authenticated; set local "request.jwt.claim.sub" = '<user-uuid>';`

### Step 5 — Check the query itself
Add a temporary `console.log` of the Supabase query result to see the raw `data` and `error`:
```js
const { data, error } = await supabase.from('equipment').select('*');
console.log('equipment:', data, 'error:', error);
```
Common issues:
- `.single()` on 0 rows returns an error — switch to `.maybeSingle()`
- Missing `.eq('is_active', true)` filter returning deactivated records
- Select not including needed join (`lots:control_lots(*)` not in query)

### Step 6 — Check local state update
If data saves to DB but UI doesn't update: the local state update in the context action may be missing or wrong. Verify that `setEquipment` is called with the correct transform after the Supabase write.

## Common Fixes

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `[]` from query that should have rows | RLS block or wrong `currentLabId` | Check session + lab scope |
| "column not found" on update | Joined object in payload | Strip `laboratory`, `type`, `unit`, `lots` |
| `null` instead of saved row after insert | Missing `.select()` after insert | Chain `.select().single()` |
| UI stale after mutation | Local state not updated | Add `setEquipment(prev => ...)` call after Supabase write |
| Toast "Error de Carga" on app start | Supabase URL/key missing | Check `.env` for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |

## Update Scaffold
- [ ] Update `.mex/ROUTER.md` "Current Project State" if what's working/not built has changed
- [ ] Update any `.mex/context/` files that are now out of date
- [ ] If this is a new task type without a pattern, create one in `.mex/patterns/` and add to `INDEX.md`
