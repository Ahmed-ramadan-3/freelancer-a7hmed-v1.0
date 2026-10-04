import type { AccessMode, CatalogResourceType } from '@/types';
import { useTranslation } from '@/i18n';
import { getResourceTypeDefinition } from '@/config/resourceTypes';
import { cn } from '@/lib/utils';

const LABEL_KEYS: Record<AccessMode, { title: string; hint: string }> = {
  'download-only': {
    title: 'wizard.accessMode.downloadOnly',
    hint: 'wizard.accessMode.downloadOnlyHint',
  },
  'preview-download': {
    title: 'wizard.accessMode.previewDownload',
    hint: 'wizard.accessMode.previewDownloadHint',
  },
  'view-only': {
    title: 'wizard.accessMode.viewOnly',
    hint: 'wizard.accessMode.viewOnlyHint',
  },
};

/**
 * Wizard Step 4 (master spec, "Admin wizard Step 4: behavior/access mode").
 * Only offers the access modes src/config/resourceTypes.ts allows for the
 * type chosen in Step 1 - e.g. a course can only ever be `view-only`, so an
 * admin cannot accidentally expose a Download button for one.
 */
export function StepBehavior({
  resourceType,
  value,
  onChange,
}: {
  resourceType: CatalogResourceType;
  value: AccessMode;
  onChange: (next: AccessMode) => void;
}) {
  const { t } = useTranslation();
  const typeDef = getResourceTypeDefinition(resourceType);

  return (
    <div>
      <h3 className="mb-1 text-base font-semibold text-ink">{t('wizard.step4.title')}</h3>
      <p className="mb-4 text-sm text-muted">{t('wizard.step4.description')}</p>
      <div className="flex flex-col gap-2">
        {typeDef.allowedAccessModes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            aria-pressed={value === mode}
            className={cn(
              'flex flex-col items-start gap-1 rounded-md border p-3 text-start transition-colors',
              value === mode ? 'border-accent bg-accent/10' : 'border-border hover:bg-surface-raised',
            )}
          >
            <span className="text-sm font-medium text-ink">{t(LABEL_KEYS[mode].title)}</span>
            <span className="text-xs text-muted">{t(LABEL_KEYS[mode].hint)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
