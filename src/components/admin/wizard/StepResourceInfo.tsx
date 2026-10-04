import { useTranslation } from '@/i18n';
import { categoryDefinitions } from '@/config/categories';
import { Input, TextArea } from '@/components/ui/Input';
import { FIELD_LIMITS } from '@/lib/validation';
import type { WizardDraft } from './types';

/**
 * Wizard Step 3 (master spec, "Admin wizard Step 3: resource info"). Plain
 * metadata fields only - no file upload control anywhere on this screen or
 * any other wizard step, since the platform never hosts the file itself.
 * Every text input is length-bounded via `maxLength` (src/lib/validation.ts
 * FIELD_LIMITS) in addition to the submit-time validation in the wizard.
 */
export function StepResourceInfo({
  draft,
  onChange,
  errors,
}: {
  draft: WizardDraft;
  onChange: (patch: Partial<WizardDraft>) => void;
  errors: { title?: string; description?: string };
}) {
  const { t, language } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="mb-1 text-base font-semibold text-ink">{t('wizard.step3.title')}</h3>
        <p className="mb-4 text-sm text-muted">{t('wizard.step3.description')}</p>
      </div>

      <Input
        label={t('wizard.field.title')}
        value={draft.title}
        onChange={(e) => onChange({ title: e.target.value })}
        maxLength={FIELD_LIMITS.title}
        error={errors.title}
      />

      <TextArea
        label={t('wizard.field.description')}
        value={draft.description}
        onChange={(e) => onChange({ description: e.target.value })}
        maxLength={FIELD_LIMITS.description}
        error={errors.description}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="wizard-category" className="text-sm font-medium text-ink">
            {t('wizard.field.category')}
          </label>
          <select
            id="wizard-category"
            value={draft.category}
            onChange={(e) => onChange({ category: e.target.value })}
            className="h-11 rounded-md border border-border bg-surface px-3.5 text-sm text-ink focus:border-accent"
          >
            {categoryDefinitions.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label[language]}
              </option>
            ))}
          </select>
        </div>
        <Input
          label={t('wizard.field.fileType')}
          value={draft.fileType}
          onChange={(e) => onChange({ fileType: e.target.value })}
          maxLength={FIELD_LIMITS.fileType}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('wizard.field.fileSize')}
          value={draft.fileSize}
          onChange={(e) => onChange({ fileSize: e.target.value })}
          maxLength={FIELD_LIMITS.fileSize}
        />
        <Input
          label={t('wizard.field.platform')}
          value={draft.platform}
          onChange={(e) => onChange({ platform: e.target.value })}
          maxLength={FIELD_LIMITS.platform}
        />
      </div>

      <Input
        label={t('wizard.field.tags')}
        value={draft.tagsInput}
        onChange={(e) => onChange({ tagsInput: e.target.value })}
      />

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={draft.featured}
          onChange={(e) => onChange({ featured: e.target.checked })}
          className="size-4 accent-accent"
        />
        {t('wizard.field.featured')}
      </label>
    </div>
  );
}
