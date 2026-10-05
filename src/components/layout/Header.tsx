import { Link } from 'react-router-dom';
import { siteConfig } from '@/config/site';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { MoreMenu } from './MoreMenu';

/**
 * The public header has no visible Admin button and no auth awareness
 * beyond the one hidden entry inside MoreMenu (master spec, section 4:
 * "must NOT appear as a normal public page... accessible from the existing
 * UI through the existing three-dots / more menu"). There was no such menu
 * before this - MoreMenu is the smallest one that fits the existing header
 * language, added for exactly this purpose and carrying nothing else.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-ink">
          <span aria-hidden="true">📦</span>
          <span>{siteConfig.name}</span>
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <MoreMenu />
        </div>
      </div>
    </header>
  );
}
