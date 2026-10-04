import type { CatalogResourceType } from '@/types';
import { useTranslation } from '@/i18n';
import { resourceTypeDefinitions } from '@/config/resourceTypes';
import { CategoryIcon } from '@/components/resources/CategoryPill';
import { cn } from '@/lib/utils';

/**
 * Wizard Step 1 (master spec, "Admin wizard Step 1: resource type"). Reads
 * its options entirely from src/config/resourceTypes.ts - adding a resource
 * type there is the only change needed for it to show up here.
 */
export function StepResourceType({
  value,
  onChange,
}: {
  value: CatalogResourceType;
  onChange: (next: CatalogResourceType) => void;
}) {
  const { t, language } = useTranslation();

  return (
    <div>
      <h3 className="mb-1 text-base font-semibold text-ink">{t('wizard.step1.title')}</h3>
      <p className="mb-4 text-sm text-muted">{t('wizard.step1.description')}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {resourceTypeDefinitions.map((def) => (
          <button
            key={def.value}
            type="button"
            onClick={() => onChange(def.value)}
            aria-pressed={value === def.value}
            className={cn(
              'flex flex-col items-center gap-2 rounded-md border p-3 text-sm font-medium transition-colors',
              value === def.value
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-muted hover:bg-surface-raised hover:text-ink',
            )}
          >
            <CategoryIcon icon={def.icon} className="size-5" />
            {def.label[language]}
          </button>
        ))}
      </div>
    </div>
  );
}
