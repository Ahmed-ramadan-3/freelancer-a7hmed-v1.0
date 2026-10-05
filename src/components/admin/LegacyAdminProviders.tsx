import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';

/**
 * Bug fix: `AuthProvider` (and transitively `@/services` -> `@supabase/
 * supabase-js`) must only ever load as part of the lazy-loaded legacy admin
 * chunk (VITE_ENABLE_ADMIN=true) - never the main bundle a public visitor
 * downloads (master spec, "Admin panel - CRITICAL"). Importing `AuthProvider`
 * directly at the top of src/routes/router.tsx defeated that, since
 * router.tsx itself is imported eagerly by App.tsx - this one-line wrapper,
 * imported only through `lazy()`, is what actually puts it in its own
 * chunk. Used only by the legacy (VITE_ENABLE_ADMIN=true) route branch in
 * router.tsx - the new default admin console never needs Supabase Auth at
 * all (see src/context/AdminSessionContext.tsx).
 */
export function LegacyAdminProviders() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
