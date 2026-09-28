import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n';

/**
 * Client-side gating only controls what the UI *shows*; it is a UX
 * convenience, not the security boundary (master spec, section 27: "Do not
 * allow the frontend to decide whether someone is an owner"). The real
 * boundary is enforced by Postgres RLS in supabase/schema.sql - even if
 * someone bypassed this component entirely, the backend would still refuse
 * unauthorized reads/writes.
 */
export function ProtectedRoute({ requireOwner = false }: { requireOwner?: boolean }) {
  const { session, isLoading, isStaff, isOwner } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-muted">{t('common.loading')}</p>;
  }

  if (!session || !isStaff) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (requireOwner && !isOwner) {
    return <p className="py-16 text-center text-sm text-muted">{t('admin.ownerOnly')}</p>;
  }

  return <Outlet />;
}
