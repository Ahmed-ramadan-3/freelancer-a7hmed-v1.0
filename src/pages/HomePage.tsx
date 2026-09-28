import { useMemo, useState } from 'react';
import { useTranslation } from '@/i18n';
import { resources, getFeaturedResources } from '@/data/resources';
import { ResourceFilters } from '@/components/resources/ResourceFilters';
import { ResourceGrid } from '@/components/resources/ResourceGrid';
import { FeaturedResource } from '@/components/resources/FeaturedResource';

/**
 * The whole active product (master spec, "Homepage"): a hero line, search,
 * categories, a featured pick, then the full catalog. Everything reads from
 * the static src/data/resources.ts array - no network request, no loading
 * state, because there is nothing to fetch.
 */
export function HomePage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const featured = useMemo(() => getFeaturedResources(), []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return resources.filter((resource) => {
      const matchesCategory = category ? resource.category === category : true;
      if (!matchesCategory) return false;
      if (!query) return true;
      const haystack = [
        resource.title,
        resource.description,
        resource.category,
        resource.fileType,
        resource.platform ?? '',
        ...(resource.tags ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [search, category]);

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center sm:text-start">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{t('home.title')}</h1>
        <p className="mt-1 text-muted">{t('home.subtitle')}</p>
      </div>

      {!search && !category && featured.length > 0 && (
        <div className="flex flex-col gap-3">
          {featured.map((resource) => (
            <FeaturedResource key={resource.id} resource={resource} />
          ))}
        </div>
      )}

      <ResourceFilters
        search={search}
        onSearchChange={setSearch}
        activeCategory={category}
        onCategoryChange={setCategory}
      />

      <ResourceGrid resources={filtered} />
    </div>
  );
}
