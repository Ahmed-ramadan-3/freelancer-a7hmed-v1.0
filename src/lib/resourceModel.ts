import type { AccessMode, Resource, ResourceInput } from '@/types';
import { detectProvider } from './provider';
import { getResourceTypeDefinition } from '@/config/resourceTypes';

/**
 * Accepts anything shaped like a (possibly pre-upgrade) resource and returns
 * a fully-populated `Resource` with every new field present. This is the
 * ONLY place that reads the deprecated `googleDriveUrl` field - everything
 * else in the app reads `externalUrl` (master spec, section 5: "migrate it
 * safely and preserve compatibility ... do not break existing data").
 */
export function normalizeResource(input: ResourceInput | Resource): Resource {
  const externalUrl = input.externalUrl ?? input.googleDriveUrl ?? '';
  const provider = input.provider ?? detectProvider(externalUrl) ?? 'google-drive';
  const resourceType = input.resourceType ?? 'other';
  const typeDefaults = getResourceTypeDefinition(resourceType);

  return {
    id: input.id,
    title: input.title,
    description: input.description,
    category: input.category ?? 'other',
    resourceType,
    fileType: input.fileType ?? '',
    fileSize: input.fileSize ?? '',
    platform: input.platform,
    icon: input.icon,
    image: input.image,
    provider,
    externalUrl,
    accessMode: input.accessMode ?? typeDefaults.defaultAccessMode,
    previewMode: input.previewMode ?? typeDefaults.defaultPreviewMode,
    tags: input.tags,
    featured: input.featured,
  };
}

const DEFAULT_ACTION_LABEL_KEYS: Record<AccessMode, string> = {
  'download-only': 'resource.download',
  'preview-download': 'resource.preview',
  'view-only': 'resource.viewOnly',
};

/**
 * The translation key for a resource's primary action, honoring a
 * type-specific override (e.g. a video's "preview-download" reads "عرض
 * الفيديو") before falling back to the generic wording for that access
 * mode. Used by ResourceCard, FeaturedResource, and ResourceDetailsPage so
 * the three places a resource's action appears never drift out of sync.
 */
export function getActionLabelKey(resource: Resource): string {
  const typeDef = getResourceTypeDefinition(resource.resourceType);
  return (
    typeDef.behaviorLabelKeys?.[resource.accessMode] ?? DEFAULT_ACTION_LABEL_KEYS[resource.accessMode]
  );
}
