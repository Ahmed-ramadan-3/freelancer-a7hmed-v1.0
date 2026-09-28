import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from '@/i18n';
import { useToast } from '@/context/ToastContext';
import { authService, isBackendConfigured } from '@/services';
import type { AdminInvitation, UserRole } from '@/types';
import { formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

/**
 * Owner-only screen (enforced by <ProtectedRoute requireOwner /> in
 * routes/router.tsx, and ultimately by RLS on admin_invitations - see
 * supabase/schema.sql). Sending the actual invitation email is future work:
 * see README.md "Next Recommended Development" for the Edge Function this
 * table is designed to feed.
 */
export function AdminUsersPage() {
  const { t, language } = useTranslation();
  const { showToast } = useToast();
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    authService.listInvitations().then(setInvitations);
  }, []);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
      const invite = await authService.inviteAdmin(email, role);
      setInvitations((current) => [invite, ...current]);
      setEmail('');
      showToast(t('admin.sendInvite'), 'success');
    } catch {
      showToast(t('errors.generic'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink">{t('admin.users')}</h1>

      {!isBackendConfigured && (
        <p className="rounded-md border border-accent/30 bg-accent/10 p-3 text-sm text-ink">
          {t('admin.demoModeBanner')}
        </p>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold text-ink">{t('admin.inviteAdmin')}</h2>
        <form onSubmit={handleInvite} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label={t('admin.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="role" className="text-sm font-medium text-ink">
              {t('admin.role')}
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="h-11 rounded-md border border-border bg-surface px-3.5 text-sm text-ink focus:border-accent"
            >
              <option value="admin">{t('admin.roleAdmin')}</option>
              <option value="viewer">{t('admin.roleViewer')}</option>
            </select>
          </div>
          <Button type="submit" isLoading={isSubmitting}>
            {t('admin.sendInvite')}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <ul className="flex flex-col divide-y divide-border">
          {invitations.map((invite) => (
            <li key={invite.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="font-medium text-ink">{invite.email}</span>
              <div className="flex items-center gap-2">
                <Badge tone="teal">{invite.role}</Badge>
                <span className="text-xs text-muted">{formatDate(invite.createdAt, language)}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
