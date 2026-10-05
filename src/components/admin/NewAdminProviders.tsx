import { Outlet } from 'react-router-dom';
import { AdminSessionProvider } from '@/context/AdminSessionContext';

/**
 * Imported only through `lazy()` in src/routes/router.tsx, so
 * AdminSessionContext (and everything the new admin console needs) stays
 * out of the main bundle until a visitor actually opens `/admin` - same
 * reasoning as src/components/admin/LegacyAdminProviders.tsx for the old
 * panel. In practice this one is already small (no Supabase client), but
 * the pattern is kept consistent between the two branches.
 */
export function NewAdminProviders() {
  return (
    <AdminSessionProvider>
      <Outlet />
    </AdminSessionProvider>
  );
}
