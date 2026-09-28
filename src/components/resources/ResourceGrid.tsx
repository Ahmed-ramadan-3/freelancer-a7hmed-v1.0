import { FolderSearch } from 'lucide-react';
import type { Resource } from '@/types';
import { useTranslation } from '@/i18n';
import { ResourceCard } from './ResourceCard';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * The catalog is a static in-memory array (src/data/resources.ts), so there
 * is no async loading state to manage here - unlike the preserved Admin
 * file table, which does fetch from a service.
 */
export function ResourceGrid({ resources }: { resources: Resource[] }) {
  const { t } = useTranslation();

  if (resources.length === 0) {
    return (
      <EmptyState
        icon={<FolderSearch className="size-10" />}
        title={t('home.noResults')}
        hint={t('home.noResultsHint')}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} />
      ))}
    </div>
  );
}
