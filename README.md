# Studio Learn

An Arabic-first (RTL by default, English supported) resource platform. The
website is the catalog, the storefront UI, and a small admin wizard for
metadata - **Google Drive or OneDrive is where every file actually lives,
and where every download or view actually happens.** The site never
uploads, stores, proxies, or hosts a single byte of any resource.

This README documents the current, upgraded state of the project (brand:
**Studio Learn**), built on top of two earlier phases (a general catalog
site, then a Google-Drive-only resource store). If you're picking this repo
up for the first time, you only need this file - it supersedes the two
previous READMEs that shipped with the earlier phases.

---

## 1. What changed in this upgrade

Starting point: a working site where every resource was hard-wired to a
single Google Drive URL (`Resource.googleDriveUrl`), with a download-only
flow and no way to add a second resource without hand-editing code.

This upgrade adds, without rebuilding anything that already worked:

- **A richer, backward-compatible `Resource` model** - `provider`
  (`google-drive` | `one-drive`), `externalUrl`, `resourceType`,
  `accessMode` (`download-only` | `preview-download` | `view-only`), and
  `previewMode`. The old `googleDriveUrl` field still works - see
  "Backward compatibility" below.
- **An admin "إضافة الملفات" (Add Files) wizard** - a 4-step flow that adds
  a resource's **metadata and an external link only**. It never uploads a
  file, never touches the browser's filesystem, and has no file-picker
  anywhere in it.
- **In-site previews where honest** - a Google Drive file renders in
  Drive's own `/preview` iframe when the URL allows it; everything else
  (OneDrive, or anything else) gets a plain "open on <Provider>" link
  instead of a guessed embed.
- **Strict view-only course mode** - a course resource has no Download
  button anywhere, and the raw file URL is never printed as visible page
  text.
- **A real custom video player** - for the rare case where a resource's
  link is an actual direct video file (not a Drive/OneDrive share page,
  which is an HTML viewer, not a raw video URL).
- **A bounded, theme-aware splash screen** - replaces the previous
  infinitely-looping progress bar with a real readiness check plus a fixed
  5-10 second branding delay (default 5s), and it now opens in the correct
  light/dark theme immediately instead of flashing light first.
- Full rebrand to **Studio Learn** (see `src/config/site.ts` and
  `.env.example`'s `VITE_SITE_NAME`).

## 2. What was NOT touched

- The preserved Admin/Supabase panel and its data model (`FileResource`,
  `src/services/*`, `supabase/*.sql`) - still fully present, still disabled
  by default, still independent of the active catalog. See section 7.
- The original VS Code resource and its exact Google Drive URL - still in
  the catalog, completely unchanged, still `download-only`.
- The download-preparation countdown pattern (`DownloadPreparationModal`) -
  kept, just made provider-generic instead of Google-Drive-only (it now
  reads `resource.provider`/`externalUrl` instead of a hardcoded Drive
  label and field name).

## 3. Resource data model

```ts
interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;                 // a slug from src/config/categories.ts
  resourceType: CatalogResourceType; // 'archive' | 'software' | 'tool' | 'document'
                                      // | 'code' | 'pdf' | 'image' | 'video'
                                      // | 'course' | 'other'
  fileType: string;                  // "ZIP", "MP4", ...
  fileSize: string;                  // "519 MB", ...
  platform?: string;
  icon?: string;
  image?: string;
  provider: ResourceProvider;        // 'google-drive' | 'one-drive'
  externalUrl: string;               // the exact share-page URL - never a
                                      // folder link, never rewritten
  accessMode: AccessMode;            // 'download-only' | 'preview-download' | 'view-only'
  previewMode: PreviewMode;          // 'provider' | 'video' | 'image' | 'pdf' | 'none'
  tags?: string[];
  featured?: boolean;
  /** @deprecated use externalUrl + provider */
  googleDriveUrl?: string;
}
```

`resourceType` drives everything else about how a resource behaves - its
icon, which `accessMode`s are even offered for it, and its default
`previewMode` - all from one table, `src/config/resourceTypes.ts`:

| Type | Allowed access modes | Default preview |
|---|---|---|
| archive, software, tool, code | download-only | none |
| document, pdf, image | preview-download, download-only | provider / pdf / image |
| video | preview-download, download-only | video |
| course | **view-only only** | provider |
| other | all three | none |

Adding a new resource type is a one-entry addition to that file - no
component needs touching.

### Backward compatibility

`src/lib/resourceModel.ts`'s `normalizeResource()` is the **only** function
in the codebase allowed to read `googleDriveUrl`. Every page and component
reads `externalUrl`/`provider`/`accessMode`/`previewMode` only. A resource
object written against the pre-upgrade shape (just `googleDriveUrl`, no new
fields) still works unmodified - `normalizeResource()` fills in
`provider: 'google-drive'`, `accessMode: 'download-only'`,
`previewMode: 'none'` for it automatically. The original VS Code resource
in `src/data/resources.ts` is left exactly as it was conceptually; it's
simply now expressed through the new fields directly.

## 4. Provider URL handling (`src/lib/provider.ts`)

The only file that parses a Google Drive or OneDrive URL. Rules it
enforces, always:

- **HTTPS only**, and rejects `javascript:`, `data:`, `vbscript:`, `file:`
  schemes outright, before any other string handling.
- **Never fetches** a resource URL from the browser or a server - a URL is
  only ever pattern-matched, never requested, to decide what it is.
- **Never invents a capability a provider doesn't have.** Google Drive's
  `/file/d/<id>/preview` is a documented, stable embed endpoint, so a
  preview URL is derived for it. OneDrive has no single reliable embed
  pattern across personal/business accounts, so `getProviderPreviewUrl()`
  deliberately returns `null` for OneDrive - the UI shows an honest
  "open on OneDrive" link instead of a maybe-broken guess.
- Domains recognized: `drive.google.com` (Google Drive), `1drv.ms`,
  `onedrive.live.com`, and any `*.sharepoint.com` subdomain (OneDrive
  for personal and business/education accounts).

## 5. The admin "إضافة الملفات" wizard

`src/components/admin/wizard/` - `ResourceWizard.tsx` orchestrates four
step components, each a plain controlled form bound to one shared draft
object:

1. **Resource type** - pick from `src/config/resourceTypes.ts`.
2. **Provider** - paste the exact share-page URL. Validated client-side via
   `validateResourceUrl()` (HTTPS, safe scheme, recognized provider host) -
   never fetched, never auto-"fixed".
3. **Resource info** - title, description, category, file type/size,
   platform, tags, "featured" toggle. Every text field has a length cap
   (`src/lib/validation.ts`, `FIELD_LIMITS`) enforced both as `maxLength` on
   the input and again at submit time.
4. **Access & viewing behavior** - only the access modes that step 1's type
   allows are offered (a course can only ever be `view-only`).

On the last step, the draft becomes a normal `ResourceInput` and is handed
to `addResource()`/`updateResource()` in `src/data/resourceStore.ts` - the
same functions any other caller would use. The wizard has no private write
path, and **no file input anywhere in it**: it only ever stores a title, a
description, and a link.

Reached from **Admin → الموارد** (`/admin/catalog`,
`src/pages/admin/AdminCatalogPage.tsx`), a separate screen from the
preserved `AdminFilesPage` (which still manages the old `FileResource`/
Supabase model and is untouched).

### ⚠️ Honest limitation: local-only persistence

The admin wizard - like the rest of this project - has **no real backend**.
Anything added or edited through it is saved to `localStorage` in the
browser/profile the admin used (`src/data/resourceStore.ts`,
key `studio-learn:catalog-overrides`), merged at read time with the
build-time seed (`src/data/resources.ts`). It is **not** visible to other
visitors, not visible on another device, and not visible to the admin
themselves in a different browser. The Admin Catalog screen states this
plainly in a banner; this is not a bug to be fixed quietly later, it's the
honest behavior of a project with no database, by design (see section 9,
"Adding resources at scale", for what a real backend migration would look
like).

## 6. Preview behavior by resource type

`src/components/resources/ResourcePreview.tsx` is the single dispatcher
`ResourceDetailsPage` calls for any resource whose `accessMode` isn't
`download-only`:

- If `previewMode === 'video'` **and** `externalUrl` is an actual direct
  video file (`.mp4`/`.webm`/`.ogg`) → the real custom
  `src/components/video/VideoPlayer.tsx` (play/pause/seek/volume/
  fullscreen, with a quality selector only when 2+ real sources exist -
  never a decorative single-option dropdown).
- Otherwise → `src/components/resources/ProviderPreview.tsx`, which embeds
  the provider's own preview page (Google Drive `/preview`, sandboxed
  iframe, `referrerPolicy="no-referrer"`) when derivable, or an honest
  "open on <Provider>" link when it isn't (OneDrive today).

Why two separate code paths instead of one "smart" player: a cross-origin
iframe's internal player cannot be controlled by this page's JavaScript at
all, so a custom `<video>` control surface can only ever attach to a
literal, same-origin-controllable video file URL - which a Drive/OneDrive
share link is not. `ResourcePreview` is the one place that decides which
is actually possible for a given resource, rather than every call site
guessing.

## 7. Course / view-only mode (strict)

A `course` resource's `accessMode` is locked to `view-only` by
`src/config/resourceTypes.ts` - the wizard's Step 4 doesn't even offer the
other options for it. For a `view-only` resource, everywhere in the app:

- No Download button is rendered - not on its card, not on its details
  page. `ResourceCard`/`FeaturedResource` render a "watch"-style link to
  the details page instead of a Download action; `ResourceDetailsPage`
  skips `DownloadPreparationModal` entirely.
- The raw `externalUrl` is never printed as visible text anywhere; only
  the provider's display name (e.g. "Google Drive") appears, as a badge.

## 8. Security hardening

- No `dangerouslySetInnerHTML` anywhere in the codebase (verified by grep).
- Every provider iframe is sandboxed
  (`sandbox="allow-scripts allow-same-origin allow-popups allow-forms
  allow-popups-to-escape-sandbox"`) with `referrerPolicy="no-referrer"`.
- Every `target="_blank"` link carries `rel="noopener noreferrer"`.
- URLs are validated (HTTPS-only, dangerous-scheme rejection, allowlisted
  provider hosts) before ever being rendered as a link or an iframe `src`.
- Admin wizard text fields are length-capped both in the UI (`maxLength`)
  and again at submit time (`src/lib/validation.ts`).
- No secrets of any kind live in frontend code or env files beyond the
  Supabase **anon** key, which is public-by-design and only used by the
  preserved, disabled-by-default Admin panel.

## 9. Admin panel: preserved, disabled (unchanged from the previous phase)

The Admin panel (`src/pages/admin/*` other than `AdminCatalogPage.tsx`,
`src/components/admin/*`, `src/services/*`, `src/lib/supabaseClient.ts`,
`src/context/AuthContext.tsx`, `supabase/*.sql`) is **fully preserved**,
none of it deleted:

- Every `/admin/*` route - including the new `/admin/catalog` - is
  lazy-loaded (`React.lazy`), so the entire `@supabase/supabase-js`
  dependency lives in chunks the browser never fetches unless a route
  inside `/admin` actually renders.
- `src/config/admin.ts` reads `VITE_ENABLE_ADMIN`. Unset or `"false"` (the
  default) → every `/admin/*` URL, including `/admin/catalog`, renders the
  normal 404 page via `<AdminGate>`, and nothing inside ever mounts.
- The public `Header` has no link to `/admin` and no auth awareness -
  `AuthProvider` lives only inside the gated `/admin` subtree.

To use it locally: `VITE_ENABLE_ADMIN=true` in `.env`, `npm run dev`, visit
`/admin/login`. Without `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` set,
it runs the local demo mode in `src/services/mock` (sign in as
`owner@example.com` with any password). The new **الموارد** (Catalog)
tab in the admin sidebar is a sibling of the existing **الملفات** (Files)
tab - they manage two different models and never collide.

## 10. How to add a resource

**Through the UI (recommended):** `VITE_ENABLE_ADMIN=true` → `/admin/catalog`
→ "إضافة الملفات" → the 4-step wizard. Saved to this browser's
`localStorage` immediately (see the honest limitation in section 5).

**By editing code**, for something that should ship in the build-time seed
for every visitor: add an object to `seedResources` in
`src/data/resources.ts`, built through `normalizeResource({...})` with the
new fields (see section 3's `Resource` shape, or copy the existing VS Code
entry as a template).

## 11. Download / preview flow, in full

1. `download-only` → the card/details Download button opens
   `DownloadPreparationModal`: a short, honest countdown
   (`VITE_DOWNLOAD_PREPARATION_SECONDS`, clamped 1-10s, default 5), then an
   "Open <Provider>" link to the resource's exact `externalUrl`, opened in
   a new tab. The provider's own page does the actual download - this site
   never touches the file.
2. `preview-download` → the details page shows an in-site preview
   (`ResourcePreview`) **and** a Download button/modal exactly like above.
3. `view-only` → the details page shows the preview only; no Download
   button or modal exists on the page at all.

## 12. Deployment (unchanged mechanics, new name)

```bash
git init          # if not already a repo
git add .
git commit -m "Studio Learn upgrade"
git remote add origin <your-repo-url>
git push -u origin main
```

Vercel: import the repo, framework preset **Vite** (auto-detected), build
command `npm run build`, output directory `dist`. No environment variables
are required for the active platform to work - `VITE_SITE_NAME` and the
rest of `.env.example` are all optional overrides. `vercel.json` already
has the one rewrite rule a client-side-routed SPA needs so that opening
`/resources/vscode-windows-7` directly doesn't 404.

---

## Architecture

```
GitHub  →  Vercel  →  Vite + React static site  →  Google Drive / OneDrive (file hosts)
```

```
src/
  types/index.ts              Resource (active) + FileResource (preserved
                               Admin/Supabase model) - intentionally two
                               independent shapes, see section 9.
  data/
    resources.ts                seedResources - the build-time catalog.
    resourceStore.ts            THE read/write API: merges seedResources
                                 with localStorage admin overrides.
  lib/
    provider.ts                  URL detection/validation/preview-URL
                                  derivation - the only file that parses a
                                  provider URL.
    resourceModel.ts             normalizeResource() (backward compat) +
                                  getActionLabelKey().
    validation.ts                Field length limits for the admin wizard.
  config/
    resourceTypes.ts              Per-CatalogResourceType icon/label/
                                   allowed access modes/default preview.
    categories.ts, download.ts, splash.ts, admin.ts, site.ts, upload.ts
  components/
    resources/                    ResourceCard, FeaturedResource,
                                   ResourcePreview, ProviderPreview,
                                   CategoryPill, ResourceGrid/Filters -
                                   the active storefront UI.
    video/VideoPlayer.tsx         Real custom player for direct video files.
    download/DownloadPreparationModal.tsx
    admin/wizard/                 The 4-step "إضافة الملفات" wizard.
    admin/                        Preserved Admin nav/layout + new sidebar
                                  entry for the Catalog screen.
    layout/, ui/                  Shell, theme/language, shared primitives
                                  (Modal now has a real focus trap + `size`
                                  prop for the wizard).
  pages/
    HomePage.tsx, ResourceDetailsPage.tsx   Read through resourceStore.ts.
    admin/AdminCatalogPage.tsx     New: list/add/edit/delete catalog
                                   resources, launches the wizard.
    admin/AdminFilesPage.tsx, LoginPage.tsx, etc.   Preserved, untouched.
  services/, lib/supabaseClient.ts, context/AuthContext.tsx
                                   Preserved Supabase/mock backend - Admin
                                   panel only, never the active platform.
  routes/router.tsx               Route tree incl. the VITE_ENABLE_ADMIN
                                   gate and the new /admin/catalog route.
supabase/                          Preserved schema - not used by the
                                   active platform.
```

### Icons

`public/icons/resources/vscode-windows-7.svg` is an original, generic
placeholder (a rounded window with a code-bracket mark) - deliberately not
a reproduction of Microsoft's Visual Studio Code logo, which this project
has no rights to reproduce.

---

## Verification

The four commands this project should be checked with before every deploy:

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

**I was not able to run these in this sandbox.** `npm install` fails with
`403 Forbidden` from `registry.npmjs.org` - confirmed both through `npm
install` directly and through a raw `curl` to the registry, bypassing the
HTTPS proxy entirely (the registry host is explicitly excluded from
proxying, so this is a sandbox-level network policy, not a proxy
misconfiguration). Nothing downstream of `npm install` (`typecheck`,
`lint`, `build`) can run without `node_modules`.

What I did instead, as a substitute - not an equivalent - for the real
commands:

- Parsed **every** `.ts`/`.tsx` file (76 files) with the actual TypeScript
  compiler's parser (a globally-available `typescript` package, used
  directly via its API rather than through this project's own
  dependency-pinned `tsc`) and confirmed **zero syntax errors**. This
  catches malformed JSX, unbalanced brackets, and invalid syntax, but
  **not** type errors, since no `node_modules` (and therefore no `@types/*`
  or the project's own type declarations) could be installed to type-check
  against.
- Verified every `@/...` import alias in the codebase resolves to a real
  file on disk.
- Verified every `t('...')` key used anywhere in the code resolves in both
  `src/i18n/locales/ar.json` and `src/i18n/locales/en.json`, and that the
  two files have byte-for-byte identical key sets (175 keys each).
- Checked for unused named imports (none found), `dangerouslySetInnerHTML`
  (none found), and that every `target="_blank"` link carries
  `rel="noopener noreferrer"` (both instances do).
- Manually re-read every new and changed file for logical correctness
  (prop types, hook dependency arrays, discriminated-union narrowing on
  `validateResourceUrl()`'s result, etc.).

**Please run the four commands above yourself** in an environment with
normal registry access before deploying. Treat this project as a
carefully-reviewed draft, not a verified-green build - that distinction
matters more than claiming a success I could not actually produce.

---

## Adding resources at scale

For day-to-day use, the admin wizard (section 5) is the intended path -
until the catalog grows past what hand-reviewing a `localStorage`-backed
list comfortably supports. At that point, the natural next step (not built
now, since the instructions are to avoid speculative scope) is migrating
`resourceStore.ts`'s body to real API calls against a backend - the
preserved `supabase/schema.sql` already has a shape (`files`/`categories`
tables) close enough to extend for this - while every caller
(`getAllResources`, `addResource`, etc.) keeps the exact same signature, so
nothing above `resourceStore.ts` would need to change.
