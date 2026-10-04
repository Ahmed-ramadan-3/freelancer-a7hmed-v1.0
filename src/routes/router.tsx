import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from './ProtectedRoute';
import { HomePage } from '@/pages/HomePage';
import { ResourceDetailsPage } from '@/pages/ResourceDetailsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { isAdminEnabled } from '@/config/admin';
import { AuthProvider } from '@/context/AuthContext';

/**
 * Admin pages (and everything they pull in - Supabase client, auth service)
 * are lazy-loaded, so they live in their own chunk(s) that the browser only
 * ever fetches if a route inside /admin actually renders. Combined with
 * <AdminGate> below, when VITE_ENABLE_ADMIN is unset the lazy import() is
 * never called at all - the code is fully preserved in the repository, but
 * zero admin/Supabase bytes are downloaded by a visitor to the active site
 * (master spec, "Admin panel - CRITICAL").
 */
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
const AdminCatalogPage = lazy(() =>
  import('@/pages/admin/AdminCatalogPage').then((m) => ({ default: m.AdminCatalogPage })),
);
const AdminUploadPage = lazy(() =>
  import('@/pages/admin/AdminUploadPage').then((m) => ({ default: m.AdminUploadPage })),
);
const AdminUsersPage = lazy(() =>
  import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
);

function AdminLoadingFallback() {
  return <p className="py-16 text-center text-sm text-muted">Loading...</p>;
}

/**
 * The one and only place the "is Admin on?" flag is checked. Disabled ->
 * every /admin/* URL renders the normal 404, exactly as if the routes
 * didn't exist, and nothing further down this tree ever mounts.
 */
function AdminGate() {
  if (!isAdminEnabled) return <NotFoundPage />;
  return (
    <AuthProvider>
      <Suspense fallback={<AdminLoadingFallback />}>
        <Outlet />
      </Suspense>
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/resources/:id', element: <ResourceDetailsPage /> },
      {
        path: '/admin',
        element: <AdminGate />,
        children: [
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
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
