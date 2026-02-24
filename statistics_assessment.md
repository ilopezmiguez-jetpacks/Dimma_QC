# Statistics Page Assessment

## Overview

`StatisticsPage.jsx` renders a Levey-Jennings chart for QC trend analysis. Users select an equipment, level, parameter, and date range. The page fetches `qc_reports` from Supabase, filters them by active lot and level, and plots the measured values against standard deviation reference lines (mean, ±1s, ±2s, ±3s).

---

## How It Works

### Data Flow

1. **Equipment list** comes from `QCDataContext` (pre-loaded).
2. On equipment/date change, the component fetches `qc_reports` from Supabase filtered by `equipment_id` and date range.
3. The **active lot** is derived from the selected equipment (`lots.find(l => l.isActive)`).
4. Reports are further filtered client-side by `lotNumber` and `selectedLevel`.
5. Chart data is built by extracting `report.values[selectedParam]` for the Y-axis and formatted date for the X-axis.
6. QC parameters (`mean`, `sd`) are read from `activeLot.qc_params[level][param]` to draw the reference lines.

### Chart Configuration

The chart uses Recharts `<LineChart>` with:
- **X-axis**: date formatted as `DD/MM`
- **Y-axis**: `domain={['dataMin - 1', 'dataMax + 1']}`
- **Reference lines**: Mean (black), ±1s (green), ±2s (orange), ±3s (red)
- **Data line**: measured values connected with `type="monotone"`

---

## Root Cause of the Reported Issue: Y-Axis Too Wide

### The Problem

Users report that the Y-axis intervals are sometimes too wide, making the standard deviation reference lines appear collapsed/invisible—all the SD lines cluster into a thin band while the Y-axis stretches to accommodate outlier data points.

### Why It Happens

The Y-axis domain is set to:

```jsx
<YAxis domain={['dataMin - 1', 'dataMax + 1']} />
```

This means the axis range is **driven entirely by the actual measured values**, with a fixed ±1 unit padding. There are two problematic scenarios:

#### Scenario A: Outlier Data Points

If a patient sample has an outlier (e.g., mean=100, SD=2, but one value is 150), the Y-axis stretches from ~99 to ~151. The SD lines at 98–102 (±1s), 96–104 (±2s), and 94–106 (±3s) all compress into a tiny band at the bottom of the chart, becoming indistinguishable.

#### Scenario B: Parameters with Small SD Relative to Values

For analytes where the mean is large but SD is small (e.g., Glucose: mean=250, SD=3), the fixed ±1 padding is reasonable, but even a couple of out-of-range points can cause the same compression effect. The ±3s range spans only 18 units (232–268) while the chart may span 200+ units.

#### Scenario C: The ±1 Padding Is Unit-Agnostic

The hardcoded `dataMin - 1` / `dataMax + 1` padding treats all parameters equally regardless of their units or scale. For a parameter measured in thousands, ±1 is negligible. For one measured in single digits, ±1 may be excessive relative to the SD.

### Additional Note

The same issue exists in `EquipmentDetailPage.jsx` (line 435), which uses the identical `domain={['dataMin - 1', 'dataMax + 1']}` pattern.

---

## Recommended Fix Direction

The Y-axis domain should be calculated based on the **QC parameters** (mean and SD), not on the raw data alone. A proper Levey-Jennings chart should:

1. **Set the Y-axis range to at least mean ± 4s** (or ±3.5s with padding), ensuring all reference lines are always visible and well-spaced.
2. **Expand the range if data points fall outside** that window, so no data is clipped—but keep the SD lines as the primary visual anchor.
3. **Use a computed domain** like:
   - `yMin = Math.min(mean - 4*sd, dataMin)`
   - `yMax = Math.max(mean + 4*sd, dataMax)`

   This guarantees the SD lines are always visually prominent while still showing outliers.

---

## Other Observations

| Area | Detail |
|---|---|
| **No tick customization** | The Y-axis has no `tickCount` or `ticks` prop, so Recharts auto-calculates intervals that may not align with SD boundaries. Explicitly setting ticks at mean, ±1s, ±2s, ±3s would improve readability. |
| **String-based domain** | Recharts interprets `'dataMin - 1'` as a string expression. This works but is fragile—a computed numeric domain would be more robust and controllable. |
| **parseFloat on every render** | Reference line values call `parseFloat()` inline on each render (lines 182–188). These could be memoized alongside `qcParamsForChart`. |
| **CustomTooltip defined inside render** | `CustomTooltip` is defined inside the component body (line 113), causing a new function reference every render. This can cause unnecessary re-renders of the tooltip. |
| **No data point markers for rule violations** | Westgard rule violations are only shown in the tooltip on hover. Points that violate rules should ideally have a visual indicator (e.g., red dot) directly on the chart for immediate visibility. |
| **Date formatting locale** | The X-axis dates use `en-CA` locale with `day/month` format, which may confuse users expecting `DD/MM` vs `MM/DD` depending on their region. |

---

## Implementation Plan

### Step 1: ✅ Memoize QC reference values in `StatisticsPage.jsx`

Currently `parseFloat()` is called inline 14 times across lines 182–188. Replace the raw `qcParamsForChart` lookup (line 111) with a memoized object that pre-computes all reference values.

**Location**: `StatisticsPage.jsx`, after line 111 (`const qcParamsForChart = ...`)

```jsx
// Replace line 111:
//   const qcParamsForChart = activeLot?.qc_params?.[selectedLevel]?.[selectedParam];
// With:
const qcRef = useMemo(() => {
  const raw = activeLot?.qc_params?.[selectedLevel]?.[selectedParam];
  if (!raw) return null;
  const mean = parseFloat(raw.mean);
  const sd = parseFloat(raw.sd);
  if (isNaN(mean) || isNaN(sd) || sd === 0) return null;
  return {
    mean,
    sd,
    plus1s: mean + sd,
    minus1s: mean - sd,
    plus2s: mean + 2 * sd,
    minus2s: mean - 2 * sd,
    plus3s: mean + 3 * sd,
    minus3s: mean - 3 * sd,
  };
}, [activeLot, selectedLevel, selectedParam]);
```

This replaces `qcParamsForChart` throughout the component. Every subsequent reference uses `qcRef.mean`, `qcRef.plus2s`, etc. instead of inline `parseFloat()` calls.

---

### Step 2: ✅ Compute the Y-axis domain based on QC params + data

Add a new `useMemo` that calculates `yDomain` by anchoring to the SD lines and expanding only if data falls outside.

**Location**: `StatisticsPage.jsx`, after the new `qcRef` memo

```jsx
const yDomain = useMemo(() => {
  if (!qcRef || chartData.length === 0) return undefined; // let Recharts auto-scale

  // Anchor to ±4s so all SD lines (up to ±3s) are always clearly visible
  let yMin = qcRef.mean - 4 * qcRef.sd;
  let yMax = qcRef.mean + 4 * qcRef.sd;

  // Expand if any data points fall outside the ±4s window
  const values = chartData.map(d => d.value).filter(v => v != null);
  if (values.length > 0) {
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    yMin = Math.min(yMin, dataMin - qcRef.sd * 0.5);
    yMax = Math.max(yMax, dataMax + qcRef.sd * 0.5);
  }

  return [yMin, yMax];
}, [qcRef, chartData]);
```

Key behaviors:
- **Default range**: mean ± 4 SD — this guarantees ±3s lines sit at 75% of the axis height, always well-spaced and visible.
- **Outlier expansion**: if a data point exceeds ±4s, the axis expands by an extra 0.5 SD of padding so the point isn't clipped at the edge.
- **Fallback**: if `qcRef` is null (no QC params configured), returns `undefined` so Recharts uses its default auto-scale.

---

### Step 3: ✅ Apply the computed domain and custom ticks to `<YAxis>`

Replace the current `<YAxis>` on line 177.

**Location**: `StatisticsPage.jsx`, line 177

```jsx
// Replace:
//   <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
// With:
<YAxis
  domain={yDomain}
  ticks={qcRef ? [qcRef.minus3s, qcRef.minus2s, qcRef.minus1s, qcRef.mean, qcRef.plus1s, qcRef.plus2s, qcRef.plus3s] : undefined}
  allowDataOverflow={false}
/>
```

- `ticks`: Explicitly sets Y-axis labels at each SD boundary, making the chart read like a proper Levey-Jennings grid.
- `allowDataOverflow={false}`: Ensures Recharts doesn't clip data points outside the domain (it expands if needed).

---

### Step 4: ✅ Update `<ReferenceLine>` components to use `qcRef`

Replace all inline `parseFloat()` calls in lines 182–188.

**Location**: `StatisticsPage.jsx`, lines 180–190

```jsx
{qcRef && (
  <>
    <ReferenceLine y={qcRef.mean} label="Media" stroke="black" strokeDasharray="3 3" />
    <ReferenceLine y={qcRef.plus1s} label="+1s" stroke="green" strokeDasharray="3 3" />
    <ReferenceLine y={qcRef.minus1s} label="-1s" stroke="green" strokeDasharray="3 3" />
    <ReferenceLine y={qcRef.plus2s} label="+2s" stroke="orange" strokeDasharray="3 3" />
    <ReferenceLine y={qcRef.minus2s} label="-2s" stroke="orange" strokeDasharray="3 3" />
    <ReferenceLine y={qcRef.plus3s} label="+3s" stroke="red" strokeDasharray="3 3" />
    <ReferenceLine y={qcRef.minus3s} label="-3s" stroke="red" strokeDasharray="3 3" />
  </>
)}
```

---

### Step 5: ✅ Move `CustomTooltip` outside the component body

The current `CustomTooltip` (line 113) is recreated on every render. Move it outside and pass `selectedParam` as a data property.

**Location**: Above `const StatisticsPage = () => {` (line 11)

```jsx
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const paramName = payload[0].name;
    return (
      <div className="p-2 bg-white border rounded-lg shadow-lg">
        <p className="font-bold">{`Fecha: ${label}`}</p>
        <p className="text-sm" style={{ color: payload[0].stroke }}>{`${paramName}: ${payload[0].value}`}</p>
        {payload[0].payload.rules && <p className="text-xs text-red-500">{`Reglas: ${payload[0].payload.rules}`}</p>}
      </div>
    );
  }
  return null;
};
```

This works because the `<Line>` component already passes `name={selectedParam}` (line 191), which Recharts includes in `payload[0].name`.

---

### Step 6: ✅ Apply the same fix to `EquipmentDetailPage.jsx`

The equipment detail page has an identical chart with the same `domain` problem at line 435.

**Location**: `EquipmentDetailPage.jsx`, lines 431–448

Apply the same pattern:
1. Create a `qcRef` memo from the existing `qcParamsForChart` variable (already present in that file).
2. Compute `yDomain` using the same mean ± 4s logic.
3. Replace `<YAxis domain={['dataMin - 1', 'dataMax + 1']} label={yAxisLabel} />` with:

```jsx
<YAxis
  domain={yDomain}
  ticks={qcRef ? [qcRef.minus3s, qcRef.minus2s, qcRef.mean, qcRef.plus2s, qcRef.plus3s] : undefined}
  label={yAxisLabel}
  allowDataOverflow={false}
/>
```

Note: `EquipmentDetailPage` only renders ±2s and ±3s reference lines (no ±1s), so the ticks array omits `±1s` to match.

---

### Summary of Files to Change

| File | Changes |
|---|---|
| `src/pages/StatisticsPage.jsx` | Add `qcRef` memo, add `yDomain` memo, update `<YAxis>`, update `<ReferenceLine>` components, extract `CustomTooltip` |
| `src/pages/EquipmentDetailPage.jsx` | Add `qcRef` memo, add `yDomain` memo, update `<YAxis>`, update `<ReferenceLine>` components |
