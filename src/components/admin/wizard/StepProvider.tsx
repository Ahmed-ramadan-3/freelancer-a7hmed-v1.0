import { useMemo } from 'react';
import { useTranslation } from '@/i18n';
import { validateResourceUrl, getProviderLabel } from '@/lib/provider';
import { Input } from '@/components/ui/Input';

/**
 * Wizard Step 2 (master spec, "Admin wizard Step 2: provider"). The admin
 * pastes the exact share-page URL; this step never tries to fetch it, only
 * validates it client-side via validateResourceUrl() (src/lib/provider.ts) -
 * HTTPS, a safe scheme, and a recognized Google Drive/OneDrive host.
 */
export function StepProvider({
  url,
  onChange,
  showError,
}: {
  url: string;
  onChange: (next: string) => void;
  showError: boolean;
}) {
  const { t } = useTranslation();
  const result = useMemo(() => validateResourceUrl(url), [url]);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="mb-1 text-base font-semibold text-ink">{t('wizard.step2.title')}</h3>
        <p className="mb-4 text-sm text-muted">{t('wizard.step2.description')}</p>
      </div>
      <Input
        label={t('wizard.step2.urlLabel')}
        placeholder={t('wizard.step2.urlPlaceholder')}
        value={url}
        onChange={(e) => onChange(e.target.value)}
        error={showError && !result.ok ? t(result.errorKey) : undefined}
        dir="ltr"
        autoComplete="off"
      />
      {result.ok && (
        <p className="text-sm text-success">
          {t('wizard.step2.detectedProvider', { provider: getProviderLabel(result.provider) })}
        </p>
      )}
    </div>
  );
}
