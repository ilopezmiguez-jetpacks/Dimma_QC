---
name: conventions
description: How code is written in this project — naming, structure, patterns, and style. Load when writing new code or reviewing existing code.
triggers:
  - "convention"
  - "pattern"
  - "naming"
  - "style"
  - "how should I"
  - "what's the right way"
edges:
  - target: context/architecture.md
    condition: when a convention depends on understanding the system structure
  - target: context/stack.md
    condition: when a convention is library-specific
  - target: patterns/supabase-query.md
    condition: when writing Supabase queries or mutations
last_updated: 2026-04-09
---

# Conventions

## Naming

- **Files**: PascalCase for components and pages (`EquipmentDetailPage.jsx`, `EditQCReportModal.jsx`); camelCase for utilities (`qcStats.js`, `permissions.js`)
- **Components**: PascalCase, named export from their file
- **Context hooks**: `use` prefix, e.g. `useQCData()`, `useAuth()`
- **DB columns**: snake_case in Supabase (`equipment_id`, `lot_number`, `is_active`); mapped to camelCase in app (`equipmentId`, `lotNumber`, `isActive`) in context
- **Path alias**: always use `@/` instead of relative paths (`@/components/ui/button`, not `../../components/ui/button`)

## Structure

- Pages live in `src/pages/`, UI components in `src/components/`, Radix wrappers in `src/components/ui/`, context in `src/contexts/`, utilities in `src/utils/`, Supabase client in `src/lib/`
- All mutations (insert/update/delete) for equipment, lots, and qc_reports go through `QCDataContext` action functions — pages do not call `supabase.from(...).insert()` directly for these entities
- Pages may query `qc_reports` and `qc_reports`-adjacent data directly from Supabase for read-only, page-local state (e.g. chart history, today's count) — this is intentional for performance
- Settings sub-pages are tab components in `src/components/settings/` rendered by `SettingsPage`

## Patterns

**Snake_case ↔ camelCase mapping on Supabase reads:**
Always flatten joined relations and remap fields explicitly:
```js
// Correct — after fetching from Supabase
const formatted = data.map(eq => ({
  ...eq,
  dailyDeviationThreshold: eq.daily_deviation_threshold,
  maintenanceDue: eq.maintenance_due,
  laboratoryName: eq.laboratory?.name,
  lots: (eq.lots || []).map(lot => ({
    ...lot,
    lotNumber: lot.lot_number,
    expirationDate: lot.expiration_date,
    isActive: lot.is_active
  }))
}));

// Wrong — spreading the raw DB object and using snake_case fields in JSX
```

**Stripping joined objects before Supabase update:**
Never send joined relations back to Supabase — they are not DB columns:
```js
// Correct
const { lots, laboratory, type, unit, laboratoryName, typeName, ...cleanData } = updatedData;
await supabase.from('equipment').update({ ...cleanData, daily_deviation_threshold: dailyDeviationThreshold }).eq('id', id);

// Wrong — sending the full app object with nested joins causes "column not found" error
await supabase.from('equipment').update(updatedData).eq('id', id);
```

**Toasts for user feedback:**
Use `useToast()` from `@/components/ui/use-toast` for all user-facing success/error messages. Always include `variant: 'destructive'` for errors.

**`cn()` for className composition:**
```js
import { cn } from '@/lib/utils';
className={cn('base-class', condition && 'conditional-class')}
```

## Verify Checklist

Before presenting any code:
- [ ] Joined objects (`laboratory`, `type`, `unit`, `lots`) are stripped before any `supabase.update()` or `supabase.insert()`
- [ ] DB snake_case fields are mapped to camelCase after reads; camelCase mapped back to snake_case before writes
- [ ] New mutations for core entities go through `QCDataContext` action functions, not direct Supabase calls in the page
- [ ] New authenticated routes are wrapped in `<ProtectedRoute><Layout>...</Layout></ProtectedRoute>` in `src/app.jsx`
- [ ] Path alias `@/` used (not relative paths)
- [ ] `react-helmet` `<Helmet>` used in each new page to set `<title>`
- [ ] Toast feedback provided for async operations (success and error cases)
