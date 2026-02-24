# Research Report: `src/` Directory — DIMMA QC

## 1. High-Level Overview

DIMMA QC is a **clinical laboratory quality control management system** built as a React SPA. It tracks laboratory equipment, manages daily QC control reports using **Westgard rules**, handles multi-laboratory environments, and includes a secondary clinical workflow for patients and analysis results.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18.2 (Vite 6.4, ESM) |
| Routing | React Router DOM 6.16 |
| Backend / DB | Supabase (Auth + PostgreSQL + Cloud Functions) |
| Styling | Tailwind CSS 3.3 + Radix UI primitives + custom CSS |
| Charts | Recharts 2.9 |
| Animations | Framer Motion 10.16 |
| Icons | Lucide React |
| SEO | React Helmet |
| Testing | Jest 30 + Testing Library (dev dependencies present, no test files found) |

### Package name: `labclinico-app` (legacy name from broader clinical lab product)

---

## 2. Architecture

### 2.1 Entry Point

**`main.jsx`** — Minimal bootstrap. Renders `<App />` into `#root`. No StrictMode wrapper.

**`App.jsx`** — The application shell:
```
AuthProvider → QCDataProvider → BrowserRouter → Routes
```

All authenticated routes are wrapped in `<ProtectedRoute><Layout>...</Layout></ProtectedRoute>`.

### 2.2 Provider Hierarchy

```
AuthProvider (SupabaseAuthContext)
  └─ QCDataProvider (QCDataContext)
       └─ Router
            └─ Layout (sidebar + header + content)
                 └─ Page Components
```

There is also a **`DataContext`** (for patients/results) but it is NOT mounted in `App.jsx`. It exists as dead code or is intended for pages not currently routed (patients, samples, etc.).

### 2.3 Active Routes (from App.jsx)

| Route | Component | Access |
|-------|-----------|--------|
| `/login` | LoginPage | Public |
| `/` | Dashboard | Protected |
| `/equipment` | EquipmentPage | Protected |
| `/equipment/:equipmentId` | EquipmentDetailPage | Protected |
| `/load-control` | LoadControlPage | Protected |
| `/statistics` | StatisticsPage | Protected |
| `/settings` | SettingsPage | **Admin only** |

Legacy Spanish routes (`/equipos`, `/cargar-control`, `/estadisticas`, `/configuracion`) redirect to their English equivalents. Catch-all `*` redirects to `/`.

### 2.4 Orphaned/Unused Pages

These pages exist in `src/pages/` but have **NO routes in App.jsx**:

| File | Purpose |
|------|---------|
| `PatientsPage.jsx` | Patient registry (grid of PatientCards) |
| `PatientHistoryPage.jsx` | Individual patient timeline |
| `SamplesPage.jsx` | Sample processing worklist |
| `ResultsPage.jsx` | Analysis results list |
| `ResultDetailPage.jsx` | Individual result editing + approval workflow |
| `IntegrationPage.jsx` | Equipment data import (AadeeMiniISE protocol) |
| `ReportsPage.jsx` | Statistical charts of lab activity |
| `EquipmentTypesPage.jsx` | Equipment type CRUD |

These appear to belong to a broader "LabClinico Pro" product. The `DataContext` that powers them is also not mounted. They are **dead code** in the current routing setup but are referenced by `llms.txt` generation (which scans all files with Helmet).

---

## 3. Context Layer (State Management)

### 3.1 `SupabaseAuthContext.jsx` — Authentication

**Provides:** `user`, `session`, `loading`, `signUp`, `signIn`, `signOut`

- Wraps Supabase Auth with session listener (`onAuthStateChange`)
- Enriches user object with profile data from `profiles` table (including `assignedLabs` via `user_laboratories` join)
- Role is resolved as: `profile.role || user_metadata.role`
- Blocks rendering (`{!loading && children}`) until session is resolved
- Toast notifications on auth errors (Spanish UI strings)

**DB tables:** `profiles`, `user_laboratories`, `laboratories`

### 3.2 `QCDataContext.jsx` — QC Domain Data (Primary)

**Provides:** `equipment`, `laboratories`, `equipmentTypes`, `parameters`, `units`, `alarms`, `currentLabId`, `loading` + 12 action functions

**This is the heart of the app.** It manages:

1. **Metadata loading** (on mount): laboratories, equipment types, units, parameters
2. **Equipment fetching** (reactive to `currentLabId`): equipment with nested lots, lab names, type names. Transforms DB snake_case to app camelCase.
3. **QC Report CRUD:**
   - `addQCReport` — Creates report, runs Westgard analysis against last 20 historical reports, determines status (ok/warning/error), updates equipment status
   - `updateQCReport` — Re-runs Westgard on edited values, updates DB and local state
   - `validateQCReport` — Marks report as validated with user ID and timestamp
4. **Equipment CRUD:** add, update, delete (hard delete)
5. **Lot Management:** add, delete, toggle active, update params, update details

**Westgard Rules Implemented:**
- **1-3s:** Value exceeds mean +/- 3 SD → ERROR
- **1-2s:** Value exceeds mean +/- 2 SD → WARNING
- **2-2s:** Two consecutive values exceed mean +/- 2 SD on same side → ERROR

**DB tables:** `equipment`, `control_lots`, `qc_reports`, `laboratories`, `equipment_types`, `parameters`, `units`

**Notable:** `alarms` state is initialized as `[]` and never populated (comment: "fix the crash"). Likely vestigial.

### 3.3 `DataContext.jsx` — Clinical Data (Unused)

**Provides:** `patients`, `results`, `equipment`, `loading` + CRUD functions

- Fetches patients and analysis results from Supabase
- Lab-scoped filtering for non-admin users
- `generateResultData()` — Creates empty result template based on equipment type parameters
- `addPatient()` — Creates patient + analysis orders in one transaction

**DB tables:** `patients`, `analysis_results`, `parameters`

**Status: NOT mounted in App.jsx. Dead code in current production build.**

---

## 4. Utility Layer

### 4.1 `lib/customSupabaseClient.js`
Creates and exports the Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars. Triple-exported as `default`, `customSupabaseClient`, and `supabase`.

### 4.2 `lib/utils.js`
Single `cn()` function — merges Tailwind classes via `clsx` + `tailwind-merge`. Standard shadcn/ui pattern.

### 4.3 `lib/parameters.js`
Predefined parameter templates for 5 equipment categories:

| Category | Key | Parameter Count |
|----------|-----|----------------|
| Hematology | `hematology` | 13 (WBC, RBC, HGB, HCT, MCV, MCH, MCHC, PLT, NEU%, LYM%, MONO%, EOS%, BASO%) |
| Clinical Chemistry | `chemistry` | 13 (GLU, UREA, CREA, CHOL, TRIG, BILT, BILD, AST, ALT, GGT, ALP, PROT, ALB) |
| Ionogram | `ionogram` | 5 (Na+, K+, Cl-, Ca++, Mg++) |
| Blood Gas | `gas` | 5 (pH, pCO2, pO2, HCO3-, BE) |
| Coagulation | `coagulation` | 4 (PT, APTT, FIB, TT) |

Also exports `commonUnits` array (15 units like mg/dL, g/dL, U/L, etc.).

All mean/SD values are initialized to 0 — these are templates, not actual QC targets.

### 4.4 `utils/permissions.js`
Simple role-based permission checker:
- **Admin:** All permissions
- **Biochemist:** `validate_results`, `manage_lots`
- **Technician:** Everything except explicitly restricted actions
- **Restricted to admin only:** `create_user`, `delete_equipment`

---

## 5. Component Layer

### 5.1 UI Primitives (`components/ui/`)

Standard **shadcn/ui** component library built on Radix UI:

| Component | Radix Primitive |
|-----------|----------------|
| `alert-dialog.jsx` | AlertDialog |
| `avatar.jsx` | Avatar |
| `badge.jsx` | — (pure CSS) |
| `button.jsx` | Slot |
| `checkbox.jsx` | Checkbox |
| `dialog.jsx` | Dialog |
| `dropdown-menu.jsx` | DropdownMenu |
| `input.jsx` | — (native) |
| `label.jsx` | Label |
| `select.jsx` | Select |
| `sheet.jsx` | Dialog (as sheet) |
| `switch.jsx` | Switch |
| `table.jsx` | — (native) |
| `tabs.jsx` | Tabs |
| `toast.jsx` / `toaster.jsx` / `use-toast.js` | Toast |

All follow the standard shadcn/ui patterns with `cn()` for class merging and `cva` for variants.

### 5.2 Application Components

#### `Layout.jsx` (~192 lines)
- Fixed sidebar (hidden on mobile, visible on lg+) with nav links
- Mobile hamburger menu via Sheet component
- Header bar with `LabSelector` component
- User dropdown at bottom of sidebar showing name, email, role, lab, sign out
- **Nav items:** Tablero, Equipos, Cargar Control, Estadisticas, Configuracion (admin only)
- Duplicated sidebar content for mobile sheet (code duplication)

#### `ProtectedRoute.jsx` (~28 lines)
- Redirects to `/login` if no user
- Redirects to `/` if `adminOnly` route and user is not admin
- Shows loading state while auth resolves

#### `LabSelector.jsx` (~51 lines)
- Dropdown to switch between laboratories
- Admins see "Todos los Laboratorios" + all labs
- Non-admins see only their assigned labs (visible only if >1 lab assigned)
- Sets `currentLabId` in QCDataContext, triggering equipment refetch

#### `EditQCReportModal.jsx` (~245 lines)
- Dialog for editing existing QC report values
- Supports "N/A" checkbox per parameter (disables numeric input)
- Shows expected range (mean +/- 2SD) for each parameter
- Allows adding entirely new parameters to a report
- Calls `updateQCReport` which re-runs Westgard analysis

#### `PatientCard.jsx` (~106 lines)
- Card display for patient with name, DNI, age, sex, obra social
- Patient type badges: Guardia (orange), Internado (teal), Externo (indigo)
- Edit button (role-gated) and History navigation
- Framer Motion entrance animation
- **Dead code** — no active route renders this component

#### `PatientModal.jsx` (~260 lines)
- Multi-mode modal: create, edit, view, add-analysis
- Argentine-specific fields: DNI (7-8 digits), Obra Social (health insurance), Numero Afiliado
- Patient types: guardia/internado/externo
- Analysis order creation with chemistry sub-selections
- Validation with error messages
- **Dead code** — no active route uses this

#### `WelcomeMessage.jsx`, `CallToAction.jsx`, `HeroImage.jsx`
- Hostinger Horizons boilerplate components. Sparkle SVG icon, generic English text.
- **Dead code** — not imported anywhere in active routes.

### 5.3 Settings Tab Components

These are rendered inside `SettingsPage` via tab navigation:

#### `GeneralSettingsTab.jsx` (~209 lines)
- Edit lab info: name, CUIT, address, phone, email, technical director, license number
- Loads first laboratory record from DB

#### `SecuritySettingsTab.jsx` (~114 lines)
- Password change form (6+ chars, confirmation match)
- 2FA toggle (stub — "coming soon")

#### `QCSettingsTab.jsx` (~160 lines)
- Equipment list with expandable lot management
- Toggle lot active/inactive
- Edit lot numbers, expiration dates
- View/edit QC parameters (mean/SD) per level

#### `UsersSettingsTab.jsx` (~421 lines)
- User CRUD with multi-laboratory assignment
- Create users via Supabase Cloud Function (`create-user`)
- Authorize pending users (check `email_confirmed_at`)
- Role selection: Admin, Biochemist, Technician
- Delete button is stub ("coming soon")

#### `BaseParametersTab.jsx` (~217 lines)
- Master parameter catalog CRUD
- Assign equipment type and default unit
- Uses RPC `upsert_parameter` for save operations
- Soft delete (is_active flag)

#### `ParameterProfilesTab.jsx` (~197 lines)
- Predefined QC value templates for reuse
- Links to base parameters
- Uses RPC `upsert_predefined_parameter`

#### `BackupSettingsTab.jsx` (~37 lines)
- Informational only — shows backup status message
- No actual backup functionality

#### `NotificationSettingsTab.jsx` (~46 lines)
- Toggle switches for email, equipment alerts, maintenance reminders
- **Settings are not persisted** — resets on page refresh

#### `AppearanceSettingsTab.jsx` (~27 lines)
- Placeholder — shows "Light mode" info
- No actual theme switching

---

## 6. Page Layer (Active Routes)

### 6.1 `LoginPage.jsx` (~235 lines)
- Email/password sign-in form
- Password visibility toggle
- "Forgot password" flow via AlertDialog (sends Supabase reset email)
- Split layout: form on left, branded hero on right (large screens)
- Logo loaded from Hostinger CDN
- Redirects to `/` if already authenticated

### 6.2 `Dashboard.jsx` (~520 lines)
- **Greeting** with time-of-day (Buenos dias/tardes/noches) + user name
- **4 stat cards:** Total equipment, OK equipment, Alerting equipment, Maintenance due (maintenance hidden from technicians)
- **Pending Validations table** (biochemist/admin only): Lists unvalidated QC reports with View, Edit, Validate actions. Validate is disabled unless report status is `ok`.
- **Equipment with Problems panel:** Lists equipment in warning/error state
- **Reports Today counter:** Count of QC reports submitted today
- Includes `EditQCReportModal` for inline corrections

### 6.3 `EquipmentPage.jsx` (~390 lines)
- Grid of equipment cards with status badges (OK/Warning/Error)
- Search by name/model + status filter tabs (All, OK, With Alerts, Maintenance)
- Pending validation count badge per equipment
- Admin: Edit equipment inline dialog (name, model, serial, type, lab)
- Admin: "Add Equipment" navigates to settings
- Each card has "Cargar" button → navigates to LoadControlPage with equipmentId

### 6.4 `EquipmentDetailPage.jsx` (~570 lines)
The most feature-rich page:
- **Header:** Equipment name, model, serial, status, active lot selector
- **Levey-Jennings Chart:** Interactive line chart with reference lines at mean, +/-2s, +/-3s. Filterable by level and parameter.
- **Daily Control Form:** Select level → input values for each parameter → save (runs Westgard analysis)
- **Statistics Summary Table:** Collapsible table showing N, Mean, SD, CV% per parameter for current lot
- **Control History Table:** Scrollable history with date, technician, level, status, validation stage, Westgard rules, edit button
- Admin features: Edit equipment details, Delete equipment (with confirmation)

### 6.5 `LoadControlPage.jsx` (~365 lines)
Dedicated workflow for daily QC entry:
1. Select Equipment (dropdown)
2. Select Lot (auto-selects if single active lot)
3. Select Control Level (button group)
4. Enter measured values (shows expected 2SD range + last value for each parameter)
5. "No aplica" checkbox per parameter (sets value to 'N/A', skips Westgard)
6. Submit → runs Westgard analysis → toast with result

Data persists across level switches (can fill Level 1, switch to Level 2, come back to Level 1 and values are preserved).

### 6.6 `StatisticsPage.jsx` (~207 lines)
- Equipment selector + Level/Parameter selectors + Date range picker
- Levey-Jennings chart with reference lines at +/-1s, +/-2s, +/-3s
- Fetches reports on-demand from Supabase (not from context)
- Custom tooltip showing date, value, and triggered Westgard rules
- Refresh button for manual data reload

### 6.7 `SettingsPage.jsx` (~64 lines)
Tab-based settings hub with vertical tab list:

| Tab | Component | Admin Only |
|-----|-----------|-----------|
| Laboratorios | LaboratoriesPage | Yes |
| Parametros por Equipo | ParametrosPorEquipoPage | Yes |
| Usuarios | UserManagementPage | Yes |
| Config. Equipos | QCSettingsPage | No |
| General | GeneralSettingsTab | No |
| Seguridad | SecuritySettingsTab | Yes |

Supports `?tab=` query parameter for deep linking.

---

## 7. Pages Used as Settings Sub-Components

These are full page components rendered inside the Settings tabs:

### `LaboratoriesPage.jsx` (~292 lines)
- CRUD for laboratories (name, business name, manager, contact)
- View users assigned to each lab
- Active/inactive status badges

### `ParametrosPorEquipoPage.jsx` (~281 lines)
- Sidebar list of equipment types + main panel for parameters
- Add/edit/delete parameters with code, name, unit, default mean/SD
- **Note:** Legacy schema has redundant `equipment_type` text field alongside `equipment_type_id`

### `UserManagementPage.jsx` (~444 lines)
- Full user admin: create, edit, delete, assign labs
- Uses Supabase Cloud Functions for user creation/deletion
- Merges auth data with profile data
- Three dialog system: Create, Edit, Delete

### `QCSettingsPage.jsx` (~1206 lines) **LARGEST FILE**
- Equipment + lot + QC parameter management all-in-one
- Collapsible equipment sections
- Inline lot editing
- Parameter value editing per level
- Custom `UnitSelector` with memoization
- **Technical debt:** Very large, should be decomposed

### `EquipmentTypesPage.jsx` (~186 lines)
- Define equipment type templates with JSON parameter arrays
- Simple CRUD with modal dialog

---

## 8. Styling System

### `index.css` (~74 lines)
- **Font:** Inter (Google Fonts)
- **Color system:** HSL CSS variables following shadcn/ui conventions
- **Primary color:** Teal `hsl(175, 80%, 35%)`
- **Key custom classes:**
  - `.medical-gradient` — Teal gradient for primary buttons/accents
  - `.sidebar-gradient` — Dark gray gradient (currently unused — sidebar is white)
  - `.medical-card` — White card with shadow, hover lift animation
- **Google Translate override** — Hides translation widgets (specific to Hostinger hosting)

---

## 9. Database Schema (Inferred from Code)

| Table | Key Columns | Used By |
|-------|-------------|---------|
| `profiles` | id, full_name, avatar_url, role | Auth context |
| `laboratories` | id, name, is_active, business_name, manager, contact | QCData, Settings |
| `user_laboratories` | user_id (FK profiles), laboratory_id (FK laboratories) | Auth context, Settings |
| `equipment` | id, name, model, serial, equipment_type_id, laboratory_id, status, is_active, maintenance_due, daily_deviation_threshold | QCData |
| `equipment_types` | id, name, parameters (JSON) | QCData, Settings |
| `control_lots` | id, equipment_id, lot_number, expiration_date, qc_params (JSONB), is_active | QCData |
| `qc_reports` | id, equipment_id, lot_number, date, technician, level, values (JSONB), status, westgard_rules, is_validated, validated_by, validated_at | QCData, Dashboard |
| `parameters` | id, name, code, equipment_type, equipment_type_id, unit_id, is_active, index | QCData, Settings |
| `units` | id, name, is_active | QCData, Settings |
| `patients` | id, dni, name, birthDate, sex, phone, email, address, obraSocial, type, laboratory_id | DataContext (unused) |
| `analysis_results` | id, patientId, equipmentId, testType, data (JSONB), status, notes | DataContext (unused) |

**RPC functions:** `upsert_parameter`, `upsert_predefined_parameter`
**Cloud Functions:** `create-user` (user creation with admin privileges)

---

## 10. Role-Based Access Control

| Feature | Admin | Biochemist | Technician |
|---------|-------|-----------|------------|
| View Dashboard | Yes | Yes | Yes |
| View Equipment | Yes | Yes | Yes |
| Load QC Controls | Yes | Yes | Yes |
| View Statistics | Yes | Yes | Yes |
| Validate Reports | Yes | Yes | No |
| Manage Lots | Yes | Yes | No |
| Edit Equipment | Yes | No | No |
| Delete Equipment | Yes | No | No |
| Create Users | Yes | No | No |
| Access Settings | Yes | No (partial) | No (partial) |
| View Maintenance Stats | Yes | Yes | No |

Role is determined from `user.profile.role` (from profiles table) with fallback to `user.user_metadata.role`.

---

## 11. Key Business Logic: Westgard Rules

Located in `QCDataContext.jsx`, the `applyWestgardRules` function evaluates QC control values:

```
Input: newValue, history (array of previous values), qcParams (mean, SD)

1-3s: |value - mean| > 3*SD → ERROR
1-2s: |value - mean| > 2*SD → WARNING
2-2s: Two consecutive values both > mean+2*SD or both < mean-2*SD → ERROR
```

- 'N/A' values are excluded from analysis
- History is fetched on-demand (last 20 reports) per save/update
- Results cascade: any ERROR param makes the whole report ERROR; any WARNING (if no ERROR) makes it WARNING
- Equipment status is immediately updated in DB after report save

---

## 12. Notable Issues & Technical Debt

### Dead Code
- **7+ page components** have no routes and their context provider (`DataContext`) is not mounted
- `WelcomeMessage`, `CallToAction`, `HeroImage` — Hostinger boilerplate, unused
- `.sidebar-gradient` CSS class — unused (sidebar is plain white)
- `alarms` state in QCDataContext — initialized empty, never populated

### Incomplete Features
- **2FA** — SecuritySettingsTab has a stub toggle
- **Notifications** — NotificationSettingsTab settings are not persisted
- **Appearance/Theme** — AppearanceSettingsTab is decorative only
- **User deletion** — UsersSettingsTab delete button shows "coming soon"
- **Data export** — ReportsPage export is a stub
- **Integration** — Only supports AadeeMiniISE protocol

### Architecture Concerns
- **QCSettingsPage.jsx at 1206 lines** — Needs decomposition
- **Layout.jsx duplicates sidebar** for desktop and mobile (same JSX twice)
- **Role check inconsistency:** Some components use `user?.role`, others `user?.user_metadata?.role`, others `user?.profile?.role`. The AuthContext normalizes this, but downstream usage is inconsistent.
- **Snake_case ↔ camelCase mapping** is done manually in QCDataContext. No ORM or automated mapping layer.
- **No test files** despite Jest/Testing Library being in devDependencies
- **No error boundaries** — Supabase failures can crash the UI

### Branding Inconsistency
- Package name: `labclinico-app`
- UI branding: "DIMMA QC"
- Some Helmet titles reference: "LabClinico Pro", "QC LabControl"
- Hostinger CDN images for logos

---

## 13. File Inventory Summary

| Directory | Files | Approx. LOC |
|-----------|-------|-------------|
| `src/` (root) | 3 (`main.jsx`, `App.jsx`, `index.css`) | ~170 |
| `src/contexts/` | 3 | ~1,040 |
| `src/lib/` | 3 | ~90 |
| `src/utils/` | 1 | ~20 |
| `src/components/ui/` | 14 | ~800 |
| `src/components/` (app) | 7 | ~900 |
| `src/components/settings/` | 9 | ~1,430 |
| `src/pages/` | 16 | ~5,000 |
| **Total** | **56 files** | **~9,450 LOC** |
