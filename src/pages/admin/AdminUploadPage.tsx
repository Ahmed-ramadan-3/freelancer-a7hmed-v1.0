import { useState, type FormEvent } from 'react';
import { useTranslation } from '@/i18n';
import { useToast } from '@/context/ToastContext';
import { fileService } from '@/services';
import { categoryDefinitions } from '@/config/categories';
import type { UploadMetadataInput, UploadProgressEvent } from '@/types';
import { UploadDropzone } from '@/components/admin/UploadDropzone';
import { Input, TextArea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type Status = 'idle' | 'invalid' | 'ready' | 'uploading' | 'success' | 'error';

const emptyMetadata = {
  titleAr: '',
  titleEn: '',
  descriptionAr: '',
  descriptionEn: '',
  categorySlug: categoryDefinitions[0].slug,
  isPublic: true,
  isDownloadable: true,
  version: '',
};

export function AdminUploadPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState(emptyMetadata);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);

  function updateField<K extends keyof typeof emptyMetadata>(key: K, value: (typeof emptyMetadata)[K]) {
    setMetadata((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      showToast(t('upload.selectFileFirst'), 'error');
      return;
    }

    setStatus('uploading');
    setProgress(0);
    try {
      const payload: UploadMetadataInput = {
        ...metadata,
        version: metadata.version || undefined,
      };
      await fileService.uploadFile(file, payload, (event: UploadProgressEvent) =>
        setProgress(event.percent),
      );
      setStatus('success');
      showToast(t('upload.success'), 'success');
      setMetadata(emptyMetadata);
      setFile(null);
    } catch {
      setStatus('error');
      showToast(t('upload.failed'), 'error');
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink">{t('upload.title')}</h1>

      <Card className="flex flex-col gap-6 p-6">
        <UploadDropzone
          onFileSelected={setFile}
          onFileCleared={() => setFile(null)}
          status={status}
          progressPercent={progress}
        />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('upload.titleAr')}
              dir="rtl"
              value={metadata.titleAr}
              onChange={(e) => updateField('titleAr', e.target.value)}
              required
            />
            <Input
              label={t('upload.titleEn')}
              dir="ltr"
              value={metadata.titleEn}
              onChange={(e) => updateField('titleEn', e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextArea
              label={t('upload.descriptionAr')}
              dir="rtl"
              value={metadata.descriptionAr}
              onChange={(e) => updateField('descriptionAr', e.target.value)}
            />
            <TextArea
              label={t('upload.descriptionEn')}
              dir="ltr"
              value={metadata.descriptionEn}
              onChange={(e) => updateField('descriptionEn', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="category" className="text-sm font-medium text-ink">
              {t('upload.category')}
            </label>
            <select
              id="category"
              value={metadata.categorySlug}
              onChange={(e) => updateField('categorySlug', e.target.value)}
              className="h-11 rounded-md border border-border bg-surface px-3.5 text-sm text-ink focus:border-accent"
            >
              {categoryDefinitions.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.label.ar} / {category.label.en}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={metadata.isPublic}
                onChange={(e) => updateField('isPublic', e.target.checked)}
                className="size-4 rounded border-border accent-accent"
              />
              {t('upload.visibility')}
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={metadata.isDownloadable}
                onChange={(e) => updateField('isDownloadable', e.target.checked)}
                className="size-4 rounded border-border accent-accent"
              />
              {t('upload.downloadable')}
            </label>
          </div>

          <Button type="submit" isLoading={status === 'uploading'} size="lg">
            {status === 'uploading' ? t('upload.uploading') : t('upload.submit')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
