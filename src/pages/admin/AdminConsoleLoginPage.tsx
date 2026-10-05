import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { useAdminSession } from '@/context/AdminSessionContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/**
 * The new admin console's login screen (master spec, section 5: "Admin
 * access must require Username + Password... the owner will define the
 * credentials"). Reached only via the Header's three-dot menu, never a
 * visible homepage button (section 4). On success, api/admin/login.ts sets
 * an HttpOnly cookie - this page never sees or stores the password beyond
 * the single POST it sends.
 */
export function AdminConsoleLoginPage() {
  const { t } = useTranslation();
  const { isAuthenticated, isConfigured, login } = useAdminSession();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/admin';
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username || !password) {
      setError(t('auth.requiredField'));
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await login(username, password);
      if (!result.ok) setError(t('auth.invalidUsernameOrPassword'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-ink">{t('nav.admin')}</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label={t('auth.username')}
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            label={t('auth.password')}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>
      </Card>

      {!isConfigured && (
        <p className="rounded-md border border-danger/30 bg-danger/10 p-3 text-center text-xs text-danger">
          {t('auth.consoleNotConfigured')}
        </p>
      )}
    </div>
  );
}
