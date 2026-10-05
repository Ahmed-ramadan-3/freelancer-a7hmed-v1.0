import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useAdminSession } from '@/context/AdminSessionContext';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/Button';

/**
 * The new admin console's minimal shell - just a title bar + sign-out,
 * since the Catalog screen is currently the console's only page (no
 * sidebar needed for one item). Deliberately separate from
 * src/components/admin/AdminLayout.tsx (the legacy panel's shell, which
 * depends on AuthContext/AdminSidebar) so the two systems share nothing.
 */
export function AdminConsoleLayout() {
  const { t } = useTranslation();
  const { logout } = useAdminSession();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-2.5 text-sm">
        <span className="font-medium text-ink">
          {siteConfig.name} — {t('admin.catalog')}
        </span>
        <Button variant="ghost" size="sm" onClick={() => void logout()}>
          <LogOut className="size-4" />
          {t('nav.logout')}
        </Button>
      </div>
      <Outlet />
    </div>
  );
}
