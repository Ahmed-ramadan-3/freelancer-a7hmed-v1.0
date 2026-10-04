import { useState } from 'react';
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useToast } from '@/context/ToastContext';
import type { Resource } from '@/types';
import {
  deleteResource,
  getAllResources,
  isSeedResource,
  resetLocalCatalogOverrides,
} from '@/data/resourceStore';
import { categoryDefinitions } from '@/config/categories';
import { getProviderLabel } from '@/lib/provider';
import { getActionLabelKey } from '@/lib/resourceModel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ResourceWizard } from '@/components/admin/wizard/ResourceWizard';

/**
 * Admin "الموارد" screen (master spec, section 4): lists the active public
 * catalog (seed + local overrides, via resourceStore.ts) and launches the
 * "إضافة الملفات" wizard to add/edit entries. Separate from the preserved
 * AdminFilesPage, which manages the older Supabase-backed FileResource model
 * (see README.md "Architecture") - the two never share a table or a route.
 *
 * The banner below is not boilerplate caution - it's the master spec's
 * explicit requirement not to imply this is a real multi-visitor backend
 * (see src/data/resourceStore.ts's own comment for the same point).
 */
export function AdminCatalogPage() {
  const { t, language } = useTranslation();
  const { showToast } = useToast();
  const [resources, setResources] = useState<Resource[]>(() => getAllResources());
  const [wizardState, setWizardState] = useState<{ open: boolean; resource?: Resource }>({
    open: false,
  });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);

  function refresh() {
    setResources(getAllResources());
  }

  function confirmDelete() {
    if (!pendingDeleteId) return;
    deleteResource(pendingDeleteId);
    setPendingDeleteId(null);
    refresh();
    showToast(t('common.delete'), 'success');
  }

  function confirmReset() {
    resetLocalCatalogOverrides();
    setIsResetOpen(false);
    refresh();
    showToast(t('wizard.success'), 'success');
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">{t('admin.catalogTitle')}</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setIsResetOpen(true)}>
            <RotateCcw className="size-4" />
            {t('admin.resetOverrides')}
          </Button>
          <Button size="sm" onClick={() => setWizardState({ open: true, resource: undefined })}>
            <Plus className="size-4" />
            {t('admin.addFiles')}
          </Button>
        </div>
      </div>

      <p className="rounded-md border border-accent/30 bg-accent/10 p-3 text-sm text-ink">
        {t('admin.catalogLocalBanner')}
      </p>

      {resources.length === 0 ? (
        <EmptyState
          icon={<Plus className="size-10" />}
          title={t('admin.catalogEmpty')}
          hint={t('admin.catalogEmptyHint')}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-start text-muted">
                <th className="py-2.5 pe-4 text-start font-medium">{t('wizard.field.title')}</th>
                <th className="py-2.5 pe-4 text-start font-medium">{t('file.category')}</th>
                <th className="py-2.5 pe-4 text-start font-medium">{t('admin.columnProvider')}</th>
                <th className="py-2.5 pe-4 text-start font-medium">{t('admin.columnAccessMode')}</th>
                <th className="py-2.5 pe-4 text-start font-medium">{t('admin.columnSeedOrLocal')}</th>
                <th className="py-2.5 text-start font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => {
                const category = categoryDefinitions.find((c) => c.slug === resource.category);
                const fromSeed = isSeedResource(resource.id);
                return (
                  <tr key={resource.id} className="border-b border-border/60">
                    <td className="max-w-[220px] truncate py-3 pe-4 font-medium text-ink">
                      {resource.title}
                    </td>
                    <td className="py-3 pe-4">
                      {category && <Badge tone="accent">{category.label[language]}</Badge>}
                    </td>
                    <td className="py-3 pe-4 text-muted">{getProviderLabel(resource.provider)}</td>
                    <td className="py-3 pe-4 text-muted">{t(getActionLabelKey(resource))}</td>
                    <td className="py-3 pe-4">
                      <Badge tone={fromSeed ? 'neutral' : 'teal'}>
                        {fromSeed ? t('admin.seedBadge') : t('admin.localBadge')}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setWizardState({ open: true, resource })}
                          aria-label={t('common.edit')}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDeleteId(resource.id)}
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="size-4 text-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ResourceWizard
        isOpen={wizardState.open}
        onClose={() => setWizardState({ open: false, resource: undefined })}
        initialResource={wizardState.resource}
        onSaved={() => {
          refresh();
          showToast(wizardState.resource ? t('wizard.successEdit') : t('wizard.success'), 'success');
        }}
      />

      <Modal
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        title={t('admin.confirmDeleteResource')}
      >
        <p className="mb-5 text-sm text-muted">{t('admin.confirmDeleteResourceHint')}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPendingDeleteId(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            {t('common.delete')}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        title={t('admin.confirmResetOverrides')}
      >
        <p className="mb-5 text-sm text-muted">{t('admin.confirmResetOverridesHint')}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setIsResetOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirmReset}>
            {t('admin.resetOverrides')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
