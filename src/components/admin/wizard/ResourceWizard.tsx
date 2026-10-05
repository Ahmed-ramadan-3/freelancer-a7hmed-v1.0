import { useEffect, useState } from 'react';
import type { Resource } from '@/types';
import { useTranslation } from '@/i18n';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { addResource, updateResource } from '@/data/resourceStore';
import { getResourceTypeDefinition } from '@/config/resourceTypes';
import { validateResourceUrl } from '@/lib/provider';
import {
  FIELD_LIMITS,
  parseTagsInput,
  validateOptionalText,
  validateRequiredText,
} from '@/lib/validation';
import { StepResourceType } from './StepResourceType';
import { StepProvider } from './StepProvider';
import { StepResourceInfo } from './StepResourceInfo';
import { StepBehavior } from './StepBehavior';
import type { WizardDraft } from './types';

const TOTAL_STEPS = 4;

function draftFromResource(resource?: Resource): WizardDraft {
  if (!resource) {
    return {
      resourceType: 'archive',
      externalUrl: '',
      title: '',
      description: '',
      category: 'other',
      fileType: '',
      fileSize: '',
      platform: '',
      tagsInput: '',
      featured: false,
      accessMode: 'download-only',
    };
  }
  return {
    resourceType: resource.resourceType,
    externalUrl: resource.externalUrl,
    title: resource.title,
    description: resource.description,
    category: resource.category,
    fileType: resource.fileType,
    fileSize: resource.fileSize,
    platform: resource.platform ?? '',
    tagsInput: (resource.tags ?? []).join(', '),
    featured: Boolean(resource.featured),
    accessMode: resource.accessMode,
  };
}

/**
 * The admin "إضافة الملفات" wizard (master spec, section 4: 4-step wizard
 * that adds METADATA only - the site never receives or stores the file's
 * bytes). This orchestrator owns the step index and the draft; each step
 * component is a dumb controlled form bound to a slice of it. On the last
 * step, the draft is handed to resourceStore.ts's addResource/updateResource
 * - the only place that writes to the catalog - exactly like any other
 * caller (ResourceWizard has no special/private write path).
 *
 * Reused for both "add" (no `initialResource`) and "edit" (an existing
 * `Resource` passed in) so the four steps and their validation are never
 * duplicated between the two flows.
 */
export function ResourceWizard({
  isOpen,
  onClose,
  initialResource,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialResource?: Resource;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<WizardDraft>(() => draftFromResource(initialResource));
  const [touchedUrl, setTouchedUrl] = useState(false);
  const [touchedInfo, setTouchedInfo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(draftFromResource(initialResource));
      setStep(1);
      setTouchedUrl(false);
      setTouchedInfo(false);
      setIsSaving(false);
      setSubmitError(null);
    }
    // Only resync when the modal transitions open - not on every
    // `initialResource` object identity change while it's already open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function patch(partial: Partial<WizardDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function handleResourceTypeChange(resourceType: WizardDraft['resourceType']) {
    const typeDef = getResourceTypeDefinition(resourceType);
    patch({
      resourceType,
      accessMode: typeDef.allowedAccessModes.includes(draft.accessMode)
        ? draft.accessMode
        : typeDef.defaultAccessMode,
    });
  }

  const urlResult = validateResourceUrl(draft.externalUrl);
  const titleResult = validateRequiredText(draft.title, FIELD_LIMITS.title, 'wizard.errors.titleRequired');
  const descriptionResult = validateRequiredText(
    draft.description,
    FIELD_LIMITS.description,
    'wizard.errors.descriptionRequired',
  );
  const fileTypeResult = validateOptionalText(draft.fileType, FIELD_LIMITS.fileType);
  const fileSizeResult = validateOptionalText(draft.fileSize, FIELD_LIMITS.fileSize);
  const platformResult = validateOptionalText(draft.platform, FIELD_LIMITS.platform);

  const stepIsValid =
    step === 1 ||
    step === 4 ||
    (step === 2 && urlResult.ok) ||
    (step === 3 &&
      titleResult.ok &&
      descriptionResult.ok &&
      fileTypeResult.ok &&
      fileSizeResult.ok &&
      platformResult.ok);

  function goBack() {
    if (step > 1) setStep(step - 1);
  }

  function goNext() {
    if (step === 2) setTouchedUrl(true);
    if (step === 3) setTouchedInfo(true);
    if (!stepIsValid) return;
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      void handleFinish();
    }
  }

  async function handleFinish() {
    if (!urlResult.ok || !titleResult.ok || !descriptionResult.ok) return;
    setIsSaving(true);
    setSubmitError(null);
    try {
      const typeDef = getResourceTypeDefinition(draft.resourceType);
      const input = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        category: draft.category,
        resourceType: draft.resourceType,
        fileType: draft.fileType.trim(),
        fileSize: draft.fileSize.trim(),
        platform: draft.platform.trim() || undefined,
        provider: urlResult.provider,
        externalUrl: draft.externalUrl.trim(),
        accessMode: draft.accessMode,
        previewMode: draft.accessMode === 'download-only' ? ('none' as const) : typeDef.defaultPreviewMode,
        tags: parseTagsInput(draft.tagsInput),
        featured: draft.featured,
      };

      // Async in both modes - a real network round trip when a metadata
      // backend is configured, a trivially-resolved Promise over
      // localStorage otherwise (see resourceStore.ts) - so this one code
      // path works unchanged either way.
      if (initialResource) {
        await updateResource(initialResource.id, input);
      } else {
        await addResource(input);
      }
      onSaved();
      onClose();
    } catch {
      // A failed backend write (network error, or the server rejecting the
      // URL/fields on its own validation - see api/_lib/resourcesRest.ts)
      // must never look like success. Stay open, on this step, and say so.
      setSubmitError(t('wizard.errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }

  const isLastStep = step === TOTAL_STEPS;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialResource ? t('wizard.titleEdit') : t('wizard.title')}
      size="lg"
    >
      <div className="flex flex-col gap-5">
        <p className="text-xs font-medium text-muted">
          {t('wizard.step', { current: step, total: TOTAL_STEPS })}
        </p>

        {step === 1 && (
          <StepResourceType value={draft.resourceType} onChange={handleResourceTypeChange} />
        )}
        {step === 2 && (
          <StepProvider
            url={draft.externalUrl}
            onChange={(externalUrl) => patch({ externalUrl })}
            showError={touchedUrl}
          />
        )}
        {step === 3 && (
          <StepResourceInfo
            draft={draft}
            onChange={patch}
            errors={{
              title: touchedInfo && !titleResult.ok && titleResult.errorKey
                ? t(titleResult.errorKey, titleResult.errorParams)
                : undefined,
              description: touchedInfo && !descriptionResult.ok && descriptionResult.errorKey
                ? t(descriptionResult.errorKey, descriptionResult.errorParams)
                : undefined,
            }}
          />
        )}
        {step === 4 && (
          <StepBehavior
            resourceType={draft.resourceType}
            value={draft.accessMode}
            onChange={(accessMode) => patch({ accessMode })}
          />
        )}

        {submitError && <p className="text-sm text-danger">{submitError}</p>}

        <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={goBack} disabled={step === 1 || isSaving}>
            {t('wizard.back')}
          </Button>
          <Button type="button" onClick={goNext} isLoading={isSaving}>
            {isLastStep ? (initialResource ? t('wizard.finishEdit') : t('wizard.finish')) : t('wizard.next')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
