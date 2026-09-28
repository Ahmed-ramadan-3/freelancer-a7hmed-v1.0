import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/context/AuthContext';
import { isBackendConfigured } from '@/services';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function LoginPage() {
  const { t } = useTranslation();
  const { session, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session) {
    const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/admin';
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError(t('auth.requiredField'));
      return;
    }
    setIsSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      setError(t('auth.invalidCredentials'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-ink">{t('nav.login')}</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label={t('auth.email')}
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

      {!isBackendConfigured && (
        <p className="rounded-md border border-border bg-surface p-3 text-center text-xs text-muted">
          {t('auth.demoHint')}
        </p>
      )}
    </div>
  );
}
