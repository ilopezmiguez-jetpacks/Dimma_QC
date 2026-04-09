---
name: decisions
description: Key architectural and technical decisions with reasoning. Load when making design choices or understanding why something is built a certain way.
triggers:
  - "why do we"
  - "why is it"
  - "decision"
  - "alternative"
  - "we chose"
edges:
  - target: context/architecture.md
    condition: when a decision relates to system structure
  - target: context/stack.md
    condition: when a decision relates to technology choice
  - target: context/auth.md
    condition: when a decision relates to auth or permissions
last_updated: 2026-04-09
---

# Decisions

## Decision Log

### Supabase as sole backend (no custom server)
**Date:** 2024-01-01 (approximate, from codebase origin)
**Status:** Active
**Decision:** All data persistence and auth are handled by Supabase; there is no Express/Node/FastAPI backend.
**Reasoning:** Eliminates backend infrastructure; RLS policies enforce security at the database layer; Supabase Auth handles email/password flows including password recovery.
**Alternatives considered:** Express API (rejected — adds deployment complexity for a team-sized app); Firebase (rejected — PostgreSQL relational model fits lab data better than Firestore).
**Consequences:** All business logic runs in the browser. Westgard rule evaluation happens client-side before insert. RLS is the security boundary — test it carefully.

### Westgard rules evaluated client-side in QCDataContext
**Date:** 2024-01-01 (approximate)
**Status:** Active
**Decision:** Westgard 1-2s, 1-3s, and 2-2s rules are evaluated in `QCDataContext.addQCReport()` and `updateQCReport()` before the record is inserted/updated.
**Reasoning:** No server-side function available; keeps the logic co-located with the data mutations that need it.
**Alternatives considered:** Supabase Edge Function (considered but adds deployment step and cold-start latency for a real-time entry flow).
**Consequences:** History for Westgard analysis is fetched on-demand from `qc_reports` (last 20 records) at insert time — adds one extra round-trip per QC save. If history is unavailable, Westgard analysis is skipped gracefully.

### Manual snake_case ↔ camelCase mapping (no ORM or codegen)
**Date:** 2024-01-01 (approximate)
**Status:** Active
**Decision:** DB fields are manually remapped between snake_case (Supabase) and camelCase (app) in `QCDataContext`.
**Reasoning:** No TypeScript, no codegen tooling in place. Explicit mapping makes transformations visible and debuggable.
**Alternatives considered:** Automatic case conversion library (rejected — adds magic that obscures what fields exist); TypeScript with generated types (not adopted for this project).
**Consequences:** Every new DB column must be manually mapped in the context fetch and in the update strip pattern. Missing a field is the most common source of bugs — see conventions.md.

### Lab-scoped data via `currentLabId` in context (not URL params)
**Date:** 2024-01-01 (approximate)
**Status:** Active
**Decision:** The active lab filter is held in `QCDataContext.currentLabId` state, changed via `LabSelector` in the Layout.
**Reasoning:** Lab switching should persist across page navigations without reloading the app.
**Alternatives considered:** URL query param per page (rejected — would require every page to read and forward the param); per-user default lab from profile (only used as initial value for non-admins).
**Consequences:** Data re-fetches whenever `currentLabId` changes (via `fetchAllData` callback dependency). Admin users can switch to 'all' to see all labs.
