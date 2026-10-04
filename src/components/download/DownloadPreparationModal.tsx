import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import type { Resource } from '@/types';
import { useTranslation } from '@/i18n';
import { DOWNLOAD_PREPARATION_SECONDS } from '@/config/download';
import { getProviderLabel } from '@/lib/provider';
import { Modal } from '@/components/ui/Modal';

/**
 * The reusable "preparing your download" experience (master spec, "Download
 * UX"). It never performs the actual download itself - the provider
 * (Google Drive or OneDrive) does, once the visitor presses its own
 * Download button on the exact file page this component links to. This
 * component's only job is a short, honest countdown; it never claims a file
 * is downloading, and the total wait is capped by
 * DOWNLOAD_PREPARATION_SECONDS (config, max 10s). It is provider-generic -
 * the label and link always come from `resource.provider`/`externalUrl`,
 * never a hardcoded "Google Drive" string (see src/lib/provider.ts).
 */
export function DownloadPreparationModal({
  resource,
  isOpen,
  onClose,
}: {
  resource: Resource;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [secondsLeft, setSecondsLeft] = useState(DOWNLOAD_PREPARATION_SECONDS);

  useEffect(() => {
    if (!isOpen) return;
    setSecondsLeft(DOWNLOAD_PREPARATION_SECONDS);
    const interval = setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const isReady = secondsLeft === 0;
  const providerLabel = getProviderLabel(resource.provider);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('download.title')}>
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <p className="line-clamp-1 text-sm font-medium text-ink">{resource.title}</p>

        <div
          className="flex size-16 items-center justify-center rounded-full bg-accent/12 text-accent"
          aria-live="polite"
        >
          {isReady ? (
            <CheckCircle2 className="size-8" />
          ) : (
            <Loader2 className="size-8 animate-spin" />
          )}
        </div>

        <div aria-live="polite">
          {isReady ? (
            <p className="text-base font-semibold text-ink">{t('download.ready')}</p>
          ) : (
            <>
              <p className="text-base font-medium text-ink">{t('download.preparing')}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-accent">{secondsLeft}</p>
            </>
          )}
        </div>

        {isReady ? (
          <a
            href={resource.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-accent px-6 text-sm font-semibold text-accent-ink transition-colors hover:brightness-95"
          >
            <ExternalLink className="size-4" />
            {t('download.openProvider', { provider: providerLabel })}
          </a>
        ) : (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear"
              style={{
                width: `${((DOWNLOAD_PREPARATION_SECONDS - secondsLeft) / DOWNLOAD_PREPARATION_SECONDS) * 100}%`,
              }}
            />
          </div>
        )}

        <p className="text-xs text-muted">
          {t('download.disclaimer', { provider: providerLabel })}
        </p>
      </div>
    </Modal>
  );
}
