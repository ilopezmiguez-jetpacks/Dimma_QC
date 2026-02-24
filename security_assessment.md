# Security Assessment: Password Change Flow — DIMMA QC

## Summary

Users are reporting they cannot update their passwords from the UI. After reviewing `SecuritySettingsTab.jsx`, `SettingsPage.jsx`, `LoginPage.jsx`, and `SupabaseAuthContext.jsx`, the following gaps were identified.

---

## Critical Issues (Blocking Password Changes)

### 1. Security Tab Is Admin-Only — Non-Admin Users Cannot Change Their Password

**File:** `src/pages/SettingsPage.jsx:25`

```js
{ value: 'security', icon: Shield, label: 'Seguridad', component: <SecuritySettingsTab />, adminOnly: true },
```

The Security tab (which contains the only password change form in the app) is gated behind `adminOnly: true`. Biochemists and Technicians never see this tab. **This is the primary reason most users cannot change their passwords.**

Additionally, the entire `/settings` route is wrapped in `<ProtectedRoute adminOnly={true}>` (`src/App.jsx:65`), so non-admin users are redirected away at the router level before even reaching the tab system. Simply flipping the tab's `adminOnly` flag would not be enough.

**Fix:** Set `adminOnly: false` for the security tab, or extract the password change form into a user-accessible location (e.g., the user dropdown/profile area).

---

### 2. Role Check Inconsistency in SettingsPage

**File:** `src/pages/SettingsPage.jsx:17`

```js
const isAdmin = user?.user_metadata?.role === 'admin';
```

The `SupabaseAuthContext` normalizes the role at `user.role` (line 48–49 of `SupabaseAuthContext.jsx`), resolving it from the `profiles` table first, then falling back to `user_metadata`. However, `SettingsPage` bypasses this normalization and reads directly from `user_metadata.role`.

If a user's role is set in the `profiles` table but NOT in `user_metadata`, they would not be recognized as admin in Settings — even if they are an admin. This could cause admin users to lose access to the Security tab entirely.

**Fix:** Use the normalized `user?.role === 'admin'` instead of `user?.user_metadata?.role`.

---

### 3. Password Reset Flow Is Broken (Forgot Password)

**File:** `src/pages/LoginPage.jsx:31-32`

```js
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/login`,
});
```

**File:** `src/contexts/SupabaseAuthContext.jsx:74`

```js
const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
  if (mounted) await handleSession(session);
});
```

**The problem has two parts:**

**a) `redirectTo` points to `/login`:** When the user clicks the reset link in their email, Supabase redirects them to `/login` with a recovery access token in the URL fragment. But `LoginPage` (line 105–107) checks `if (user)` and immediately redirects to `/` (Dashboard). The user is authenticated by the recovery token and sent to the dashboard without ever seeing a password change form.

**b) `PASSWORD_RECOVERY` event is not handled:** The `onAuthStateChange` listener receives an `_event` parameter but ignores it entirely. When Supabase fires a `PASSWORD_RECOVERY` event, the app treats it identically to a regular `SIGNED_IN` — it sets the user and session, but never routes the user to a password change form.

**Result:** The "Forgot Password" feature sends the email successfully, but clicking the link just logs the user in without ever prompting them to set a new password.

**Fix:**
- Handle the `PASSWORD_RECOVERY` event in `onAuthStateChange` to redirect the user to the password change form (or show a dedicated reset form).
- Change `redirectTo` to point to a route that handles the recovery flow (e.g., `/settings?tab=security` or a dedicated `/reset-password` page).

---

## Secondary Issues (Security & UX)

### 4. No Loading State on Password Form

**File:** `src/components/settings/SecuritySettingsTab.jsx:21-55`

The `handleSavePassword` function has no loading/submitting state. Users can click "Save Password" multiple times, sending duplicate `updateUser` requests. This can cause confusing toast messages and unnecessary API calls.

**Fix:** Add an `isSubmitting` state to disable the button during the async operation.

---

### 5. No Current Password Verification

**File:** `src/components/settings/SecuritySettingsTab.jsx`

The password change form only asks for the new password and confirmation — never the current password. While Supabase's `updateUser()` relies on the session token (not the old password), this is a security concern: if a session is hijacked or a user leaves their workstation unlocked, an attacker could change the password without knowing the original one.

**Recommendation:** Add a "Current Password" field and verify it via `supabase.auth.signInWithPassword()` before calling `updateUser()`. This is a defense-in-depth measure, not strictly required by Supabase.

---

### 6. Weak Password Policy

**File:** `src/components/settings/SecuritySettingsTab.jsx:31-38`

The only password requirement is a minimum of 6 characters. For a clinical laboratory system handling sensitive health data, this is insufficient.

**Recommendation:** Enforce stronger requirements (e.g., 8+ characters, mixed case, at least one number). Consider also configuring Supabase's server-side password policy to match.

---

### 7. Unused Import

**File:** `src/components/settings/SecuritySettingsTab.jsx:9`

```js
const { user } = useAuth();
```

The `user` variable is destructured but never used in the component. Minor code hygiene issue.

---

## Priority Summary

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | Security tab is admin-only | **Critical** | All non-admin users blocked from changing password |
| 2 | Role check reads `user_metadata` instead of normalized `role` | **High** | Admin users may lose access if role is only in profiles table |
| 3 | Password reset flow doesn't handle `PASSWORD_RECOVERY` event | **High** | "Forgot password" link logs users in without prompting for new password |
| 4 | No loading state on submit | **Low** | Duplicate requests, confusing UX |
| 5 | No current password verification | **Medium** | Session hijack could lead to account takeover |
| 6 | Weak password policy (6 chars) | **Medium** | Inadequate for clinical data systems |
| 7 | Unused `user` import | **Trivial** | Dead code |

---

## Implementation Plan

### Phase 1 — Unblock Password Changes for All Users (Issues #1, #2, #7)

**Goal:** Every authenticated user can change their own password.

#### Step 1.1 — Open the `/settings` route to all authenticated users

**File:** `src/App.jsx:64-70`

Remove `adminOnly={true}` from the `/settings` `<ProtectedRoute>`. The route becomes accessible to all authenticated users; admin-only tabs are still filtered inside `SettingsPage` via `tabsConfig`. [MAKE SURE ALL TABS EXCEPT THE UPDATE PASSWORD TAB ARE MARKED AS adminOnly={true}]

```diff
- <ProtectedRoute adminOnly={true}>
+ <ProtectedRoute>
```

#### Step 1.2 — Fix the role check in SettingsPage

**File:** `src/pages/SettingsPage.jsx:17`

Use the normalized role from AuthContext instead of raw `user_metadata`:

```diff
- const isAdmin = user?.user_metadata?.role === 'admin';
+ const isAdmin = user?.role === 'admin';
```

#### Step 1.3 — Make the Security tab available to all roles

**File:** `src/pages/SettingsPage.jsx:25`

```diff
- { value: 'security', icon: Shield, label: 'Seguridad', component: <SecuritySettingsTab />, adminOnly: true },
+ { value: 'security', icon: Shield, label: 'Seguridad', component: <SecuritySettingsTab />, adminOnly: false },
```

#### Step 1.4 — Clean up unused import in SecuritySettingsTab

**File:** `src/components/settings/SecuritySettingsTab.jsx`

Remove the unused `useAuth` import and `user` destructuring (lines 2, 9). The `user` object will be needed later in Phase 2 for current password verification, but for now it is dead code.

---

### Phase 2 — Harden the Password Change Form (Issues #4, #5, #6)

**Goal:** Make the password form secure and resilient.

#### Step 2.1 — Add loading/submitting state

**File:** `src/components/settings/SecuritySettingsTab.jsx`

- Add `const [isSubmitting, setIsSubmitting] = useState(false);`
- Wrap the `handleSavePassword` body in `setIsSubmitting(true)` / `setIsSubmitting(false)` (with try/finally).
- Pass `disabled={isSubmitting}` to the submit `<Button>`.
- Show "Guardando..." label while submitting.

#### Step 2.2 — Add current password verification

**File:** `src/components/settings/SecuritySettingsTab.jsx`

- Add a "Current Password" (`currentPassword`) field to the form and `passwordData` state.
- Before calling `supabase.auth.updateUser()`, verify the current password by calling:
  ```js
  await supabase.auth.signInWithPassword({ email: user.email, password: passwordData.currentPassword });
  ```
- If it fails, show an error toast and abort. This requires the `user` object from `useAuth()` (re-add the import removed in 1.4).

#### Step 2.3 — Strengthen password policy

**File:** `src/components/settings/SecuritySettingsTab.jsx`

Replace the 6-char minimum check with a validation function that enforces:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

Show specific feedback about which requirement is not met.

---

### Phase 3 — Fix the Forgot Password / Recovery Flow (Issue #3)

**Goal:** When a user clicks the password reset link from their email, they land on a form where they can set a new password.

#### Step 3.1 — Add a `passwordRecovery` flag to AuthContext

**File:** `src/contexts/SupabaseAuthContext.jsx`

- Add `const [passwordRecovery, setPasswordRecovery] = useState(false);` to `AuthProvider`.
- In the `onAuthStateChange` callback, check the event type:
  ```js
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      setPasswordRecovery(true);
    }
    if (mounted) await handleSession(session);
  });
  ```
- Expose `passwordRecovery` and `setPasswordRecovery` in the context value.

#### Step 3.2 — Create a `/reset-password` page

**New file:** `src/pages/ResetPasswordPage.jsx`

A minimal page that:
- Renders the same password change form (or a dedicated variant of `SecuritySettingsTab` with only new password + confirm).
- Does NOT require the current password (the user is authenticated via the recovery token, not their old password).
- On successful password update, calls `setPasswordRecovery(false)` and navigates to `/`.
- If accessed without a `PASSWORD_RECOVERY` session, redirects to `/`.

#### Step 3.3 — Add the `/reset-password` route

**File:** `src/App.jsx`

Add a new protected route (not admin-only):

```jsx
<Route path="/reset-password" element={
  <ProtectedRoute>
    <ResetPasswordPage />
  </ProtectedRoute>
} />
```

#### Step 3.4 — Redirect on PASSWORD_RECOVERY event

**File:** `src/App.jsx` or a new top-level component

Add a component (or logic in `App.jsx`) that watches `passwordRecovery` from context. When it becomes `true`, navigate to `/reset-password`:

```jsx
const { passwordRecovery } = useAuth();
const navigate = useNavigate();
useEffect(() => {
  if (passwordRecovery) navigate('/reset-password');
}, [passwordRecovery]);
```

> **Note:** Since `<Router>` is inside `<AuthProvider>`, this redirect component must be placed as a child of `<Router>` (e.g., a `<PasswordRecoveryRedirect />` component rendered alongside `<Routes>`).

#### Step 3.5 — Update the `redirectTo` in ForgotPasswordForm

**File:** `src/pages/LoginPage.jsx:31`

Change the redirect target so the recovery token lands at the app root (where the redirect logic from 3.4 will pick it up):

```diff
- redirectTo: `${window.location.origin}/login`,
+ redirectTo: `${window.location.origin}/reset-password`,
```

---

## Required Supabase Configuration Changes

The following changes must be made manually in the **Supabase Dashboard** for the code to work correctly:

### 1. Add Redirect URL to Allowed List

**Dashboard path:** Authentication → URL Configuration → Redirect URLs

Add the following URL to the allowed redirect URLs list:

```
https://<your-production-domain>/reset-password
```

If you also test locally, add:

```
http://localhost:5173/reset-password
```

Without this, Supabase will reject the `redirectTo` parameter in `resetPasswordForEmail()` and fall back to the Site URL, breaking the recovery flow.

### 2. (Recommended) Strengthen Server-Side Password Policy

**Dashboard path:** Authentication → Policies (or Auth Settings, depending on Supabase version)

If your Supabase plan supports it, configure a minimum password length of 8 on the server side to match the client-side validation from Phase 2. This prevents password changes via API calls that bypass the UI.

### 3. (Verify) Confirm Email Templates Are Correct

**Dashboard path:** Authentication → Email Templates → Reset Password

Verify that the reset password email template uses `{{ .ConfirmationURL }}` correctly. No changes should be needed here, but it's worth confirming the template hasn't been customized in a way that strips the token.
