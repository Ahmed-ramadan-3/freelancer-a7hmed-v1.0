import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="flex items-center rounded-md border border-border p-0.5 text-sm">
      <button
        onClick={() => setLanguage('ar')}
        className={cn(
          'rounded px-2.5 py-1 transition-colors',
          language === 'ar' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink',
        )}
        aria-pressed={language === 'ar'}
      >
        عربي
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={cn(
          'rounded px-2.5 py-1 transition-colors',
          language === 'en' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink',
        )}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
    </div>
  );
}
