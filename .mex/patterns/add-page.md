---
name: add-page
description: Add a new authenticated page/route to the app. Covers creating the page component and wiring it into the router.
triggers:
  - "new page"
  - "add route"
  - "add page"
  - "new screen"
edges:
  - target: context/conventions.md
    condition: always — run the verify checklist after adding a page
  - target: context/architecture.md
    condition: when deciding how the page should interact with QCDataContext or Supabase
last_updated: 2026-04-09
---

# Add Page

## Context

All authenticated pages follow the same structure: created in `src/pages/`, registered in `src/app.jsx` inside `<ProtectedRoute><Layout>`. Pages set their own `<title>` via `react-helmet`. Data comes from `useQCData()` or direct Supabase queries for page-local state.

## Steps

1. Create `src/pages/MyNewPage.jsx`:
   ```jsx
   import React from 'react';
   import { Helmet } from 'react-helmet';
   import { useQCData } from '@/contexts/QCDataContext';
   import { useAuth } from '@/contexts/SupabaseAuthContext';

   const MyNewPage = () => {
     const { equipment } = useQCData();
     const { user } = useAuth();

     return (
       <>
         <Helmet><title>My New Page - DIMMA QC</title></Helmet>
         {/* page content */}
       </>
     );
   };

   export default MyNewPage;
   ```

2. Add the import and route in `src/app.jsx`:
   ```jsx
   import MyNewPage from '@/pages/MyNewPage.jsx';
   // ...inside <Routes>:
   <Route path="/my-new-page" element={
     <ProtectedRoute>
       <Layout>
         <MyNewPage />
       </Layout>
     </ProtectedRoute>
   } />
   ```

3. Add navigation link in `src/components/Layout.jsx` if the page should appear in the sidebar.

## Gotchas

- **No `<ProtectedRoute>` = unauthenticated access.** Every new page must be wrapped — don't omit it.
- **No `<Layout>` = no sidebar or nav.** If the page needs the app shell, it must be inside `<Layout>`.
- Pages that are NOT authenticated (like `/login`, `/reset-password`) go directly into `<Routes>` without `ProtectedRoute` or `Layout`.
- The `*` catch-all at the bottom of `<Routes>` redirects to `/` — add new routes before it.

## Verify

- [ ] Page file is in `src/pages/` with PascalCase name
- [ ] Route registered in `src/app.jsx` inside `<ProtectedRoute><Layout>`
- [ ] `<Helmet><title>...</title></Helmet>` present in the page
- [ ] `@/` path alias used (not relative imports)
- [ ] No direct `supabase.insert/update/delete` calls for core entities — those go through `QCDataContext`

## Update Scaffold
- [ ] Update `.mex/ROUTER.md` "Current Project State" if what's working/not built has changed
- [ ] Update any `.mex/context/` files that are now out of date
- [ ] If this is a new task type without a pattern, create one in `.mex/patterns/` and add to `INDEX.md`
