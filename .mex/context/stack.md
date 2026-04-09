---
name: stack
description: Technology stack, library choices, and the reasoning behind them. Load when working with specific technologies or making decisions about libraries and tools.
triggers:
  - "library"
  - "package"
  - "dependency"
  - "which tool"
  - "technology"
edges:
  - target: context/decisions.md
    condition: when the reasoning behind a tech choice is needed
  - target: context/conventions.md
    condition: when understanding how to use a technology in this codebase
  - target: context/architecture.md
    condition: when understanding how libraries fit into the system structure
last_updated: 2026-04-09
---

# Stack

## Core Technologies

- **React 18** — UI framework, hooks only (no class components)
- **Vite 6** — build tool and dev server; path alias `@/` maps to `src/`
- **Tailwind CSS 3** — utility-first styling; custom design tokens via `medical-card` and similar classes
- **Supabase JS 2.30** — client for auth and PostgreSQL; singleton at `src/lib/customSupabaseClient.js`
- **React Router DOM 6** — client-side routing; all protected routes use `<ProtectedRoute>`

## Key Libraries

- **`@supabase/supabase-js`** (not raw fetch) — all DB and auth calls go through the Supabase client
- **Radix UI** (not headless-ui or MUI) — accessible primitives; used for Dialog, AlertDialog, Select, Tabs, Switch, Checkbox, DropdownMenu, Toast. Always use the `src/components/ui/` wrappers, not Radix directly.
- **`class-variance-authority` + `clsx` + `tailwind-merge`** — component variant system; used in `src/lib/utils.js` via `cn()` helper
- **Recharts** (not Chart.js or Victory) — all charts; `LineChart` + `ReferenceLine` for Levey-Jennings control charts
- **Framer Motion** — animations; already installed, use sparingly
- **jsPDF + jspdf-autotable** — client-side PDF generation; not a server-rendered PDF service
- **Lucide React** — icon set; import individual icons (`import { Save } from 'lucide-react'`)
- **`react-helmet`** — page `<title>` management; every page sets its own title
- **Jest + Testing Library** — test runner; integration tests in `tests/integration/`, unit utils in `tests/unit/`

## What We Deliberately Do NOT Use

- No Redux or Zustand — state is in React Context (`QCDataContext`, `AuthProvider`) only
- No class components — hooks only throughout
- No direct `fetch()` for Supabase data — always use the Supabase client
- No TypeScript — the project is plain JavaScript (`.jsx`/`.js`)

## Version Constraints

- Supabase JS pinned at `2.30.0` (not `^2`) — do not upgrade without checking breaking changes in RLS behavior
- React 18 is in use; concurrent features (Suspense for data fetching) are not used
