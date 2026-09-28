import { Link } from 'react-router-dom';
import { siteConfig } from '@/config/site';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';

/**
 * The public header intentionally knows nothing about authentication or
 * Admin (master spec, "Admin panel - CRITICAL": hidden from public
 * navigation entirely, not just visually collapsed). The Admin area is
 * reached directly at /admin/login when VITE_ENABLE_ADMIN=true - there is
 * no link to it anywhere in the active product's UI.
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
        </div>
      </div>
    </header>
  );
}
