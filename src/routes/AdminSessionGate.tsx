import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminSession } from '@/context/AdminSessionContext';
import { useTranslation } from '@/i18n';

/**
 * The new-admin-console equivalent of src/routes/ProtectedRoute.tsx, but
 * checking the HttpOnly session cookie (via AdminSessionContext) instead of
 * Supabase Auth. Like ProtectedRoute, this is a UX convenience, not the
 * real security boundary - the actual boundary is api/_lib/adminAuth.ts's
 * `requireAdminSession()`, checked again, server-side, on every write.
 */
export function AdminSessionGate() {
  const { isAuthenticated, isLoading } = useAdminSession();
  const location = useLocation();
  const { t } = useTranslation();

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-muted">{t('common.loading')}</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
