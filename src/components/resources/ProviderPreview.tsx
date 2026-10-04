import { ExternalLink } from 'lucide-react';
import type { Resource } from '@/types';
import { getProviderLabel, getProviderPreviewUrl } from '@/lib/provider';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * Embeds the PROVIDER's own preview page - never our own reconstruction of
 * one. For Google Drive this is the documented `/file/d/<id>/preview`
 * endpoint, which already renders images, PDFs, video, and several other
 * formats with Drive's own viewer and playback controls; we cannot and do
 * not attach our own controls to it, because it's a cross-origin iframe
 * (master spec: "use provider-native/embed viewing where supported").
 *
 * For OneDrive, or any URL this app can't safely derive a preview for, this
 * shows a clear "open on <Provider>" link instead of guessing at an embed
 * URL that might not work (master spec: "do not invent unsupported
 * capabilities").
 */
export function ProviderPreview({ resource }: { resource: Resource }) {
  const { t } = useTranslation();
  const previewUrl = getProviderPreviewUrl(resource.provider, resource.externalUrl);
  const providerLabel = getProviderLabel(resource.provider);

  if (!previewUrl) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface p-10 text-center">
        <p className="text-sm text-muted">{t('preview.unavailable')}</p>
        <a
          href={resource.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent underline underline-offset-2"
        >
          <ExternalLink className="size-4" />
          {t('preview.openOnProvider', { provider: providerLabel })}
        </a>
      </div>
    );
  }

  const aspectClass =
    resource.previewMode === 'image'
      ? 'aspect-[4/3]'
      : resource.previewMode === 'pdf'
        ? 'aspect-[3/4] sm:aspect-[16/10]'
        : 'aspect-video';

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-black', aspectClass)}>
      <iframe
        src={previewUrl}
        title={resource.title}
        className="size-full"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        loading="lazy"
        allow="autoplay"
      />
    </div>
  );
}
