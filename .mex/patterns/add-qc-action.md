---
name: add-qc-action
description: Add a new mutation action (insert/update/delete) to QCDataContext. Covers the full pattern: Supabase call, Westgard re-evaluation if needed, local state update.
triggers:
  - "new action"
  - "context action"
  - "add mutation"
  - "QCDataContext"
  - "add function to context"
edges:
  - target: context/conventions.md
    condition: always — run the verify checklist
  - target: patterns/supabase-query.md
    condition: for the Supabase write pattern and stripping gotcha
  - target: context/architecture.md
    condition: when deciding where the action belongs
last_updated: 2026-04-09
---

# Add QC Action

## Context

All mutations to `equipment`, `control_lots`, and `qc_reports` live in `QCDataContext` (`src/contexts/QCDataContext.jsx`). Actions follow a consistent pattern: validate inputs → call Supabase → update local state → return result (or throw for the caller to handle). New actions must be added to the `value` object at the bottom of the provider and exported via `useQCData()`.

## Steps

1. **Define the async function** inside `QCDataProvider`, before the `value` object:
   ```js
   const myNewAction = async (params) => {
     try {
       // 1. Strip joined objects if working with equipment
       // 2. Map camelCase → snake_case for DB write
       const { error } = await supabase.from('table_name').update({ ... }).eq('id', id);
       if (error) throw error;

       // 3. Update local state immediately (don't wait for refetch)
       setEquipment(prev => prev.map(eq => eq.id === id ? { ...eq, ...changes } : eq));

       return { success: true };
     } catch (err) {
       console.error("Error in myNewAction:", err);
       toast({ title: "Error", description: "Mensaje de error.", variant: "destructive" });
       throw err;  // let the caller handle if needed
     }
   };
   ```

2. **Add to the `value` object** (near line 721):
   ```js
   const value = {
     // ...existing exports...
     myNewAction,
   };
   ```

3. **Use in a page** via `useQCData()`:
   ```js
   const { myNewAction } = useQCData();
   await myNewAction(params);
   ```

## Gotchas

- **Westgard re-evaluation**: if the action changes `qc_reports` values, re-run `applyWestgardRules` and update `status` and `westgard_rules` before the Supabase call — see `updateQCReport` for the full pattern
- **Local state must mirror DB state**: always update `setEquipment` (or `setLaboratories`, etc.) after a successful Supabase write so the UI reflects the change without a full refetch
- **Equipment status cascade**: when a QC report status changes, also update `equipment.status` in both DB and local state — see how `addQCReport` does `supabase.from('equipment').update({ status: finalStatus })`
- **Do not call `fetchAllData()`** after every mutation — it re-fetches all equipment; update state surgically instead

## Verify

- [ ] Function is declared inside `QCDataProvider` (not outside)
- [ ] Function is added to the `value` object
- [ ] Joined objects stripped before any `supabase.update()`
- [ ] Local state updated after successful DB write
- [ ] Toast shown for errors with `variant: 'destructive'`
- [ ] `console.error` call with a descriptive message on catch

## Update Scaffold
- [ ] Update `.mex/ROUTER.md` "Current Project State" if what's working/not built has changed
- [ ] Update any `.mex/context/` files that are now out of date
- [ ] If this is a new task type without a pattern, create one in `.mex/patterns/` and add to `INDEX.md`
