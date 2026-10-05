import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * The smallest possible "more" menu (master spec, section 4/14): the ONLY
 * place the Admin console is linked from anywhere in the public UI - there
 * is no Admin button on the homepage. The project had no three-dot/more
 * menu before this; this is the minimal one the master spec says to add
 * when none exists, using the same bordered-icon-button language as
 * ThemeToggle/LanguageSwitcher right next to it in the header.
 */
export function MoreMenu() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t('nav.more')}
        className="flex size-9 items-center justify-center rounded-md border border-border text-muted transition-colors hover:text-ink"
      >
        <MoreVertical className="size-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className={cn(
            'absolute end-0 top-full z-50 mt-2 min-w-40 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-raised',
          )}
        >
          <Link
            role="menuitem"
            to="/admin"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-raised"
          >
            <ShieldCheck className="size-4 text-muted" />
            {t('nav.admin')}
          </Link>
        </div>
      )}
    </div>
  );
}
