# SITE_NAME - Digital Resource Store

A small, Arabic-first (RTL by default, English supported) digital resource
store. The website is the catalog and the storefront UI; **Google Drive is
where the actual files live and where downloads actually happen.**

---

## 1. What this project does

A visitor opens the site, sees the resource(s) on offer, opens one, and
presses Download. The site shows a short, honest "preparing your link"
countdown, then a button that opens that resource's exact Google Drive file
page in a new tab. From there, Google Drive's own Download button does the
real work. The site itself never downloads or stores the file.

Right now the catalog has exactly one resource - **Visual Studio Code for
Windows 7** - but the architecture is built to hold many more without any
structural changes; see section 3/5 below.

## 2. Google Drive's role

Google Drive is the file host. This project never uses the Google Drive API,
OAuth, a service account, or any scraping/direct-download trick - it simply
links to the normal "Anyone with the link can view" sharing page for each
file, exactly as Google Drive generates it. The site's only job is to open
that exact page; Google Drive's own UI handles authentication-free public
downloads from there.

## 3. How to add a resource

Open `src/data/resources.ts` and add another object to the `resources`
array, following the `Resource` shape in `src/types/index.ts`:

```ts
{
  id: 'unique-slug',
  title: 'Resource title',
  description: 'Short description',
  category: 'programming', // must match a slug in src/config/categories.ts
  fileType: 'ZIP',
  fileSize: '250 MB',
  platform: 'Windows 10',                 // optional
  icon: '/icons/resources/your-icon.svg', // optional, see "Icons" below
  googleDriveUrl: 'https://drive.google.com/file/d/<FILE_ID>/view?usp=sharing',
  tags: ['Some', 'Tags'],
  featured: false,
}
```

Nothing else needs to change - the search, the category filters, the grid,
and the details page all read from this one array automatically.

## 4. Where the Google Drive URL lives

Only in `src/data/resources.ts`, one `googleDriveUrl` field per resource. It
is never duplicated, rewritten, or hard-coded anywhere else in the app -
`DownloadPreparationModal` reads it directly from the resource object it's
given.

## 5. How to replace the current URL

Open `src/data/resources.ts`, find the resource, and replace its
`googleDriveUrl` with the new file's exact Google Drive share link (right
-click the file in Google Drive -> Share -> Copy link, with general access
set to "Anyone with the link"). Use the link exactly as Google Drive gives
it to you - do not edit it into a "direct download" form.

## 6. How to change title / description / icon / size

All in the same object in `src/data/resources.ts`: edit `title`,
`description`, `fileSize`, or `icon` directly. For a new icon, drop an SVG or
PNG into `public/icons/resources/` and point `icon` at its `/icons/...` path.

## 7. How the preparation countdown works

`src/config/download.ts` exports `DOWNLOAD_PREPARATION_SECONDS` (default
`5`, and clamped between 1 and 10 even if misconfigured). Every download
button opens `DownloadPreparationModal`
(`src/components/download/DownloadPreparationModal.tsx`), which counts down
from that number, then reveals an "Open Google Drive" link to the resource's
exact `googleDriveUrl`. To change the timing everywhere at once, either edit
the constant or set `VITE_DOWNLOAD_PREPARATION_SECONDS` in `.env`.

## 8. GitHub deployment

```bash
git init                      # if not already a repo
git add .
git commit -m "Resource store refactor"
git remote add origin <your-repo-url>
git push -u origin main
```

The 519 MB ZIP is never part of this repository - see section 10.

## 9. Vercel deployment

1. Import the GitHub repository at vercel.com.
2. Framework preset: **Vite** (auto-detected).
3. Build command: `npm run build`. Output directory: `dist`.
4. No environment variables are required for the active store to work. If
   you want the branding placeholder replaced, add `VITE_SITE_NAME` (and the
   other variables in `.env.example`) under Project Settings -> Environment
   Variables.
5. Deploy. `vercel.json` in the repo root adds the one rewrite rule a
   client-side-routed SPA needs so that refreshing or directly opening
   `/resources/vscode-windows-7` doesn't 404.

No server-side runtime, database, or Node.js installation is required on
your own machine - everything after `git push` happens on GitHub/Vercel's
infrastructure, which matters since this project assumes you're on Windows 7
and may not have Node.js available locally.

## 10. Why the 519 MB ZIP is not in GitHub

GitHub, Vercel, and Supabase all have practical or hard size limits far
below 519 MB, and none of them are designed to be a general file host.
Committing a file that large would bloat the repository permanently (Git
never really "removes" old blobs from history without a rewrite), slow down
every clone and every Vercel build, and in Vercel's case likely exceed
deployment size limits outright. Google Drive is already a full file host
with resumable downloads, a UI unauthenticated visitors already understand,
and no cost to this project - so the file stays there, and the site only
ever links to it.

## 11. That Google Drive performs the actual download

To repeat the flow plainly: **the website never downloads the file.** It
shows the resource, runs a short countdown, and then hands off to Google
Drive by opening the exact file's page in a new tab. Every byte of the
actual 519 MB transfer happens between the visitor's browser and Google's
servers, with no involvement from this website, Vercel, or GitHub.

## 12. Admin is preserved but disabled

See "Admin panel: preserved, disabled" below.

---

## Architecture

```
GitHub  →  Vercel  →  Vite + React static site  →  Google Drive (file host)
```

No custom backend is required for the active product. The catalog is a
static, type-checked TypeScript array (`src/data/resources.ts`) bundled
directly into the site - there is no database call, no loading spinner for
the catalog itself, and nothing to provision.

```
src/
  data/resources.ts         THE catalog. Add a resource here.
  types/index.ts             `Resource` (active) and `FileResource` (preserved
                              Admin/Supabase model) intentionally coexist -
                              see "Two data models" below.
  config/
    categories.ts             Category taxonomy (shared by the active store
                               and the preserved Admin panel).
    download.ts                DOWNLOAD_PREPARATION_SECONDS.
    admin.ts                    The VITE_ENABLE_ADMIN flag.
    site.ts, upload.ts          Branding / Admin upload limits.
  components/
    resources/                 ResourceCard, ResourceGrid, ResourceFilters,
                                FeaturedResource, CategoryPill - the active
                                storefront UI, reading `Resource` objects.
    download/                  DownloadPreparationModal (the countdown flow).
    layout/                    Header (no auth-awareness), Footer, splash,
                                theme/language switchers, AppShell.
    admin/                     Preserved Admin nav, layout, upload dropzone.
    ui/                        Shared primitives used by both the active site
                                and the preserved Admin panel.
  pages/
    HomePage.tsx                Hero, search, categories, featured pick, grid.
    ResourceDetailsPage.tsx     /resources/:id - reads resources.ts directly.
    NotFoundPage.tsx
    LoginPage.tsx, admin/*      Preserved Admin screens (lazy-loaded, see below).
  services/, lib/supabaseClient.ts, context/AuthContext.tsx, hooks/useFiles.ts
                                Preserved Supabase/mock backend layer - used
                                ONLY by the Admin panel, never by the active
                                store. Each file is marked "⚠️ ADMIN-ONLY".
  routes/router.tsx             The whole route tree, including the
                                VITE_ENABLE_ADMIN gate.
supabase/                       schema.sql + storage_policies.sql - preserved
                                database/security design for a future
                                reactivated Admin+Supabase backend. Not run
                                against anything by the active site.
```

### Two data models, on purpose

- **`Resource`** (`src/data/resources.ts`) is the active model: flat,
  single-language string fields, no backend id, no async fetch. This is
  what the storefront (`HomePage`, `ResourceDetailsPage`,
  `components/resources/*`) uses exclusively.
- **`FileResource`** (`src/types/index.ts`) is the pre-existing model the
  Admin panel and its Supabase/mock services were built around - a richer,
  database-shaped type with bilingual fields and storage metadata. It still
  exists, untouched, because the Admin panel (preserved, not deleted) still
  needs it. The two models don't need to match, because they now serve two
  independent parts of the codebase: one active and static, one preserved
  and dormant.

### Admin panel: preserved, disabled

The Admin panel (`src/pages/admin/*`, `src/components/admin/*`,
`src/services/*`, `src/lib/supabaseClient.ts`, `src/context/AuthContext.tsx`,
`supabase/*.sql`) is **fully preserved in this repository** - none of it was
deleted. It is off by default in the active product:

- Every `/admin/*` route is lazy-loaded (`React.lazy` in
  `src/routes/router.tsx`), so its code - including the entire
  `@supabase/supabase-js` dependency - lives in separate chunks the browser
  never fetches unless a route inside `/admin` actually renders.
- `src/config/admin.ts` reads `VITE_ENABLE_ADMIN`. When it isn't `"true"`
  (the default), every `/admin/*` URL renders the normal 404 page via a
  single `<AdminGate>` check, and nothing inside ever mounts - not the lazy
  import, not `AuthProvider`, nothing.
- The public `Header` has **no link to `/admin` anywhere** and no
  authentication awareness at all - `AuthProvider` now lives only inside the
  gated `/admin` subtree, not wrapping the whole app.

To bring it back for local development: set `VITE_ENABLE_ADMIN=true` in
`.env`, run `npm run dev`, and visit `/admin/login`. It will run against the
same local demo mode described in the previous version of this project
(`src/services/mock`) unless you also configure `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` - see the comments in `.env.example`.

### Icons

`public/icons/resources/vscode-windows-7.svg` is an **original, generic
placeholder** (a rounded window with a code-bracket mark) - it is
deliberately not a reproduction of Microsoft's Visual Studio Code logo,
which is a registered trademark this project has no rights to reproduce. If
you have the rights to use the official icon, replace that SVG file (keep
the same filename, or update the `icon` path in `resources.ts`) with your
own asset.

---

## Verification

The four commands the project should be checked with before every deploy:

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

**I was not able to run these in this environment** - this sandbox has no
network access, so `npm install` cannot reach the npm registry, and nothing
downstream of it can run either. I reviewed every changed and new file by
hand and with static scripts (checking bracket balance, duplicate/unused
imports, that every `t('...')` translation key resolves in both `ar.json`
and `en.json`, and that every lazy-loaded admin component's import path
matches its actual named export) - but that is a substitute for, not
equivalent to, actually compiling and building the project. **Please run the
four commands above yourself** before deploying, and treat anything here as
a carefully-reviewed draft rather than a verified-green build.

---

## Vercel settings (reference)

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Required environment variables | None (all optional - see `.env.example`) |

---

## Adding future resources at scale

For a handful of resources, keep adding objects to `src/data/resources.ts`
as described in section 3. If the catalog grows large enough that hand-
editing one file becomes awkward, reasonable next steps (not built now,
per the instruction not to add speculative features) would be: splitting
`resources.ts` into one file per category and re-exporting a merged array,
or - if the Admin+Supabase panel is ever reactivated for real - migrating
the catalog into the `files`/`categories` tables `supabase/schema.sql`
already defines, and pointing the active `HomePage`/`ResourceDetailsPage` at
that service instead of the static array. Either path is additive; nothing
about the current structure needs to be undone to get there.
