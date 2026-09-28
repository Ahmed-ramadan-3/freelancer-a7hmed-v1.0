import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useToast } from '@/context/ToastContext';
import { useFiles } from '@/hooks/useFiles';
import { fileService, isBackendConfigured } from '@/services';
import { categoryDefinitions } from '@/config/categories';
import { formatBytes, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';

export function AdminFilesPage() {
  const { t, language } = useTranslation();
  const { showToast } = useToast();
  const { files, isLoading, refetch } = useFiles({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      await fileService.deleteFile(pendingDeleteId);
      showToast(t('common.delete'), 'success');
      refetch();
    } catch {
      showToast(t('errors.generic'), 'error');
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-ink">{t('admin.files')}</h1>

      {!isBackendConfigured && (
        <p className="rounded-md border border-accent/30 bg-accent/10 p-3 text-sm text-ink">
          {t('admin.demoModeBanner')}
        </p>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-start text-muted">
                <th className="py-2.5 pe-4 text-start font-medium">{t('upload.titleEn')}</th>
                <th className="py-2.5 pe-4 text-start font-medium">{t('file.category')}</th>
                <th className="py-2.5 pe-4 text-start font-medium">{t('file.size')}</th>
                <th className="py-2.5 pe-4 text-start font-medium">{t('file.uploadedOn')}</th>
                <th className="py-2.5 text-start font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const category = categoryDefinitions.find((c) => c.slug === file.categorySlug);
                return (
                  <tr key={file.id} className="border-b border-border/60">
                    {/* The active site has no public page for this preserved,
                        Supabase-backed FileResource model - see README.md
                        "Architecture" - so this is plain text, not a link. */}
                    <td className="max-w-[240px] truncate py-3 pe-4 font-medium text-ink">
                      {file.title[language]}
                    </td>
                    <td className="py-3 pe-4">
                      <Badge tone="accent">{category?.label[language]}</Badge>
                    </td>
                    <td className="py-3 pe-4 text-muted">{formatBytes(file.sizeBytes, language)}</td>
                    <td className="py-3 pe-4 text-muted">{formatDate(file.createdAt, language)}</td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDeleteId(file.id)}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        title={t('admin.confirmDelete')}
      >
        <p className="mb-5 text-sm text-muted">{t('admin.confirmDeleteHint')}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPendingDeleteId(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting}>
            {t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
