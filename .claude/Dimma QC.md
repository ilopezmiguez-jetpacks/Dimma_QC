# **Implementation Plan: "No aplica" Checkbox for QC Reports**

## **Context**

The QC (Quality Control) report system currently requires all parameter values to be filled with numeric measurements before a report can be submitted. This creates a problem when certain parameters don't apply to a specific test scenario or equipment state. Users need the ability to mark individual parameters as "No aplica" (Not Applicable), which should:

1. Exempt those parameters from required field validation  
2. Store "N/A" as the value instead of a number  
3. Allow reports with "N/A" values to be validated successfully  
4. Skip Westgard statistical analysis for "N/A" values (since statistical rules don't apply to non-numeric data)

This feature enhances flexibility in QC reporting by acknowledging that not all parameters are relevant in every testing scenario.

---

## **Current System Overview**

### **Data Flow**

1. **Input**: Users enter QC values in LoadControlPage.jsx (lines 262-284)  
2. **Validation**: Required field check in LoadControlPage (lines 125-135) \+ numeric filtering in QCDataContext.jsx (lines 211-215)  
3. **Storage**: Values stored as JSONB object with numeric values only  
4. **Analysis**: Westgard rules applied to validate against statistical limits (lines 253-267)

### **Current Validation Logic**

* **UI Level**: All parameter fields must be non-empty (LoadControlPage.jsx:125-135)  
* **Context Level**: Values filtered to ensure they're non-null, non-empty, and numeric (QCDataContext.jsx:211-215)  
* **Westgard Level**: Numeric values validated against mean ± 2SD and mean ± 3SD limits

---

## **Implementation Plan**

### **Phase 1: UI Component Updates**

#### **1.1 Add "No aplica" Checkbox to LoadControlPage**

**File**: src/pages/LoadControlPage.jsx

**Changes at lines 262-284** (parameter input section):

* Add state to track which parameters are marked as "No aplica": const \[noAplicaParams, setNoAplicaParams\] \= useState({})  
* For each parameter, add a checkbox alongside the input field  
* When checkbox is checked:  
  * Disable the numeric input field  
  * Auto-set value to "N/A" in currentLevelData  
  * Visually indicate the field is disabled (gray background, opacity reduction)  
* When unchecked:  
  * Re-enable the input field  
  * Clear the "N/A" value to allow numeric input

**UI Layout** (for each parameter):

\<div key={param} className="relative group"\>  
  \<div className="flex items-center justify-between mb-1"\>  
    \<label className="block text-sm font-medium text-gray-700"\>  
      {param} \<span className="text-gray-500"\>({unit})\</span\>  
    \</label\>  
    \<div className="flex items-center gap-2"\>  
      \<input  
        type="checkbox"  
        id={\`na-${param}\`}  
        checked={noAplicaParams\[param\] || false}  
        onChange={(e) \=\> handleNoAplicaChange(param, e.target.checked)}  
        className="h-4 w-4"  
      /\>  
      \<label htmlFor={\`na-${param}\`} className="text-xs text-gray-600"\>  
        No aplica  
      \</label\>  
    \</div\>  
  \</div\>

  \<p className="text-xs text-muted-foreground"\>  
    Rango 2SD: {range} | Último: {lastValue}  
  \</p\>

  \<input  
    type="number"  
    step="any"  
    value={currentLevelData\[param\] || ''}  
    onChange={(e) \=\> handleInputChange(param, e.target.value)}  
    disabled={noAplicaParams\[param\]}  
    className={cn(  
      "input-class",  
      noAplicaParams\[param\] && "bg-gray-100 opacity-60 cursor-not-allowed"  
    )}  
  /\>  
\</div\>

**New Handler Functions**:

const handleNoAplicaChange \= (param, isChecked) \=\> {  
  setNoAplicaParams(prev \=\> ({  
    ...prev,  
    \[param\]: isChecked  
  }));

  if (isChecked) {  
    handleInputChange(param, 'N/A');  
  } else {  
    handleInputChange(param, '');  
  }  
};

#### **1.2 Update EditQCReportModal**

**File**: src/components/EditQCReportModal.jsx

**Changes at lines 113-134** (existing parameters section):

* Add similar checkbox UI for each existing parameter  
* Track "N/A" state in local component state  
* Pre-populate checkboxes based on existing report values (if value \=== "N/A", checkbox should be checked)  
* Handle toggling between "N/A" and numeric input

---

### **Phase 2: Validation Logic Updates**

#### **2.1 Update Form Validation in LoadControlPage**

**File**: src/pages/LoadControlPage.jsx

**Modify lines 125-135** (validation before submission):

// OLD: All fields must be non-empty  
const missingFields \= Object.keys(formParams).some(param \=\>  
  \!currentLevelData\[param\] || currentLevelData\[param\].toString().trim() \=== ''  
);

// NEW: Fields must be non-empty OR marked as "N/A"  
const missingFields \= Object.keys(formParams).some(param \=\> {  
  const value \= currentLevelData\[param\];  
  return (\!value || value.toString().trim() \=== '') && value \!== 'N/A';  
});

#### **2.2 Update Value Filtering in QCDataContext**

**File**: src/contexts/QCDataContext.jsx

**Modify lines 211-215** (addQCReport function):

// OLD: Filter out non-numeric values  
const filteredValues \= Object.fromEntries(  
  Object.entries(reportData.values).filter((\[, value\]) \=\>  
    value \!== null && value \!== '' && \!isNaN(parseFloat(value))  
  )  
);

// NEW: Accept "N/A" as valid, filter out only truly empty values  
const filteredValues \= Object.fromEntries(  
  Object.entries(reportData.values).filter((\[, value\]) \=\> {  
    if (value \=== 'N/A') return true;  // Explicitly allow N/A  
    return value \!== null && value \!== '' && \!isNaN(parseFloat(value));  
  })  
);

**Apply same change in updateQCReport function** (lines 313-421, similar filtering logic).

---

### **Phase 3: Westgard Rules Handling**

#### **3.1 Skip Westgard Analysis for "N/A" Values**

**File**: src/contexts/QCDataContext.jsx

**Modify lines 253-267** (Westgard rules application loop):

// Inside addQCReport, when processing each parameter:  
for (const \[param, value\] of Object.entries(filteredValues)) {  
  // Skip Westgard analysis for N/A values  
  if (value \=== 'N/A') {  
    continue;  // Don't add to triggeredRules, don't affect status  
  }

  // Existing Westgard logic for numeric values  
  const history \= historyByParam\[param\] || \[\];  
  const qcParams \= activeLot?.qc\_params?.\[reportData.level\]?.\[param\];

  if (qcParams) {  
    const result \= applyWestgardRules(value, history, qcParams);  
    if (result.status \!== 'ok') {  
      if (result.status \=== 'error') finalStatus \= 'error';  
      else if (finalStatus \!== 'error') finalStatus \= 'warning';  
    }  
    allTriggeredRules.push(...result.triggeredRules);  
  }  
}

**Note**: "N/A" values should not trigger errors, warnings, or contribute to Westgard rule violations. They are simply recorded as-is and ignored during statistical analysis.

---

### **Phase 4: Display & Visualization Updates**

#### **4.1 Update Report Display in EquipmentDetailPage**

**File**: src/pages/EquipmentDetailPage.jsx

**Changes needed**:

* When displaying report values in tables, show "N/A" text instead of trying to format as number  
* For statistics calculations (lines 26-33), exclude "N/A" values from mean/SD/CV calculations  
* In Levey-Jennings chart data transformation (lines 288-292), filter out "N/A" values or show them as gaps in the chart

**Statistics calculation update** (lines 26-33):

const calculateStats \= (reports, param) \=\> {  
  // Filter out N/A values before calculating statistics  
  const numericValues \= reports  
    .filter(r \=\> r.values && r.values\[param\] \!== undefined && r.values\[param\] \!== 'N/A')  
    .map(r \=\> parseFloat(r.values\[param\]))  
    .filter(v \=\> \!isNaN(v));

  if (numericValues.length \=== 0\) return { n: 0, mean: '-', sd: '-', cv: '-' };

  const mean \= numericValues.reduce((a, b) \=\> a \+ b, 0\) / numericValues.length;  
  const variance \= numericValues.reduce((sum, val) \=\> sum \+ Math.pow(val \- mean, 2), 0\) / numericValues.length;  
  const sd \= Math.sqrt(variance);  
  const cv \= (sd / mean) \* 100;

  return { n: numericValues.length, mean: mean.toFixed(2), sd: sd.toFixed(2), cv: cv.toFixed(2) };  
};

#### **4.2 Update Chart Visualization**

**Lines 288-292** (chart data transformation):

const chartData \= filteredReports  
  .filter(report \=\> {  
    const value \= report.values?.\[selectedParam\];  
    // Exclude N/A values from chart  
    return value \!== undefined && value \!== 'N/A';  
  })  
  .map(report \=\> ({  
    date: new Date(report.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),  
    value: parseFloat(report.values\[selectedParam\]),  
    rules: report.westgard\_rules?.join(', ') || '',  
  }));

#### **4.3 Update Dashboard Display**

**File**: src/pages/Dashboard.jsx

**Check lines 300-378** (detailed report view):

* When displaying parameter values in the modal, render "N/A" as text for non-numeric values  
* Format only numeric values with .toFixed(2)

---

### **Phase 5: State Persistence**

#### **5.1 Preserve "No aplica" State Across Levels**

**File**: src/pages/LoadControlPage.jsx

Currently, allLevelsData stores values across multiple levels. We need to also preserve noAplicaParams state:

**Add new state**:

const \[allLevelsNoAplica, setAllLevelsNoAplica\] \= useState({});

**Update level switching logic** (around lines 96-108):

* When switching levels, save current noAplicaParams to allLevelsNoAplica\[selectedLevel\]  
* Load noAplicaParams from allLevelsNoAplica\[newLevel\] when switching to a different level  
* Clear state after successful submission (lines 147-153)

---

## **Critical Files to Modify**

| File | Lines | Changes |
| ----- | ----- | ----- |
| src/pages/LoadControlPage.jsx | 125-135, 262-284 | Add checkbox UI, update validation logic, preserve state |
| src/components/EditQCReportModal.jsx | 113-134 | Add checkbox UI for editing existing reports |
| src/contexts/QCDataContext.jsx | 211-215, 253-267, 313-421 | Allow "N/A" values, skip Westgard for "N/A" |
| src/pages/EquipmentDetailPage.jsx | 26-33, 288-292 | Exclude "N/A" from stats & charts |
| src/pages/Dashboard.jsx | 300-378 | Display "N/A" properly in report details |

---

## **Existing Utilities to Reuse**

* **Toast notifications** from @/hooks/use-toast \- for validation error messages  
* **UI components** from shadcn/ui:  
  * Checkbox from @/components/ui/checkbox (may need to be created if doesn't exist)  
  * Input component for consistent styling  
  * cn() utility from @/lib/utils for conditional classes

---

## **Verification & Testing**

### **Manual Testing Checklist:**

1. **Create QC Report with "No aplica"**:  
   * Navigate to Load Control page  
   * Select equipment, lot, and level  
   * Check "No aplica" for one or more parameters  
   * Verify numeric input is disabled for checked parameters  
   * Verify value shows as "N/A"  
   * Submit report successfully  
2. **Validation Testing**:  
   * Try submitting with some regular values and some "N/A" \- should succeed  
   * Verify "N/A" parameters don't trigger Westgard errors  
   * Verify validation badge shows correct status  
3. **Edit Report with "N/A"**:  
   * Open existing report with "N/A" values  
   * Verify checkboxes are pre-checked for "N/A" parameters  
   * Toggle checkbox off, enter numeric value, save  
   * Toggle checkbox on, verify becomes "N/A" again  
4. **Statistics & Charts**:  
   * View Equipment Detail page with reports containing "N/A"  
   * Verify statistics (mean, SD, CV) exclude "N/A" values  
   * Verify Levey-Jennings chart doesn't plot "N/A" values  
   * Verify no console errors when rendering  
5. **Multi-Level Reports**:  
   * Create report with multiple levels  
   * Mark "No aplica" in Level 1, fill Level 2 normally  
   * Switch between levels, verify state is preserved  
   * Submit both levels, verify both save correctly  
6. **Database Verification**:  
   * Use Supabase dashboard to check qc\_reports table  
   * Verify values JSONB contains { "PARAM": "N/A" } for marked parameters  
   * Verify report can be validated (is\_validated \= true) even with "N/A" values

---

## **Edge Cases to Handle**

1. **All parameters marked "No aplica"**: Should still allow submission (report exists but no numeric data)  
2. **Historical reports without "N/A"**: Should display normally (backward compatibility)  
3. **Switching from numeric to "N/A" and back**: Should clear previous value and allow fresh input  
4. **Report editing**: Toggling "N/A" on existing numeric value should prompt confirmation (optional enhancement)  
5. **Westgard 2-2s rule**: If history has "N/A", skip those entries when checking consecutive violations

---

## **Implementation Order**

1. ✅ Phase 1.1: Add checkbox UI to LoadControlPage  
2. ✅ Phase 2.1: Update form validation in LoadControlPage  
3. ✅ Phase 2.2: Update value filtering in QCDataContext (addQCReport)  
4. ✅ Phase 3.1: Skip Westgard for "N/A" values  
5. ✅ Phase 5.1: Preserve state across levels  
6. ✅ Phase 1.2: Add checkbox UI to EditQCReportModal  
7. ✅ Phase 2.2: Update value filtering in updateQCReport  
8. ✅ Phase 4.1: Update statistics calculation  
9. ✅ Phase 4.2: Update chart visualization  
10. ✅ Phase 4.3: Update Dashboard display  
11. ✅ Test all verification scenarios

---

## **Notes**

* The "N/A" string is used instead of null/undefined to explicitly indicate "Not Applicable" vs "Not Entered"  
* This maintains data integrity and makes the intent clear in the database  
* No database schema changes required \- JSONB already supports mixed types (strings and numbers)  
* The checkbox provides better UX than requiring users to type "N/A" manually

