import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, FileWarning } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { getResourceById, getRelatedResources } from '@/data/resourceStore';
import { categoryDefinitions } from '@/config/categories';
import { getActionLabelKey } from '@/lib/resourceModel';
import { getProviderLabel } from '@/lib/provider';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CategoryIcon } from '@/components/resources/CategoryPill';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { ResourcePreview } from '@/components/resources/ResourcePreview';
import { DownloadPreparationModal } from '@/components/download/DownloadPreparationModal';

/**
 * The single resource page (master spec, "Resource Details / Preview"):
 * - `download-only` -> details + a Download button only, no in-site preview.
 * - `preview-download` -> an in-site preview (ResourcePreview) AND a
 *   Download button, both shown.
 * - `view-only` (courses) -> an in-site preview only. No Download button is
 *   rendered anywhere on this page, and the raw `externalUrl` is never
 *   printed as visible text - only the provider's display name is (e.g.
 *   "Google Drive"), via getProviderLabel().
 */
export function ResourceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useTranslation();
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  const resource = id ? getResourceById(id) : undefined;

  if (!resource) {
    return (
      <EmptyState
        icon={<FileWarning className="size-10" />}
        title={t('resource.notFound')}
        hint={t('resource.notFoundHint')}
        action={
          <Link to="/" className="text-sm font-medium text-accent underline">
            {t('errors.goHome')}
          </Link>
        }
      />
    );
  }

  const category = categoryDefinitions.find((c) => c.slug === resource.category);
  const related = getRelatedResources(resource);
  const providerLabel = getProviderLabel(resource.provider);
  const hasPreview = resource.accessMode !== 'download-only' && resource.previewMode !== 'none';
  const hasDownload = resource.accessMode !== 'view-only';
  const actionLabel = t(getActionLabelKey(resource));

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col gap-5 p-6 lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent/12 text-accent">
              {resource.icon ? (
                <img src={resource.icon} alt="" className="size-full" />
              ) : (
                <CategoryIcon icon={category?.icon ?? 'shapes'} className="size-7" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink sm:text-2xl">{resource.title}</h1>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {category && <Badge tone="accent">{category.label[language]}</Badge>}
                {resource.platform && <Badge tone="neutral">{resource.platform}</Badge>}
                <Badge tone="neutral">{providerLabel}</Badge>
              </div>
            </div>
          </div>

          {hasPreview && <ResourcePreview resource={resource} />}

          <p className="text-sm leading-relaxed text-muted">{resource.description}</p>

          <dl className="grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">{t('file.size')}</dt>
              <dd className="font-medium text-ink">{resource.fileSize}</dd>
            </div>
            <div>
              <dt className="text-muted">{t('file.type')}</dt>
              <dd className="font-medium text-ink">{resource.fileType}</dd>
            </div>
            {resource.platform && (
              <div>
                <dt className="text-muted">{t('resource.platform')}</dt>
                <dd className="font-medium text-ink">{resource.platform}</dd>
              </div>
            )}
          </dl>

          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {resource.tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-3 p-6">
          {hasDownload ? (
            <>
              <Button onClick={() => setIsDownloadOpen(true)} size="lg">
                <Download className="size-4" />
                {actionLabel}
              </Button>
              <p className="text-center text-xs text-muted">
                {t('download.disclaimer', { provider: providerLabel })}
              </p>
            </>
          ) : (
            <p className="text-center text-sm text-muted">{t('resource.viewOnly')}</p>
          )}
        </Card>
      </div>

      {related.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-ink">{t('resource.related')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {related.map((item) => (
              <ResourceCard key={item.id} resource={item} />
            ))}
          </div>
        </div>
      )}

      {hasDownload && (
        <DownloadPreparationModal
          resource={resource}
          isOpen={isDownloadOpen}
          onClose={() => setIsDownloadOpen(false)}
        />
      )}
    </div>
  );
}
