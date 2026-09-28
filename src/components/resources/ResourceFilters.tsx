import { Search } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { categoryDefinitions } from '@/config/categories';
import { CategoryPill } from './CategoryPill';

interface ResourceFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeCategory: string | null;
  onCategoryChange: (slug: string | null) => void;
}

export function ResourceFilters({
  search,
  onSearchChange,
  activeCategory,
  onCategoryChange,
}: ResourceFiltersProps) {
  const { t, language } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute inset-y-0 start-3.5 my-auto size-4 text-muted" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('common.search')}
          className="h-12 w-full rounded-md border border-border bg-surface ps-10 pe-4 text-sm text-ink placeholder:text-muted focus:border-accent"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <CategoryPill
          label={t('home.allCategories')}
          icon="shapes"
          isActive={activeCategory === null}
          onClick={() => onCategoryChange(null)}
        />
        {categoryDefinitions.map((category) => (
          <CategoryPill
            key={category.slug}
            label={category.label[language]}
            icon={category.icon}
            isActive={activeCategory === category.slug}
            onClick={() => onCategoryChange(category.slug)}
          />
        ))}
      </div>
    </div>
  );
}
