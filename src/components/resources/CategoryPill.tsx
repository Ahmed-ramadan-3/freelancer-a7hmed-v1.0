import {
  AppWindow,
  Archive,
  BookOpen,
  Code,
  File,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Shapes,
  Video,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared icon lookup used both for category pills (src/config/categories.ts)
 * and resource-type definitions (src/config/resourceTypes.ts) - the two
 * configs intentionally share this one icon-key vocabulary so adding an
 * entry to either config never requires touching this file, as long as it
 * reuses an existing key. `image` was added for the `image` CatalogResourceType.
 */
const iconMap: Record<string, LucideIcon> = {
  'app-window': AppWindow,
  wrench: Wrench,
  code: Code,
  'book-open': BookOpen,
  'file-text': FileText,
  video: Video,
  'graduation-cap': GraduationCap,
  archive: Archive,
  file: File,
  image: ImageIcon,
  shapes: Shapes,
};

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = iconMap[icon] ?? Shapes;
  return <Icon className={className} aria-hidden="true" />;
}

export function CategoryPill({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-150 ease-standard',
        isActive
          ? 'border-accent bg-accent text-accent-ink'
          : 'border-border bg-surface text-muted hover:text-ink',
      )}
    >
      <CategoryIcon icon={icon} className="size-4" />
      {label}
    </button>
  );
}
