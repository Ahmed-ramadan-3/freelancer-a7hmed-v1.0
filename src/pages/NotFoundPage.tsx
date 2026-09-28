import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { EmptyState } from '@/components/ui/EmptyState';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="py-10">
      <EmptyState
        icon={<Compass className="size-10" />}
        title={t('errors.notFoundPage')}
        hint={t('errors.notFoundPageHint')}
        action={
          <Link to="/" className="text-sm font-medium text-accent underline">
            {t('errors.goHome')}
          </Link>
        }
      />
    </div>
  );
}
