---
name: supabase-query
description: Patterns for reading from and writing to Supabase — covering the snake_case mapping gotcha, the joined-object stripping rule, and RLS-aware queries.
triggers:
  - "supabase"
  - "query"
  - "insert"
  - "update"
  - "delete"
  - "fetch data"
  - "database"
edges:
  - target: context/conventions.md
    condition: always — conventions define the mapping rules this pattern implements
  - target: context/architecture.md
    condition: when deciding whether a query belongs in QCDataContext or a page component
  - target: patterns/debug-data.md
    condition: when a query returns unexpected results or empty data
last_updated: 2026-04-09
---

# Supabase Query

## Context

The Supabase client is at `src/lib/customSupabaseClient.js`, imported as `{ supabase }`. DB columns are snake_case; app state is camelCase. Joined objects from Supabase selects must be stripped before any update call.

## Task: Read Data

### Steps

```js
// Simple read
const { data, error } = await supabase
  .from('qc_reports')
  .select('*')
  .eq('equipment_id', equipmentId)
  .order('created_at', { ascending: false })
  .limit(20);

if (error) throw error;

// Read with join
const { data, error } = await supabase
  .from('equipment')
  .select(`
    *,
    laboratory:laboratories(name),
    type:equipment_types(name)
  `)
  .eq('is_active', true);

// After read: map snake_case → camelCase and flatten joins
const formatted = (data || []).map(eq => ({
  ...eq,
  dailyDeviationThreshold: eq.daily_deviation_threshold,
  laboratoryName: eq.laboratory?.name,   // flatten joined object
  laboratory: undefined,                  // optionally remove join object from spread
}));
```

### Gotchas

- `data` can be `null` (not `[]`) when no rows match — always use `data || []`
- Use `.maybeSingle()` instead of `.single()` when 0 rows is a valid result (`.single()` throws on 0 rows)
- RLS may return empty arrays instead of errors when the user lacks access — an empty result is not always "no data"

## Task: Write Data (Insert / Update)

### Steps

```js
// Insert
const { data: saved, error } = await supabase
  .from('qc_reports')
  .insert({
    equipment_id: reportData.equipmentId,   // camelCase → snake_case
    lot_number: reportData.lotNumber,
    level: reportData.level,
    values: reportData.values,
    status: finalStatus,
    westgard_rules: allTriggeredRules
  })
  .select()
  .single();

if (error) throw error;
```

```js
// Update — ALWAYS strip joined objects first
const {
  lots, laboratory, type, unit,          // joined relations — never send these
  laboratoryName, typeName,              // computed fields — never send these
  dailyDeviationThreshold, maintenanceDue, // camelCase — remap to snake_case
  ...cleanData
} = appObject;

const { error } = await supabase
  .from('equipment')
  .update({
    ...cleanData,
    daily_deviation_threshold: dailyDeviationThreshold,
    maintenance_due: maintenanceDue
  })
  .eq('id', id);

if (error) throw error;
```

### Gotchas

- **Most common bug**: sending `laboratory`, `type`, or `lots` in an update payload → Supabase returns "column not found" error
- Always sanitize empty strings to `null` for FK fields: `if (dbData.laboratory_id === '') dbData.laboratory_id = null;`
- After a successful write, update local state in `QCDataContext` immediately — don't wait for a full refetch unless necessary
- Use `.select().single()` after insert to get the created row's `id` — don't assume the insert succeeded

## Task: Delete Data

### Steps

```js
const { data, error } = await supabase
  .from('qc_reports')
  .delete()
  .eq('id', reportId)
  .select();  // important: .select() lets you verify rows were actually deleted

if (error) throw error;
if (!data || data.length === 0) throw new Error('No rows deleted — possible RLS restriction');
```

### Gotchas

- RLS can silently block a delete (no error, but 0 rows affected) — always check `data.length > 0` after delete with `.select()`

## Debug

- Empty result from a query that should return data → likely an RLS policy mismatch. Check user session in browser devtools → Application → Local Storage for the Supabase auth token. Verify the token is present and not expired.
- "column not found" on update → a joined object leaked into the update payload. Add it to the strip list.
- `data` is `null` after insert → check if `.select()` was chained after `.insert()`

## Update Scaffold
- [ ] Update `.mex/ROUTER.md` "Current Project State" if what's working/not built has changed
- [ ] Update any `.mex/context/` files that are now out of date
- [ ] If this is a new task type without a pattern, create one in `.mex/patterns/` and add to `INDEX.md`
