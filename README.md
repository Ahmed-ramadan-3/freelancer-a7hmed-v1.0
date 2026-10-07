# Studio Learn

An Arabic-first (RTL by default, English supported) resource platform. The
website is the catalog, the storefront UI, and a small admin wizard for
metadata - **Google Drive or OneDrive is where every file actually lives,
and where every download or view actually happens.** The site never
uploads, stores, proxies, or hosts a single byte of any resource.

This README documents the current, upgraded state of the project (brand:
**Studio Learn**), built on top of three earlier phases (a general catalog
site, then a Google-Drive-only resource store, then the provider/accessMode
resource model and admin wizard described in sections 1-12 below). If
you're picking this repo up for the first time, you only need this file -
it supersedes the previous READMEs that shipped with the earlier phases.

---

## 0. Latest upgrade: optional metadata-only backend + admin console

The project still has **no file storage of any kind** - that has not
changed and never will as part of this line of work. What's new is that
the resource *catalog* (titles, descriptions, external Drive/OneDrive
links, and the handful of other metadata fields from section 3) can now
optionally live in a small Neon Postgres database instead of only in each
admin's own browser, so every visitor on every device sees the same list.

> This backend was originally built against Supabase, then migrated to
> [Neon](https://neon.tech) Postgres in a later pass. If you're wondering
> why some comments or variable names still say "Supabase" - that's the
> **legacy Admin panel** (section 9's `VITE_ENABLE_ADMIN=true` mode), a
> separate, untouched system with its own separate table. The resources
> catalog itself no longer talks to Supabase at all.

- **Still metadata-only.** The backend table (`db/resources_schema.sql`)
  stores exactly the fields in section 3's `Resource` shape - an id, a
  title, a description, an external URL, an access mode, and so on. It has
  no file column, no storage bucket, and no upload endpoint. The actual
  software, PDF, video, or course a resource points to stays on Google
  Drive, OneDrive, or wherever it already lived.
- **Fully optional, off by default.** Leave `DATABASE_URL`/
  `VITE_RESOURCES_BACKEND_ENABLED`/the three server-only `ADMIN_*` vars
  blank (see `.env.example`) and the site behaves exactly as it did before
  this upgrade - `localStorage`-only admin edits, section 5's honest
  limitation still applies verbatim.
- **A lightweight admin console**, reached only from the header's
  three-dot "more options" menu (`src/components/layout/MoreMenu.tsx`) →
  **Admin**, never from a homepage button, and logging in with a plain
  **username + password** the owner sets as server environment variables
  (`ADMIN_USERNAME`/`ADMIN_PASSWORD`) - not the preserved Supabase-Auth
  login from the earlier phase, and **unchanged by the Neon migration**.
  See section 9 for how the two admin modes relate.
- **The existing wizard, cards, countdown, and preview modes are
  untouched** - the console reuses `ResourceWizard.tsx` and
  `AdminCatalogPage.tsx` exactly as they were; only `resourceStore.ts`'s
  read/write functions grew a second, backend-backed implementation behind
  the same function signatures (`getAllResources`, `addResource`,
  `updateResource`, `deleteResource`).

### Setup (optional - skip entirely to keep the previous, backend-free behavior)

1. **Create a free Neon project** at [neon.tech](https://neon.tech) if you
   don't have one, and copy its connection string (Dashboard → your project
   → Connection Details → "Pooled connection" works fine - every query this
   project makes is a single one-shot HTTP call, not a long-lived session).
2. **Create the table.** Run `db/resources_schema.sql` against that
   database - e.g. paste it into Neon's own SQL Editor, or
   `psql "$DATABASE_URL" -f db/resources_schema.sql` from your own machine.
   This is independent of the preserved `supabase/schema.sql`/
   `storage_policies.sql` from the earlier Admin phase - a different table,
   in a different database, and it does not modify anything the old Admin
   panel uses.
3. **Set the one public, client-safe variable** (not a secret - carries no
   connection info, see `.env.example`):
   - `VITE_RESOURCES_BACKEND_ENABLED=true`
4. **Set the four server-only variables** in your hosting platform's
   environment settings (Vercel → Project Settings → Environment
   Variables) - **never** with a `VITE_` prefix, never in a file that gets
   committed:
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD` - the owner's chosen login. Change
     either one any time by updating the env var and redeploying; no code
     change is ever required.
   - `ADMIN_SESSION_SECRET` - a long random string (`openssl rand -base64
     32`) used only to sign the admin session cookie.
   - `DATABASE_URL` - the Neon connection string from step 1. This is the
     one credential that can read and write the `resources` table (see
     "Why the database is safe to reach only from the server" below) and is
     read exclusively inside the serverless functions under `api/`, never
     sent to a browser.
5. Deploy. Visiting the site now reads the catalog from the database
   instead of (only) the build-time seed; opening the three-dot menu →
   Admin → logging in with the username/password from step 4 lets the
   owner add, edit, or delete resources that every visitor then sees.

### Why the database is safe to reach only from the server

Neon is plain Postgres - it has no Supabase-style PostgREST/RLS layer or
public "anon key" built in, and this project doesn't build one on top of
it either. Instead, there is simply no path from the browser to the
database at all: every single access to the `resources` table, reads
included, goes through this project's own server-side Vercel Edge
Functions (`api/resources/index.ts` for reads, `api/resources/index.ts`
and `api/resources/[id].ts` for admin writes), which hold the only
credential that can reach it, `DATABASE_URL` - read with
`process.env.DATABASE_URL` only inside `api/_lib/resourcesDb.ts`, never
with the browser-visible `import.meta.env`, and never bundled into the
Vite app the browser downloads (`api/` is built and run entirely
separately, by Vercel's own Edge Function pipeline, not by `vite build`).
Public reads are intentionally unauthenticated (it's a public catalog -
there's nothing in that table a visitor couldn't already see on the site),
but every write additionally requires the admin session cookie
(`requireAdminSession`, unchanged by this migration) before a single query
runs - a signed-out `POST`/`PATCH`/`DELETE` never reaches the database at
all. Every query is a parameterized `sql\`...\`` tagged-template call
(`@neondatabase/serverless`), never string-built SQL, which is what
actually rules out SQL injection from a malicious value in a resource's
title or description.

### Admin authentication, in brief

- Login (`POST /api/admin/login`) compares the submitted username/password
  against `ADMIN_USERNAME`/`ADMIN_PASSWORD` using a constant-time string
  comparison (so a wrong guess can't be timed to learn how many characters
  matched), then - only on success - issues a signed, expiring (8-hour)
  session token in an `HttpOnly; Secure; SameSite=Strict` cookie. The
  token is signed with HMAC-SHA256 (`ADMIN_SESSION_SECRET`, via the
  platform's built-in Web Crypto - no new dependency), so a client can't
  forge or extend one.
- Every write endpoint (`POST /api/resources`, `PATCH`/`DELETE
  /api/resources/:id`) re-verifies that cookie server-side on every single
  request via `requireAdminSession()` - the frontend's own belief that it's
  logged in is never trusted or treated as authorization.
- If any of the three required env vars is missing, the login page shows a
  plain "the admin console isn't configured yet" notice instead of a
  confusing failed-login error, and the login endpoint itself refuses
  (500) rather than silently accepting an empty password.

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

### ⚠️ Honest limitation: local-only persistence (only when no backend is configured)

Without the optional backend from section 0, the admin wizard has no real
database behind it. Anything added or edited through it is saved to
`localStorage` in the browser/profile the admin used
(`src/data/resourceStore.ts`, key `studio-learn:catalog-overrides`), merged
at read time with the build-time seed (`src/data/resources.ts`). It is
**not** visible to other visitors, not visible on another device, and not
visible to the admin themselves in a different browser. The Admin Catalog
screen states this plainly in a banner.

Once `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set (section 0), this
limitation goes away for anything added through the new admin console: a
resource added or edited there is saved to the database and appears to
every visitor, on every device, immediately. One narrower limitation
remains, and is worth stating plainly rather than hiding: the handful of
resources seeded at build time in `src/data/resources.ts` (the original VS
Code entry, for instance) can't be *deleted* once a backend is active -
only superseded, by editing that same resource to different content from
the admin console - since there is no "this seed id was deleted" tombstone
mechanism. This was a deliberate scope decision (see section 0 and the
master prompt's "keep the implementation small" rule) rather than an
oversight; building a tombstone table for a handful of seed rows would be
real added infrastructure for a problem solvable just as well by editing
the one or two seed resources directly in `src/data/resources.ts` if one
ever needs to stop shipping them at all.

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
  Supabase **anon** key (public-by-design, used only by the preserved,
  disabled-by-default legacy Admin panel). `DATABASE_URL` and the admin
  console's credentials are never given a `VITE_` prefix and are read only
  inside `api/` - see section 0.

## 9. Admin: two independent modes behind one route

`/admin` now resolves to one of two completely separate implementations,
chosen at build time by the single existing `VITE_ENABLE_ADMIN` flag -
reused exactly as-is rather than inventing a second switch:

**`VITE_ENABLE_ADMIN` unset or `"false"` (the default since this upgrade) -
the new, lightweight console.** Username/password login against
`ADMIN_USERNAME`/`ADMIN_PASSWORD` (section 0), reached only via the
header's three-dot menu, landing on the same `AdminCatalogPage.tsx` (the
**الموارد**/Catalog screen) the legacy panel also uses - the catalog UI
itself was not forked or rebuilt, only the auth/session layer underneath
it is new (`src/context/AdminSessionContext.tsx`,
`src/routes/AdminSessionGate.tsx`, `api/admin/*`, `api/resources/*`).

**`VITE_ENABLE_ADMIN=true` - the original Supabase-Auth panel, fully
preserved, none of it deleted** (`src/pages/admin/*` other than
`AdminCatalogPage.tsx`, `src/components/admin/*` other than the new
`MoreMenu.tsx`/`*Providers.tsx`/`AdminConsoleLayout.tsx`, `src/services/*`,
`src/lib/supabaseClient.ts`, `src/context/AuthContext.tsx`,
`supabase/schema.sql`, `supabase/storage_policies.sql`). Use this when you
want the original email/password Supabase-Auth login and its Dashboard/
Files/Upload/Users screens back - nothing about this upgrade changes how
that mode behaves. To use it locally: `VITE_ENABLE_ADMIN=true` in `.env`,
`npm run dev`, visit `/admin/login`. Without `VITE_SUPABASE_URL`/
`VITE_SUPABASE_ANON_KEY` set, it runs the local demo mode in
`src/services/mock` (sign in as `owner@example.com` with any password).

Both modes are lazy-loaded (`React.lazy`) behind a shared `<AdminGate>`, so
whichever one is **not** selected never reaches the browser at all - the
public bundle carries neither `@supabase/supabase-js` nor the new console's
code until a visitor actually opens `/admin`. The public `Header` itself
still has no link to `/admin` and no auth awareness of either mode; the
three-dot `MoreMenu` is the only entry point in the whole public UI.

## 10. How to add a resource

**Through the UI (recommended):** open the three-dot menu → **Admin** → log
in → **الموارد** → "إضافة الملفات" → the same 4-step wizard as before. If
the optional backend (section 0) is configured, the new resource is saved
to the database and every visitor sees it immediately, on every device.
Otherwise it's saved to this browser's `localStorage` only (see the
honest limitation in section 5). Either way, no source-code edit is
needed, and the legacy `VITE_ENABLE_ADMIN=true` panel still reaches the
exact same wizard and screen for anyone who prefers that login.

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
rest of `.env.example` are all optional overrides, and the catalog runs in
`localStorage`-only mode with no backend configured at all. `vercel.json`
already has the one rewrite rule a client-side-routed SPA needs so that
opening `/resources/vscode-windows-7` directly doesn't 404, and Vercel
picks up the Edge Functions under `api/` automatically - no extra
configuration is needed for those to deploy alongside the static site.

To turn on the optional cross-device backend and the admin console
instead, also set (see section 0 for the full walkthrough):

| Variable | Where | Visible to the browser? |
|---|---|---|
| `VITE_RESOURCES_BACKEND_ENABLED` | Vercel env vars | Yes (by design - a plain `true`/`false` flag, not a secret) |
| `ADMIN_USERNAME` | Vercel env vars, **server-only** | No |
| `ADMIN_PASSWORD` | Vercel env vars, **server-only** | No |
| `ADMIN_SESSION_SECRET` | Vercel env vars, **server-only** | No |
| `DATABASE_URL` | Vercel env vars, **server-only** | No |

A "server-only" variable must **not** be given a `VITE_` prefix - Vite
inlines every `VITE_`-prefixed variable into the shipped JS bundle, so
prefixing any of the last four would leak it to every visitor's browser.
(`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are a separate pair, needed
only if you also turn on the legacy `VITE_ENABLE_ADMIN=true` panel - see
section 9.)

---

## Architecture

```
GitHub → Vercel (static site + Edge Functions) → Google Drive / OneDrive (file hosts)
                      ↓ (optional, metadata only, server-side only)
                 Neon Postgres (resources table)
```

```
src/
  types/index.ts              Resource (active) + FileResource (preserved
                               Admin/Supabase model) - intentionally two
                               independent shapes, see section 9.
  data/
    resources.ts                seedResources - the build-time catalog.
    resourceStore.ts            THE read/write API: merges seedResources
                                 with either localStorage admin overrides
                                 or the optional backend's rows, behind the
                                 same function signatures either way.
  lib/
    provider.ts                  URL detection/validation/preview-URL
                                  derivation - the only file that parses a
                                  provider URL.
    resourceModel.ts             normalizeResource() (backward compat) +
                                  getActionLabelKey().
    validation.ts                Field length limits for the admin wizard.
    resourceBackend.ts            NEW - public read path: fetch() against
                                  this site's own GET /api/resources (never
                                  a direct database connection from the
                                  browser).
    adminConsoleClient.ts          NEW - admin write/session fetch()
                                  wrappers calling /api/admin/* and
                                  /api/resources*.
  hooks/useCatalogVersion.ts        NEW - re-renders pages once backend
                                   data arrives (tiny pub-sub, no state
                                   library).
  context/AdminSessionContext.tsx   NEW - the new console's session state,
                                   parallel to (independent of) AuthContext.
  routes/AdminSessionGate.tsx        NEW - parallel to ProtectedRoute.tsx.
  config/
    resourceTypes.ts              Per-CatalogResourceType icon/label/
                                   allowed access modes/default preview.
    categories.ts, download.ts, splash.ts, admin.ts, site.ts, upload.ts
  components/
    resources/                    ResourceCard, FeaturedResource,
                                   ResourcePreview, ProviderPreview,
                                   CategoryPill, ResourceGrid/Filters -
                                   the active storefront UI, untouched.
    video/VideoPlayer.tsx         Real custom player for direct video files.
    download/DownloadPreparationModal.tsx
    admin/wizard/                 The 4-step "إضافة الملفات" wizard,
                                  untouched except an error message on a
                                  failed backend save.
    admin/LegacyAdminProviders.tsx  NEW - lazy-only AuthProvider wrapper
                                   (keeps @supabase/supabase-js out of the
                                   main bundle; fixes a bug where it wasn't).
    admin/NewAdminProviders.tsx      NEW - lazy-only AdminSessionProvider
                                   wrapper, mirrors the above.
    admin/AdminConsoleLayout.tsx     NEW - minimal shell for the new console.
    layout/MoreMenu.tsx               NEW - the three-dot menu; the only
                                     place /admin is linked from publicly.
    layout/, ui/                  Shell, theme/language, shared primitives.
  pages/
    HomePage.tsx, ResourceDetailsPage.tsx   Read through resourceStore.ts;
                                 now also re-render via useCatalogVersion().
    admin/AdminCatalogPage.tsx     List/add/edit/delete catalog resources,
                                   launches the wizard - shared by both
                                   admin modes, untouched apart from an
                                   auto-refresh subscription.
    admin/AdminConsoleLoginPage.tsx  NEW - username/password login for the
                                    new console.
    admin/AdminFilesPage.tsx, LoginPage.tsx, etc.   Preserved, untouched.
  services/, lib/supabaseClient.ts, context/AuthContext.tsx
                                   Preserved Supabase/mock backend - legacy
                                   Admin panel only.
  routes/router.tsx               Route tree incl. the VITE_ENABLE_ADMIN
                                   gate choosing between the legacy and new
                                   admin route subtrees (section 9).
api/                               NEW - Vercel Edge Functions, built and
                                   run independently of the Vite app; never
                                   reaches the browser bundle.
  admin/login.ts, logout.ts, session.ts   Username/password login, cookie
                                         session issue/clear/check.
  resources/index.ts                GET (public) + POST (admin-protected)
                                   against the resources table.
  resources/[id].ts                 PATCH/DELETE (admin-protected).
  _lib/adminAuth.ts, cookies.ts, resourcesDb.ts   Session signing/
                                   verification, cookie flags, and the
                                   Neon `sql` tagged-template client
                                   (`@neondatabase/serverless`) - server-only
                                   code, `DATABASE_URL` read here only.
supabase/
  schema.sql, storage_policies.sql   Preserved, legacy Admin/FileResource
                                     model - untouched, unrelated table.
                                     (The resources catalog's own schema
                                     lives in db/, not here - see below.)
db/
  resources_schema.sql                The metadata-only `resources` table
                                     for Neon (section 0) - no RLS/policies,
                                     since every access already goes
                                     through api/'s own server-side auth.
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

**I was not able to run these in this sandbox, in this phase either.**
`npm install` was re-attempted (not assumed from any earlier phase) and
still fails with `403 Forbidden` from `registry.npmjs.org` - confirmed
freshest on this phase's own new dependency
(`@neondatabase/serverless`), so this is a sandbox-level network policy,
not anything specific to a particular package. This phase adds exactly
**one** new npm dependency (`@neondatabase/serverless`, for the Edge
Function's Postgres queries); nothing else in `api/` or the frontend
needed a new package. Nothing downstream of `npm install` (`typecheck`,
`lint`, `build`) can run without `node_modules`; `npm run build` was still
run to confirm it fails for exactly that reason (missing `vite`,
`@types/node`, etc.) and not for any code-level error.

What I did instead, as a substitute - not an equivalent - for the real
commands, re-run fresh for everything this phase touched (now including
the new `api/` directory, added to `tsconfig.json`'s `include`):

- Parsed **every** `.ts`/`.tsx` file in `src/` and `api/` (94 files) with
  the actual TypeScript compiler's parser (a globally-available
  `typescript` package, used directly via its API) and confirmed **zero
  syntax errors**. This catches malformed JSX, unbalanced brackets, and
  invalid syntax, but **not** type errors, since no `node_modules` could be
  installed to type-check against.
- Verified every `@/...` import alias in `src/` resolves to a real file on
  disk (235 imports checked), and separately confirmed `api/` never
  imports across the `@/` build boundary (by design - `api/` is built
  independently of the Vite app) while its own relative imports (11
  checked) all resolve.
- Verified every `t('...')` key used anywhere in the code resolves in both
  `src/i18n/locales/ar.json` and `src/i18n/locales/en.json`, and that the
  two files have byte-for-byte identical key sets (182 keys each, up from
  175 before this phase's additions).
- Checked for unused named imports (none found), `dangerouslySetInnerHTML`
  (none found), that every `target="_blank"` link carries
  `rel="noopener noreferrer"` (both instances do), that every issued
  session cookie carries `HttpOnly`/`Secure`/`SameSite=Strict` (all do,
  including the logout-clearing one), that the dangerous-URL-scheme list
  (`javascript:`/`data:`/`vbscript:`/`file:`) is identical on both the
  client validator and the server-side one, and that `DATABASE_URL` and the
  admin credentials never appear with a `VITE_` prefix or anywhere outside
  `api/` (only in explanatory comments, never as a value).
- Confirmed every query in `api/_lib/resourcesDb.ts` is a parameterized
  `` sql`...` `` tagged-template call (never a string-concatenated query),
  that `GET /api/resources` is the only unauthenticated route and that both
  `POST /api/resources` and `PATCH`/`DELETE /api/resources/:id` call
  `requireAdminSession()` before touching the database, and that
  `deleteResourceRow()` only ever runs a `DELETE FROM resources`, with no
  code path able to reach a Drive/OneDrive file.
- Manually re-read every new and changed file for logical correctness
  (the admin-write endpoints checking the session before running a query,
  `resourceStore.ts`'s backend/local branches not sharing mutable state
  incorrectly, the Neon `tags` column round-tripping as a Postgres
  `text[]`, etc.).

**Known-fixed build error (from a real Vercel build, not this sandbox):**
a first version of `api/_lib/resourcesDb.ts` derived its `Sql` type as
`ReturnType<typeof neon>`, which a real `tsc` resolved to the broad union
`any[][] | Record<string, any>[] | FullQueryResults<boolean>` -
`neon()`'s result shape depends on two options (`arrayMode`, `fullResults`)
that can also be flipped globally at runtime, so its type - uncalled, with
no options pinned - correctly reports every shape it could produce. That
broke `rows[0]`/`rows.length` wherever a row was read back after an
insert/update. The fix: `createNeonSql()`, a small non-overloaded wrapper
that calls `neon(databaseUrl, { arrayMode: false, fullResults: false })`
and is the one `Sql` is now derived from - pinning every query made
through it to the single concrete shape `Promise<Record<string, any>[]>`,
with no `any` casts anywhere in the file (just a direct, narrowing
`as ResourceRow`/`as ResourceRow[]` from that concrete object-array type).
This was caught and fixed from the real error message a production Vercel
build produced - this sandbox still cannot install
`@neondatabase/serverless` to re-verify it with a real `tsc` run, so a
second look after your next `npm run build` is still worthwhile.

**Please run the four commands above yourself** in an environment with
normal registry access before deploying. Treat this project as a
carefully-reviewed draft, not a verified-green build - that distinction
matters more than claiming a success I could not actually produce.

---

## Adding resources at scale

The migration this section used to describe as a future step - moving
`resourceStore.ts`'s body to real API calls against a backend, without
changing any caller's signature - is what section 0 now describes as
already built and optional. For day-to-day use once that backend is
configured, the admin console (section 0) is the intended path at any
scale: every write goes straight to the database and is visible to every
visitor immediately, with no `localStorage` size or cross-device
limitation to run into. The one remaining edge case is the handful of
build-time seed resources, covered honestly in section 5's limitation
note.
