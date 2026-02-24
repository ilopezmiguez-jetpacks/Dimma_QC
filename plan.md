# Implementation Plan: Admin Delete + Cursor-Based Pagination

_Based on full codebase analysis — February 2026_

---

## Table of Contents

1. [Feature 1 — Admin: Delete Laboratories and Equipments](#feature-1)
   - [1.1 Delete Equipment from the Equipment List Page](#11-delete-equipment-from-the-equipment-list-page)
   - [1.2 Delete Laboratory from the Laboratories Settings Page](#12-delete-laboratory-from-the-laboratories-settings-page)
   - [1.3 Permissions](#13-permissions)
   - [1.4 Database Considerations](#14-database-considerations)
2. [Feature 2 — Cursor-Based Pagination](#feature-2)
   - [2.1 Strategy and Cursor Design](#21-strategy-and-cursor-design)
   - [2.2 Laboratories List Pagination](#22-laboratories-list-pagination)
   - [2.3 Equipment List Pagination](#23-equipment-list-pagination)
   - [2.4 Context / Architecture Impact](#24-context--architecture-impact)
3. [File Change Summary](#file-change-summary)

---

## Current State Analysis

| Concern | Current behaviour |
|---|---|
| Equipment delete | `deleteEquipment(id)` exists in `QCDataContext` and is called from `EquipmentDetailPage`. The card in `EquipmentPage` has **no delete button**. |
| Lab delete | No delete handler exists anywhere — only create and update in `LaboratoriesPage.jsx`. |
| Permissions | `hasPermission(user, 'delete_equipment')` already returns `true` for admins. No `delete_laboratory` case exists. |
| Pagination | **None**. Every list (`laboratories`, `equipment`) fetches all rows with no `limit` or cursor. Client-side `Array.filter()` is used for search/status. |

---

## Feature 1

### 1.1 Delete Equipment from the Equipment List Page

**File:** `src/pages/EquipmentPage.jsx`

#### What to add

Add a **Trash** icon button inside `EquipmentCard` (admin-only). Clicking it opens an `AlertDialog` that calls the existing `deleteEquipment` from context upon confirmation.

#### Step 1 — Import the missing pieces

```jsx
// At the top of EquipmentPage.jsx
import { Trash2 } from 'lucide-react';
import { hasPermission } from '@/utils/permissions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
```

#### Step 2 — Pull `deleteEquipment` from context

```jsx
// Line 30 — extend the destructuring from useQCData
const { equipment, currentLabId, laboratories, updateEquipmentDetails, deleteEquipment } = useQCData();
```

#### Step 3 — Add the `canDeleteEquipment` flag

```jsx
// After `const isAdmin = ...` (line 44)
const canDeleteEquipment = hasPermission(user, 'delete_equipment');
```

#### Step 4 — Add delete state and handler

```jsx
// New local state alongside existing ones
const [deletingEquipmentId, setDeletingEquipmentId] = useState(null);

const handleDeleteEquipment = async (id) => {
  try {
    await deleteEquipment(id);
    toast({
      title: 'Equipo eliminado',
      description: 'El equipo fue eliminado correctamente.',
    });
  } catch {
    toast({
      variant: 'destructive',
      title: 'Error al eliminar',
      description: 'No se pudo eliminar el equipo.',
    });
  }
};
```

#### Step 5 — Modify `EquipmentCard` to show the delete button

The existing card renders an edit pencil button when `isAdmin`. Add the delete button right next to it:

```jsx
// Inside EquipmentCard, in the top-right action cluster (after the existing Pencil button)
{canDeleteEquipment && (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-red-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Trash2 className="w-3 h-3 text-red-500" />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
        <AlertDialogDescription>
          Esta acción no se puede deshacer. Eliminará permanentemente{' '}
          <strong>{eq.name}</strong> junto con todos sus lotes y reportes de
          control de calidad.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={() => handleDeleteEquipment(eq.id)}
        >
          Eliminar
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}
```

> **Note:** `e.stopPropagation()` on the trigger prevents the card's `onClick` (which navigates to the detail page) from firing when the user opens the dialog.

---

### 1.2 Delete Laboratory from the Laboratories Settings Page

**File:** `src/pages/LaboratoriesPage.jsx`

No delete logic exists here. We add it entirely within the component (consistent with how `handleSave` is implemented).

#### Step 1 — Add imports

```jsx
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
```

#### Step 2 — Add `handleDeleteLab`

Place this alongside the existing `handleSave` and `handleViewUsers` functions:

```jsx
const handleDeleteLab = async (lab) => {
  const { error } = await supabase
    .from('laboratories')
    .delete()
    .eq('id', lab.id);

  if (error) {
    toast({
      title: 'Error',
      description: 'No se pudo eliminar el laboratorio. Asegúrese de que no tenga equipos o usuarios asignados.',
      variant: 'destructive',
    });
  } else {
    toast({ title: 'Laboratorio eliminado', description: `"${lab.name}" fue eliminado correctamente.` });
    setLabs(prev => prev.filter(l => l.id !== lab.id));
  }
};
```

> **Why update local state instead of re-fetching?** `fetchLabs()` triggers a full reload. Optimistically removing the deleted row from state is faster and avoids a round-trip. If the delete fails, the error toast is shown and state remains unchanged.

#### Step 3 — Add the delete button to the table row

In the `<div className="flex justify-end gap-2">` block (line 159), after the existing edit button:

```jsx
{isAdmin && (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="icon" title="Eliminar laboratorio">
        <Trash2 className="w-4 h-4 text-red-500" />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>¿Eliminar laboratorio?</AlertDialogTitle>
        <AlertDialogDescription>
          Esta acción es permanente. Se eliminará{' '}
          <strong>{lab.name}</strong>. Los equipos y usuarios que estén
          asignados a este laboratorio quedarán sin sede.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          onClick={() => handleDeleteLab(lab)}
        >
          Eliminar
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}
```

---

### 1.3 Permissions

**File:** `src/utils/permissions.js`

Add `delete_laboratory` as an explicit admin-only action (mirrors `delete_equipment`):

```js
// Current file (lines 7-17)
switch (action) {
  case 'validate_results':
  case 'manage_lots':
    return role === 'biochemist';

  case 'create_user':
  case 'delete_equipment':
    return false; // Only admin (handled by the check above)

  default:
    return true;
}
```

Add the new case:

```js
switch (action) {
  case 'validate_results':
  case 'manage_lots':
    return role === 'biochemist';

  case 'create_user':
  case 'delete_equipment':
  case 'delete_laboratory':   // ← ADD THIS
    return false; // Only admin (handled by the check above)

  default:
    return true;
}
```

Usage in `LaboratoriesPage.jsx`:

```jsx
// Add alongside `const isAdmin = ...`
const canDeleteLab = hasPermission(user, 'delete_laboratory');
// Then use `canDeleteLab` to gate the delete AlertDialog instead of raw `isAdmin`
```

---

### 1.4 Database Considerations

Before deleting a laboratory, two foreign-key relationships must be handled:

| Child table | Column | Behaviour needed |
|---|---|---|
| `equipment` | `laboratory_id` | SET NULL or prevent deletion if equipment exists |
| `profiles` | `laboratory_id` | SET NULL |
| `user_laboratories` | `laboratory_id` | CASCADE DELETE (junction rows) |

**Recommended:** Add `ON DELETE SET NULL` on `equipment.laboratory_id` and `profiles.laboratory_id` in the Supabase/Postgres schema. For `user_laboratories`, use `ON DELETE CASCADE`.

If these constraints are already set in the DB, the Supabase delete call will work automatically. If not, the app should check before deleting:

```jsx
const handleDeleteLab = async (lab) => {
  // Guard: check if any active equipment is assigned
  const { count } = await supabase
    .from('equipment')
    .select('id', { count: 'exact', head: true })
    .eq('laboratory_id', lab.id)
    .eq('is_active', true);

  if (count > 0) {
    toast({
      title: 'No se puede eliminar',
      description: `Este laboratorio tiene ${count} equipo(s) activo(s) asignado(s). Reasígnelos antes de eliminar.`,
      variant: 'destructive',
    });
    return;
  }

  const { error } = await supabase.from('laboratories').delete().eq('id', lab.id);
  // ... handle error/success as above
};
```

---

## Feature 2

### 2.1 Strategy and Cursor Design

#### Why not offset?

`OFFSET n` in PostgreSQL scans and discards the first `n` rows every time. For a list that is constantly being inserted into, offset pages also "drift" (records shift between pages). Cursor-based pagination avoids both problems.

#### Cursor approach: compound `(created_at, id)`

`created_at` alone is not unique (two records inserted in the same microsecond would tie). Combining it with `id` (UUID) makes the cursor unique, as long as both columns are indexed together. Supabase's PostgREST supports compound `OR` filters that enable this.

**Cursor shape:**
```ts
type Cursor = { created_at: string; id: string } | null;
```

**First page:**
```js
const PAGE_SIZE = 15;

const { data } = await supabase
  .from('table_name')
  .select('*')
  .order('created_at', { ascending: true })
  .order('id', { ascending: true })
  .limit(PAGE_SIZE);

const nextCursor: Cursor = data.length === PAGE_SIZE
  ? { created_at: data.at(-1).created_at, id: data.at(-1).id }
  : null;
```

**Subsequent pages:**
```js
let query = supabase
  .from('table_name')
  .select('*')
  .order('created_at', { ascending: true })
  .order('id', { ascending: true })
  .limit(PAGE_SIZE);

if (cursor) {
  // Rows where created_at > cursor.created_at
  // OR (created_at = cursor.created_at AND id > cursor.id)
  query = query.or(
    `created_at.gt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`
  );
}

const { data } = await query;
```

> PostgREST's `or()` supports nested `and()` groups. This compound condition is the canonical keyset/cursor pattern for two-column ordering.

---

### 2.2 Laboratories List Pagination

**File:** `src/pages/LaboratoriesPage.jsx`

Labs are unlikely to number in the thousands, but the same pattern is used for consistency. Page size: **20**.

#### New state

```jsx
const PAGE_SIZE = 20;
const [cursor, setCursor] = useState(null);        // current page's last-item cursor
const [hasMore, setHasMore] = useState(false);
const [isLoadingMore, setIsLoadingMore] = useState(false);
```

#### Replace `fetchLabs` with cursor-aware version

```jsx
// Replace the existing fetchLabs (line 39-48)
const fetchLabs = async (cursorParam = null, append = false) => {
  if (!append) setLoading(true);
  else setIsLoadingMore(true);

  let query = supabase
    .from('laboratories')
    .select('*')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(PAGE_SIZE);

  if (cursorParam) {
    query = query.or(
      `created_at.gt.${cursorParam.created_at},and(created_at.eq.${cursorParam.created_at},id.gt.${cursorParam.id})`
    );
  }

  const { data, error } = await query;

  if (error) {
    toast({ title: 'Error', description: 'Error al cargar laboratorios', variant: 'destructive' });
  } else {
    const page = data || [];
    setLabs(prev => append ? [...prev, ...page] : page);

    const newCursor = page.length === PAGE_SIZE
      ? { created_at: page.at(-1).created_at, id: page.at(-1).id }
      : null;
    setCursor(newCursor);
    setHasMore(page.length === PAGE_SIZE);
  }

  if (!append) setLoading(false);
  else setIsLoadingMore(false);
};
```

#### Update `useEffect`

```jsx
// Replace the existing useEffect (line 50-52)
useEffect(() => {
  fetchLabs();        // initial load, no cursor
}, []);
```

#### Add "Load More" button to the JSX

Add below the `</Table>` closing tag, before the edit/create dialogs:

```jsx
{hasMore && (
  <div className="flex justify-center pt-4">
    <Button
      variant="outline"
      onClick={() => fetchLabs(cursor, true)}
      disabled={isLoadingMore}
    >
      {isLoadingMore ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
      Cargar más
    </Button>
  </div>
)}
```

#### After a successful save, reset to first page

```jsx
// In handleSave, replace `fetchLabs()` (line 94) with:
setCursor(null);
setLabs([]);
fetchLabs();
```

---

### 2.3 Equipment List Pagination

The equipment list is more complex because:
1. It currently comes from `QCDataContext` where all equipment is loaded globally.
2. It has two client-side filters: **search** (name/model) and **status** (ok/warning/error/maintenance).
3. `EquipmentDetailPage` still needs full equipment data per-item (lots, QC params).

#### Recommended architecture

**Decouple the list view from the context.** `EquipmentPage` fetches its own paginated, server-filtered list. `QCDataContext` continues loading the single equipment record needed by `EquipmentDetailPage` (already fetched on demand there via `equipment.find(e => e.id === equipmentId)`).

This removes the dependency on context for the list while keeping mutations (delete, update) routed through the context so the detail page stays fresh.

#### New hook: `src/hooks/useEquipmentList.js`

Create this file:

```js
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const PAGE_SIZE = 12;

export const useEquipmentList = ({ labId }) => {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Keep a ref to the current filters so fetchPage is stable
  const filtersRef = useRef({ searchTerm: '', statusFilter: 'all' });

  const buildQuery = useCallback((cursorParam, filters) => {
    let q = supabase
      .from('equipment')
      .select(`
        id, name, model, serial, status,
        maintenance_due, daily_deviation_threshold,
        equipment_type_id, laboratory_id, created_at,
        laboratory:laboratories(name),
        type:equipment_types(name)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(PAGE_SIZE);

    // Lab filter
    if (labId && labId !== 'all') {
      q = q.eq('laboratory_id', labId);
    }

    // Status filter (server-side)
    if (filters.statusFilter === 'ok') {
      q = q.eq('status', 'ok');
    } else if (filters.statusFilter === 'issue') {
      q = q.in('status', ['warning', 'error']);
    } else if (filters.statusFilter === 'maintenance') {
      q = q.lt('maintenance_due', new Date().toISOString());
    }

    // Search filter (server-side, case-insensitive)
    if (filters.searchTerm) {
      q = q.or(`name.ilike.%${filters.searchTerm}%,model.ilike.%${filters.searchTerm}%`);
    }

    // Cursor
    if (cursorParam) {
      q = q.or(
        `created_at.gt.${cursorParam.created_at},and(created_at.eq.${cursorParam.created_at},id.gt.${cursorParam.id})`
      );
    }

    return q;
  }, [labId]);

  // Transform snake_case → camelCase to match existing component expectations
  const transform = (eq) => ({
    ...eq,
    maintenanceDue: eq.maintenance_due,
    dailyDeviationThreshold: eq.daily_deviation_threshold,
    laboratoryName: eq.laboratory?.name,
    typeName: eq.type?.name,
    lots: [],   // Lots are not needed for the list view card
  });

  const fetchPage = useCallback(async (cursorParam = null, append = false, filters = filtersRef.current) => {
    filtersRef.current = filters;
    if (!append) setLoading(true);
    else setIsLoadingMore(true);

    const { data, error } = await buildQuery(cursorParam, filters);

    if (!error && data) {
      const page = data.map(transform);
      setItems(prev => append ? [...prev, ...page] : page);

      const newCursor = page.length === PAGE_SIZE
        ? { created_at: data.at(-1).created_at, id: data.at(-1).id }
        : null;
      setCursor(newCursor);
      setHasMore(page.length === PAGE_SIZE);
    }

    if (!append) setLoading(false);
    else setIsLoadingMore(false);
  }, [buildQuery]);

  // Called when filters change — resets to first page
  const reset = useCallback((filters) => {
    setCursor(null);
    setItems([]);
    fetchPage(null, false, filters);
  }, [fetchPage]);

  // Called when user clicks "Cargar más"
  const loadMore = useCallback((filters) => {
    fetchPage(cursor, true, filters);
  }, [cursor, fetchPage]);

  // Remove an item from local state after deletion (optimistic)
  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(eq => eq.id !== id));
  }, []);

  return { items, cursor, hasMore, loading, isLoadingMore, reset, loadMore, removeItem };
};
```

#### Update `EquipmentPage.jsx` to use the hook

**Replace** the data source and search logic:

```jsx
// Remove from useQCData destructuring: `equipment`
// Keep: currentLabId, laboratories, updateEquipmentDetails, deleteEquipment
const { currentLabId, laboratories, updateEquipmentDetails, deleteEquipment } = useQCData();

const {
  items: equipment,
  hasMore,
  loading: listLoading,
  isLoadingMore,
  reset,
  loadMore,
  removeItem,
} = useEquipmentList({ labId: currentLabId });

// Filters state (unchanged)
const [searchTerm, setSearchTerm] = useState('');
const [statusFilter, setStatusFilter] = useState('all');

// Debounce search → call reset() instead of client-side filter
useEffect(() => {
  const timer = setTimeout(() => {
    reset({ searchTerm, statusFilter });
  }, 300);
  return () => clearTimeout(timer);
}, [searchTerm, statusFilter, currentLabId]);

// Remove client-side filteredEquipment variable entirely
// Use `equipment` (from hook) directly in the JSX grid
```

**Update delete handler** to remove from list view optimistically:

```jsx
const handleDeleteEquipment = async (id, name) => {
  try {
    await deleteEquipment(id);       // context call → removes from context state
    removeItem(id);                  // hook call → removes from paginated list state
    toast({ title: 'Equipo eliminado', description: `${name} fue eliminado.` });
  } catch {
    toast({ variant: 'destructive', title: 'Error al eliminar' });
  }
};
```

**Add Load More button** at the bottom of the grid:

```jsx
{hasMore && (
  <div className="flex justify-center pt-4 col-span-full">
    <Button
      variant="outline"
      onClick={() => loadMore({ searchTerm, statusFilter })}
      disabled={isLoadingMore}
    >
      {isLoadingMore && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      Cargar más equipos
    </Button>
  </div>
)}
```

**Update the loading state guard:**

```jsx
// Replace the existing loading check at the top of the render
// (currently there is none for equipment, loading comes from context)
if (listLoading && equipment.length === 0) {
  return (
    <div className="flex justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}
```

---

### 2.4 Context / Architecture Impact

| Area | Change |
|---|---|
| `QCDataContext.jsx` | **No structural change.** `fetchAllData` continues to serve `EquipmentDetailPage` and `LoadControlPage`. The context's `equipment` array is independent of the paginated list. |
| `EquipmentPage.jsx` | **No longer reads `equipment` from context.** Uses `useEquipmentList` hook. Still calls `deleteEquipment` from context for the mutation. |
| `EquipmentDetailPage.jsx` | **Unchanged.** Reads from context normally. |
| `LaboratoriesPage.jsx` | **Cursor-based `fetchLabs` replaces offset-less fetch.** No context change. |
| `QCDataContext` — `laboratories` | The context's `laboratories` array is fetched for the lab selector (`setLaboratories`). That remains a full load because it's used in dropdowns and nav — it's a small, infrequently changing list. |

---

## File Change Summary

| File | Change type | Description |
|---|---|---|
| `src/utils/permissions.js` | Edit | Add `delete_laboratory` case |
| `src/pages/LaboratoriesPage.jsx` | Edit | Add delete handler, AlertDialog, cursor pagination |
| `src/pages/EquipmentPage.jsx` | Edit | Add delete button on card, use `useEquipmentList` hook, remove client-side filtering |
| `src/hooks/useEquipmentList.js` | **New file** | Paginated, server-filtered equipment list hook |
| `src/contexts/QCDataContext.jsx` | No change | Already has `deleteEquipment`; pagination lives in hook |

---

## Implementation Order

1. ~~**`permissions.js`** — 1 line, no risk.~~ ✅
2. ~~**`LaboratoriesPage.jsx` delete** — Self-contained; add `handleDeleteLab` + AlertDialog.~~ ✅
3. ~~**`EquipmentPage.jsx` delete** — Pull `deleteEquipment` from context + AlertDialog on card.~~ ✅
4. ~~**`useEquipmentList.js`** — New hook; no impact until consumed.~~ ✅
5. ~~**`LaboratoriesPage.jsx` pagination** — Replace `fetchLabs` with cursor version + UI.~~ ✅
6. ~~**`EquipmentPage.jsx` pagination** — Switch data source to hook, add Load More.~~ ✅

Each step is independently deployable and testable.

---

## Status: ✅ COMPLETE — February 2026
