import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import type { Resource } from '@/types';
import { useTranslation } from '@/i18n';
import { categoryDefinitions } from '@/config/categories';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CategoryIcon } from './CategoryPill';
import { DownloadPreparationModal } from '@/components/download/DownloadPreparationModal';

/**
 * Left/right accent bar encodes category at a glance without every card
 * looking like an identical rounded tile. It sits on the reading-start edge
 * via a logical CSS property so it's correct in both RTL and LTR.
 */
export function ResourceCard({ resource }: { resource: Resource }) {
  const { t, language } = useTranslation();
  const category = categoryDefinitions.find((c) => c.slug === resource.category);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  return (
    <>
      <Card
        className="flex h-full flex-col gap-4 p-5 hover:shadow-raised"
        style={{ borderInlineStart: '3px solid rgb(var(--color-accent))' }}
      >
        <Link to={`/resources/${resource.id}`} className="flex flex-1 flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-accent/12 text-accent">
              {resource.icon ? (
                <img src={resource.icon} alt="" className="size-full" />
              ) : (
                <CategoryIcon icon={category?.icon ?? 'shapes'} className="size-5" />
              )}
            </div>
            {resource.platform && <Badge tone="neutral">{resource.platform}</Badge>}
          </div>

          <div className="flex-1">
            <h3 className="line-clamp-2 text-base font-semibold text-ink">{resource.title}</h3>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted">{resource.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted">
            {category && <Badge tone="accent">{category.label[language]}</Badge>}
            <span>{resource.fileType}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{resource.fileSize}</span>
          </div>
        </Link>

        <Button size="sm" onClick={() => setIsDownloadOpen(true)}>
          <Download className="size-4" />
          {t('resource.download')}
        </Button>
      </Card>

      <DownloadPreparationModal
        resource={resource}
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
      />
    </>
  );
}
