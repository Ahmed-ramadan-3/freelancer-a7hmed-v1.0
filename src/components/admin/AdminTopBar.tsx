import { LogOut } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

/**
 * Sign-out now lives here rather than in the shared public Header (which
 * deliberately has no auth awareness at all - see Header.tsx). This bar
 * only ever renders inside the lazy-loaded, flag-gated /admin subtree.
 */
export function AdminTopBar() {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();

  if (!session) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-2.5 text-sm">
      <span className="truncate text-muted">{session.email}</span>
      <Button variant="ghost" size="sm" onClick={signOut}>
        <LogOut className="size-4" />
        {t('nav.logout')}
      </Button>
    </div>
  );
}
