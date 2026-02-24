# Research Report: `public/` Folder

## Overview

The `public/` folder contains two files that are served as static assets at the root of the deployed application. In a Vite project, everything inside `public/` is copied as-is to the build output (`dist/`) without any processing or bundling.

---

## File 1: `.htaccess` — Apache Server Configuration

**Purpose:** Configures the Apache web server (used by Hostinger Horizons hosting) for SPA routing and caching.

### Module 1: `mod_rewrite` — SPA Fallback Routing

```apache
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} !-f   # If the request is NOT an existing file
RewriteCond %{REQUEST_FILENAME} !-d   # AND NOT an existing directory
RewriteRule ^ index.html [L]          # Then serve index.html instead
```

**What it does:** This is the classic single-page application (SPA) catch-all. Since Dimma QC uses React Router with client-side routes like `/dashboard`, `/equipment`, `/login`, etc., direct URL access or browser refresh on those paths would return a 404 from Apache. This rule ensures all non-file, non-directory requests fall back to `index.html`, where React Router takes over.

**Key detail:** The `[L]` flag means "last rule" — processing stops here if this rule matches.

### Module 2: `mod_headers` — Caching Strategy

```apache
Header set X-Powered-By "Hostinger Horizons"
```
- Branding header revealing the hosting platform.

```apache
Header set Cache-Control "public, s-maxage=604800, max-age=0"
```
- **Default for all responses:**
  - `s-maxage=604800` (7 days): CDN/shared caches can serve stale content for up to 7 days without revalidating with the origin.
  - `max-age=0`: Browsers must always revalidate with the CDN/origin. This means users always get fresh HTML (important for SPA updates).

```apache
<If "%{REQUEST_URI} =~ m#^/assets/.*$#">
  Header set Cache-Control "public, max-age=604800"
</If>
```
- **Override for `/assets/*` paths:**
  - `max-age=604800` (7 days): Browsers can cache these locally for 7 days.
  - This is safe because Vite produces content-hashed filenames (e.g., `index-abc123.js`). When code changes, the filename changes, so stale cache is never a problem.

**Caching summary:**
| Resource | Browser Cache | CDN Cache |
|----------|--------------|-----------|
| HTML / API / other | Always revalidates (max-age=0) | 7 days |
| `/assets/*` (JS, CSS, images) | 7 days | 7 days |

---

## File 2: `llms.txt` — LLM-Readable Site Map

**Purpose:** A machine-readable index of all pages in the application, following the emerging `llms.txt` convention. This file allows AI models / LLM agents to understand the site structure and navigate it.

### Content Structure

```
## Pages
- [Page Title](route-path): Description text
```

Each entry has:
- **Title** — from the `<title>` tag inside React Helmet
- **URL path** — the client-side route
- **Description** — from the `<meta name="description">` tag inside React Helmet

### Current Pages Indexed (16 total)

| Route | Title | Language |
|-------|-------|----------|
| `/equipmentdetail` | DIMMA QC | — |
| `/settings` | Configuracion - DIMMA QC | Spanish |
| `/dashboard` | Dashboard - DIMMA QC | English |
| `/equipment` | Equipos - DIMMA QC | Spanish |
| `/qcsettings` | Equipos - DIMMA QC | Spanish |
| `/statistics` | Estadisticas - QC LabControl | Spanish |
| `/samples` | Gestion de Muestras - LabClinico Pro | Spanish |
| `/patienthistory` | Historial de - LabClinico Pro | Spanish |
| `/resultdetail` | Informe de para - LabClinico Pro | Spanish |
| `/login` | Iniciar Sesion - DIMMA QC | Spanish |
| `/integration` | Integracion de Equipos - LabClinico Pro | Spanish |
| `/loadcontrol` | Load Daily Control - DIMMA QC | English |
| `/patients` | Pacientes - LabClinico Pro | Spanish |
| `/reports` | Reportes - LabClinico Pro | Spanish |
| `/results` | Resultados - DIMMA QC | Spanish |

### Generation Pipeline (`tools/generate-llms.js`)

The file is **auto-generated** at build time, not hand-written. The pipeline:

1. **Triggered by:** `npm run build` which runs `node tools/generate-llms.js || true && vite build`
   - The `|| true` means a failure in generation won't block the build.
2. **Reads routes from:** `src/App.jsx` — parses `<Route path="..." element={<Component />}>` tags via regex.
3. **Reads page metadata from:** `src/pages/*.jsx` — extracts `<Helmet>` components containing `<title>` and `<meta name="description">`.
4. **Cleans content:** Strips JS comments, template literals, JSX expressions, and decodes HTML entities.
5. **Fallback URL generation:** If a component isn't found in routes, it derives a URL from the filename (strips `Page` suffix, lowercases).
6. **Outputs to:** `public/llms.txt` — sorted alphabetically by title.

### Observations on `llms.txt` Content

- **Inconsistent branding:** Some pages use "DIMMA QC", others "LabClinico Pro", and one uses "QC LabControl". This suggests the app has evolved or serves multiple product lines.
- **Missing metadata:** Several pages have "No description available" and some titles have empty interpolated values (e.g., "Historial de  - LabClinico Pro" — note the double space suggesting a missing variable like `{patientName}`).
- **Mixed languages:** Most metadata is in Spanish but some pages use English titles ("Dashboard", "Load Daily Control").

---

## How Both Files Work Together

1. **At build time:** `generate-llms.js` scans the React pages and writes `public/llms.txt`.
2. **Vite build:** Copies both `llms.txt` and `.htaccess` as-is into `dist/`.
3. **At runtime on Hostinger:**
   - `.htaccess` handles SPA routing (all paths -> `index.html`) and sets up the CDN/browser caching strategy.
   - `llms.txt` is accessible at `https://your-domain.com/llms.txt` for any AI agent or crawler that supports the convention.

---

## Key Takeaways

1. **The `public/` folder is minimal and purposeful** — only server config + AI discoverability.
2. **`.htaccess` is critical for production** — without it, direct URL access to any route except `/` would 404 on Apache.
3. **`llms.txt` is a build artifact** — editing it manually is pointless since it gets overwritten. Changes should be made to the Helmet metadata in `src/pages/*.jsx`.
4. **The caching strategy is well-designed** — leverages Vite's content hashing for aggressive asset caching while ensuring HTML always revalidates.
