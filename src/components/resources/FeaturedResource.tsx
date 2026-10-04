import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, Sparkles } from 'lucide-react';
import type { Resource } from '@/types';
import { useTranslation } from '@/i18n';
import { categoryDefinitions } from '@/config/categories';
import { getResourceTypeDefinition } from '@/config/resourceTypes';
import { getActionLabelKey } from '@/lib/resourceModel';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button, getButtonClassName } from '@/components/ui/Button';
import { CategoryIcon } from './CategoryPill';
import { DownloadPreparationModal } from '@/components/download/DownloadPreparationModal';

export function FeaturedResource({ resource }: { resource: Resource }) {
  const { t, language } = useTranslation();
  const category = categoryDefinitions.find((c) => c.slug === resource.category);
  const typeDef = getResourceTypeDefinition(resource.resourceType);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const actionLabel = t(getActionLabelKey(resource));
  const opensDownloadModal = resource.accessMode === 'download-only';

  return (
    <>
      <Card className="flex flex-col gap-5 overflow-hidden p-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent/12 text-accent">
          {resource.icon ? (
            <img src={resource.icon} alt="" className="size-full" />
          ) : (
            <CategoryIcon icon={typeDef.icon} className="size-9" />
          )}
        </div>

        <div className="flex-1">
          <span className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
            <Sparkles className="size-3.5" />
            {t('home.featuredLabel')}
          </span>
          <h2 className="text-xl font-semibold text-ink sm:text-2xl">{resource.title}</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">{resource.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {category && <Badge tone="accent">{category.label[language]}</Badge>}
            {resource.platform && <Badge tone="neutral">{resource.platform}</Badge>}
            <Badge tone="neutral">{resource.fileType}</Badge>
            <Badge tone="neutral">{resource.fileSize}</Badge>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:w-44">
          {opensDownloadModal ? (
            <Button onClick={() => setIsDownloadOpen(true)}>
              <Download className="size-4" />
              {actionLabel}
            </Button>
          ) : (
            <Link to={`/resources/${resource.id}`} className={getButtonClassName()}>
              <Eye className="size-4" />
              {actionLabel}
            </Link>
          )}
          <Link
            to={`/resources/${resource.id}`}
            className="text-center text-sm font-medium text-accent underline underline-offset-2"
          >
            {t('home.viewDetails')}
          </Link>
        </div>
      </Card>

      {opensDownloadModal && (
        <DownloadPreparationModal
          resource={resource}
          isOpen={isDownloadOpen}
          onClose={() => setIsDownloadOpen(false)}
        />
      )}
    </>
  );
}
