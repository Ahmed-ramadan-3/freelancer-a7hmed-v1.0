import type { CategoryDefinition } from '@/types';

/**
 * Configurable category list (master spec, "Search and Categories"). Adding
 * a category means adding one entry here - not touching every screen that
 * renders a category filter. Icon keys are looked up in
 * src/components/resources/CategoryIcon.tsx.
 */
export const categoryDefinitions: CategoryDefinition[] = [
  { slug: 'programs', icon: 'app-window', label: { ar: 'برامج', en: 'Programs' } },
  { slug: 'windows-tools', icon: 'wrench', label: { ar: 'أدوات ويندوز', en: 'Windows Tools' } },
  { slug: 'programming', icon: 'code', label: { ar: 'برمجة', en: 'Programming' } },
  { slug: 'books', icon: 'book-open', label: { ar: 'كتب', en: 'Books' } },
  { slug: 'pdfs', icon: 'file-text', label: { ar: 'ملفات PDF', en: 'PDFs' } },
  { slug: 'videos', icon: 'video', label: { ar: 'فيديوهات', en: 'Videos' } },
  { slug: 'courses', icon: 'graduation-cap', label: { ar: 'دورات', en: 'Courses' } },
  { slug: 'utilities', icon: 'wrench', label: { ar: 'أدوات مساعدة', en: 'Utilities' } },
  { slug: 'other', icon: 'shapes', label: { ar: 'أخرى', en: 'Other' } },
];
