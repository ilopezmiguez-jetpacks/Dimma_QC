---
name: architecture
description: How the major pieces of this project connect and flow. Load when working on system design, integrations, or understanding how components interact.
triggers:
  - "architecture"
  - "system design"
  - "how does X connect to Y"
  - "integration"
  - "flow"
edges:
  - target: context/stack.md
    condition: when specific technology details are needed
  - target: context/decisions.md
    condition: when understanding why the architecture is structured this way
  - target: context/auth.md
    condition: when working on auth, roles, permissions, or user/lab scoping
  - target: patterns/add-page.md
    condition: when adding a new page or route
last_updated: 2026-04-09
---

# Architecture

## System Overview

User opens the app → `AuthProvider` resolves session via Supabase Auth → fetches `profiles` + `user_laboratories` to determine role and assigned labs → `QCDataProvider` fetches equipment, lots, parameters scoped to `currentLabId` → user navigates to a page (all pages wrapped in `ProtectedRoute` → `Layout`) → page reads from context or queries Supabase directly for page-local data (e.g. `qc_reports` history) → mutations go through `QCDataContext` action functions (e.g. `addQCReport`, `updateQCReport`) → Westgard rules evaluated in context before insert → result saved to `qc_reports` table → equipment `status` updated in DB and local state simultaneously.

There is no separate backend. Supabase (PostgreSQL + Auth + RLS) is the entire backend. All business logic runs in the browser.

## Key Components

- **`AuthProvider`** (`src/contexts/SupabaseAuthContext.jsx`) — manages Supabase session, fetches profile + role + assignedLabs, exposes `user`, `signIn`, `signOut`. Must wrap everything. `user.role` and `user.profile.assignedLabs` drive all permission/scoping logic.
- **`QCDataProvider`** (`src/contexts/QCDataContext.jsx`) — the central state store. Holds `equipment` (with nested `lots`), `parameters`, `units`, `laboratories`. All mutations (add/update/delete reports, equipment, lots) live here. Applies Westgard rules on `addQCReport` and `updateQCReport` before persisting.
- **`ProtectedRoute`** (`src/components/ProtectedRoute.jsx`) — redirects to `/login` if no session; must wrap all authenticated routes.
- **`Layout`** (`src/components/Layout.jsx`) — shell with navigation sidebar, `LabSelector` for switching lab context.
- **`LoadControlPage`** (`src/pages/LoadControlPage.jsx`) — primary data-entry page; technicians select equipment/lot/level and submit QC values. Calls `addQCReport` from context.
- **`EquipmentDetailPage`** (`src/pages/EquipmentDetailPage.jsx`) — shows Levey-Jennings chart (Recharts), stats table, and QC report history for a given equipment+lot+level. Queries `qc_reports` directly from Supabase for chart data.
- **`Dashboard`** (`src/pages/Dashboard.jsx`) — shows today's report count, pending-validation reports, and equipment status summary. Queries `qc_reports` directly.
- **`customSupabaseClient`** (`src/lib/customSupabaseClient.js`) — singleton Supabase client, initialized from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Import as `{ supabase }`.

## External Dependencies

- **Supabase** — auth (email/password + password recovery) and PostgreSQL database. RLS policies enforce lab-level isolation. Key tables: `profiles`, `user_laboratories`, `laboratories`, `equipment`, `equipment_types`, `control_lots`, `qc_reports`, `parameters`, `units`.
- **Recharts** — Levey-Jennings control charts on `EquipmentDetailPage` and `StatisticsPage`. Use `LineChart` + `ReferenceLine` for control limits.
- **jsPDF + jspdf-autotable** — PDF export of QC reports. Used in report pages.

## What Does NOT Exist Here

- No backend server — Supabase is the entire backend; business logic runs in the browser
- No global state management library (Redux, Zustand) — state lives in `QCDataContext` and `AuthProvider` only
- No background jobs or webhooks — all processing is synchronous and in-browser
- No file storage — PDF generation is client-side only, no uploads to S3 or similar
