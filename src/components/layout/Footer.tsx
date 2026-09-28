import { useTranslation } from '@/i18n';
import { siteConfig } from '@/config/site';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border">
      <div className="container flex flex-col items-center justify-between gap-2 py-6 text-sm text-muted sm:flex-row">
        <span>
          © {new Date().getFullYear()} {siteConfig.name}
        </span>
        <span>{t('footer.rights')}</span>
      </div>
    </footer>
  );
}
