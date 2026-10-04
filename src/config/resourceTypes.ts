import type { AccessMode, CatalogResourceType, PreviewMode } from '@/types';

export interface ResourceTypeDefinition {
  value: CatalogResourceType;
  icon: string;
  label: { ar: string; en: string };
  /** Which Step 4 behaviors the admin wizard offers for this type. */
  allowedAccessModes: AccessMode[];
  defaultAccessMode: AccessMode;
  defaultPreviewMode: PreviewMode;
  /** Per-type wording for the same underlying access mode, e.g. a video's
   *  "preview-download" option reads "عرض الفيديو" rather than the generic
   *  "معاينة + تحميل". Falls back to the generic resourceAction.* keys in
   *  src/lib/resourceModel.ts when a type doesn't override a given mode. */
  behaviorLabelKeys?: Partial<Record<AccessMode, string>>;
}

/**
 * THE extensible list driving Step 1 of the admin "إضافة الملفات" wizard,
 * icon selection on cards/details, and which Step 4 behaviors are offered
 * (master spec, section 4: "extensible so additional types can be added
 * later from configuration rather than rewriting the whole form"). Adding a
 * resource type means adding one entry here.
 */
export const resourceTypeDefinitions: ResourceTypeDefinition[] = [
  {
    value: 'archive',
    icon: 'archive',
    label: { ar: 'أرشيف مضغوط', en: 'Archive' },
    allowedAccessModes: ['download-only'],
    defaultAccessMode: 'download-only',
    defaultPreviewMode: 'none',
  },
  {
    value: 'software',
    icon: 'app-window',
    label: { ar: 'برنامج', en: 'Software' },
    allowedAccessModes: ['download-only'],
    defaultAccessMode: 'download-only',
    defaultPreviewMode: 'none',
  },
  {
    value: 'tool',
    icon: 'wrench',
    label: { ar: 'أداة', en: 'Tool' },
    allowedAccessModes: ['download-only'],
    defaultAccessMode: 'download-only',
    defaultPreviewMode: 'none',
  },
  {
    value: 'document',
    icon: 'file-text',
    label: { ar: 'مستند', en: 'Document' },
    allowedAccessModes: ['preview-download', 'download-only'],
    defaultAccessMode: 'preview-download',
    defaultPreviewMode: 'provider',
  },
  {
    value: 'code',
    icon: 'code',
    label: { ar: 'كود', en: 'Code' },
    allowedAccessModes: ['download-only'],
    defaultAccessMode: 'download-only',
    defaultPreviewMode: 'none',
  },
  {
    value: 'pdf',
    icon: 'file-text',
    label: { ar: 'PDF', en: 'PDF' },
    allowedAccessModes: ['preview-download', 'download-only'],
    defaultAccessMode: 'preview-download',
    defaultPreviewMode: 'pdf',
  },
  {
    value: 'image',
    icon: 'image',
    label: { ar: 'صورة', en: 'Image' },
    allowedAccessModes: ['preview-download', 'download-only'],
    defaultAccessMode: 'preview-download',
    defaultPreviewMode: 'image',
  },
  {
    value: 'video',
    icon: 'video',
    label: { ar: 'فيديو', en: 'Video' },
    allowedAccessModes: ['preview-download', 'download-only'],
    defaultAccessMode: 'preview-download',
    defaultPreviewMode: 'video',
    behaviorLabelKeys: { 'preview-download': 'resourceAction.watchVideo' },
  },
  {
    value: 'course',
    icon: 'graduation-cap',
    label: { ar: 'دورة تعليمية', en: 'Course' },
    allowedAccessModes: ['view-only'],
    defaultAccessMode: 'view-only',
    defaultPreviewMode: 'provider',
    behaviorLabelKeys: { 'view-only': 'resourceAction.watchOnly' },
  },
  {
    value: 'other',
    icon: 'shapes',
    label: { ar: 'أخرى', en: 'Other' },
    allowedAccessModes: ['download-only', 'preview-download', 'view-only'],
    defaultAccessMode: 'download-only',
    defaultPreviewMode: 'none',
  },
];

export function getResourceTypeDefinition(value: CatalogResourceType): ResourceTypeDefinition {
  return (
    resourceTypeDefinitions.find((def) => def.value === value) ??
    resourceTypeDefinitions[resourceTypeDefinitions.length - 1]
  );
}
