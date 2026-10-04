import type { Resource } from '@/types';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { ProviderPreview } from './ProviderPreview';

const DIRECT_VIDEO_FILE_PATTERN = /\.(mp4|webm|ogg)(\?.*)?$/i;

/**
 * The single entry point ResourceDetailsPage uses to render a preview,
 * regardless of resource type or provider. It picks between:
 *  - a real custom player (VideoPlayer), when `externalUrl` happens to be a
 *    directly playable video file - not true for Drive/OneDrive share
 *    links today, but live code, not a stub, for the moment it is true; or
 *  - the provider's own embedded preview page (ProviderPreview), which is
 *    the only honest option for Drive/OneDrive share links.
 */
export function ResourcePreview({ resource }: { resource: Resource }) {
  const isDirectVideoFile =
    resource.previewMode === 'video' && DIRECT_VIDEO_FILE_PATTERN.test(resource.externalUrl);

  if (isDirectVideoFile) {
    return <VideoPlayer src={resource.externalUrl} title={resource.title} />;
  }

  return <ProviderPreview resource={resource} />;
}
