import { lazy, Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminSessionGate } from './AdminSessionGate';
import { HomePage } from '@/pages/HomePage';
import { ResourceDetailsPage } from '@/pages/ResourceDetailsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { isAdminEnabled } from '@/config/admin';

/**
 * Admin pages (and everything they pull in - Supabase client, auth service)
 * are lazy-loaded, so they live in their own chunk(s) that the browser only
 * ever fetches if a route inside /admin actually renders - including the
 * provider components themselves (`LegacyAdminProviders`/
 * `NewAdminProviders` below), NOT just the page components. Importing
 * `AuthProvider` directly at this file's top level used to defeat that for
 * the legacy branch, since this file is itself eager-loaded by App.tsx -
 * see LegacyAdminProviders.tsx's comment. Every admin import here goes
 * through `lazy()` for exactly that reason (master spec, "Admin panel -
 * CRITICAL" / "Do NOT add unnecessary infrastructure" to the public bundle).
 */

// --- Legacy panel (VITE_ENABLE_ADMIN=true only) - fully preserved --------
const LegacyAdminProviders = lazy(() =>
  import('@/components/admin/LegacyAdminProviders').then((m) => ({ default: m.LegacyAdminProviders })),
);
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const AdminLayout = lazy(() =>
  import('@/components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminFilesPage = lazy(() =>
  import('@/pages/admin/AdminFilesPage').then((m) => ({ default: m.AdminFilesPage })),
);
const AdminUploadPage = lazy(() =>
  import('@/pages/admin/AdminUploadPage').then((m) => ({ default: m.AdminUploadPage })),
);
const AdminUsersPage = lazy(() =>
  import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
);

// --- New admin console (the default - VITE_ENABLE_ADMIN unset/false) -----
const NewAdminProviders = lazy(() =>
  import('@/components/admin/NewAdminProviders').then((m) => ({ default: m.NewAdminProviders })),
);
const AdminConsoleLoginPage = lazy(() =>
  import('@/pages/admin/AdminConsoleLoginPage').then((m) => ({ default: m.AdminConsoleLoginPage })),
);
const AdminConsoleLayout = lazy(() =>
  import('@/components/admin/AdminConsoleLayout').then((m) => ({ default: m.AdminConsoleLayout })),
);

// --- Shared by both branches ----------------------------------------------
const AdminCatalogPage = lazy(() =>
  import('@/pages/admin/AdminCatalogPage').then((m) => ({ default: m.AdminCatalogPage })),
);

function AdminLoadingFallback() {
  return <p className="py-16 text-center text-sm text-muted">Loading...</p>;
}

/**
 * The one and only place the "is legacy Admin on?" flag is checked.
 *
 * - `VITE_ENABLE_ADMIN=true`: the fully preserved Supabase/FileResource
 *   panel (master spec from the previous phase - unchanged).
 * - unset/`false` (the project's default, and now the normal production
 *   path): the new, lightweight, env-var-login-gated Catalog console
 *   (master spec, THIS phase, sections 3-5) - `/admin` no longer 404s by
 *   default, because the whole point of this phase is that a real Admin
 *   area now exists and is reachable (just not linked from the homepage -
 *   see the Header's three-dot menu).
 */
function AdminGate() {
  const Providers = isAdminEnabled ? LegacyAdminProviders : NewAdminProviders;
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <Providers />
    </Suspense>
  );
}

const legacyAdminChildren: RouteObject[] = [
  { path: 'login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'catalog', element: <AdminCatalogPage /> },
          { path: 'files', element: <AdminFilesPage /> },
          { path: 'upload', element: <AdminUploadPage /> },
          {
            path: 'users',
            element: <ProtectedRoute requireOwner />,
            children: [{ index: true, element: <AdminUsersPage /> }],
          },
        ],
      },
    ],
  },
];

const newAdminConsoleChildren: RouteObject[] = [
  { path: 'login', element: <AdminConsoleLoginPage /> },
  {
    element: <AdminSessionGate />,
    children: [
      {
        element: <AdminConsoleLayout />,
        children: [{ index: true, element: <AdminCatalogPage /> }],
      },
    ],
  },
];

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/resources/:id', element: <ResourceDetailsPage /> },
      {
        path: '/admin',
        element: <AdminGate />,
        // Resolved once at module load (isAdminEnabled is a build-time
        // env flag, not something that changes at runtime), exactly like
        // AdminGate's own branch above - the two always agree.
        children: isAdminEnabled ? legacyAdminChildren : newAdminConsoleChildren,
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
