/** Shared domain types. Kept separate from components/services so both sides
 *  of the mock/Supabase boundary agree on the exact same shape. */

export type Language = 'ar' | 'en';

/** Matches the CHECK constraint on profiles.role in supabase/schema.sql.
 *  "manager" | "editor" | "viewer" are reserved for future granular roles
 *  (master spec, section 26) - the frontend already narrows on them so
 *  adding one later doesn't require touching every permission check. */
export type UserRole = 'owner' | 'admin' | 'manager' | 'editor' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface CategoryDefinition {
  slug: string;
  icon: string;
  label: Record<Language, string>;
}

export type ResourceType =
  | 'archive'
  | 'video'
  | 'pdf'
  | 'book'
  | 'software'
  | 'document'
  | 'image'
  | 'other';

export interface FileResource {
  id: string;
  title: Record<Language, string>;
  description: Record<Language, string>;
  categorySlug: string;
  resourceType: ResourceType;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  version: string | null;
  isPublic: boolean;
  isDownloadable: boolean;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface UploadMetadataInput {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  categorySlug: string;
  isPublic: boolean;
  isDownloadable: boolean;
  version?: string;
}

export interface UploadProgressEvent {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
}

export interface AdminInvitation {
  id: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'accepted' | 'revoked';
  invitedBy: string;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * ---------------------------------------------------------------------------
 * ACTIVE PUBLIC CATALOG MODEL
 * ---------------------------------------------------------------------------
 * `Resource` (below) is the model for the active, Supabase-free product: a
 * small catalog (src/data/resources.ts seed + src/data/resourceStore.ts
 * runtime layer) of items that live on Google Drive or OneDrive. It is
 * intentionally simpler than `FileResource` above - single string fields,
 * no backend id, no storage path - because there is no database behind it.
 * `FileResource` is kept as-is because it is still the model the
 * preserved-but-disabled Admin file panel and Supabase services use; the two
 * models are independent on purpose (see README.md "Architecture").
 */

/** Where a resource's file physically lives. Extensible: adding a third
 *  provider means adding one value here plus one entry in
 *  src/lib/provider.ts's host lists - no other type changes needed. */
export type ResourceProvider = 'google-drive' | 'one-drive';

/** What kind of content a resource is - drives icon choice and which
 *  behaviors (Step 4 of the admin wizard) are offered. Defaults are
 *  configured in src/config/resourceTypes.ts; this union exists so
 *  TypeScript can check exhaustiveness when a new type is added there. */
export type CatalogResourceType =
  | 'archive'
  | 'software'
  | 'tool'
  | 'document'
  | 'code'
  | 'pdf'
  | 'image'
  | 'video'
  | 'course'
  | 'other';

/** How a visitor is allowed to interact with the file:
 *  - 'download-only': a Download button only, no in-site preview.
 *  - 'preview-download': an in-site preview AND a Download button.
 *  - 'view-only': preview only, no Download action at all (courses). */
export type AccessMode = 'download-only' | 'preview-download' | 'view-only';

/** How the in-site preview (when accessMode allows one) should render.
 *  'provider' covers "embed the provider's own preview page" - the only
 *  honest option for Google Drive/OneDrive share links, which are HTML
 *  viewer pages, not raw, directly-playable/renderable file URLs (see
 *  src/lib/provider.ts). */
export type PreviewMode = 'provider' | 'video' | 'image' | 'pdf' | 'none';

export interface Resource {
  id: string;
  title: string;
  description: string;
  /** A slug matching one of src/config/categories.ts, e.g. "programming". */
  category: string;
  /** Content kind - see CatalogResourceType. Drives icon + default behavior. */
  resourceType: CatalogResourceType;
  fileType: string;
  fileSize: string;
  platform?: string;
  /** Path to a local asset under /public, e.g. "/icons/resources/x.svg". */
  icon?: string;
  image?: string;
  /** Where the file is hosted. See src/lib/provider.ts for detection. */
  provider: ResourceProvider;
  /** The exact share-page URL for this file - never a folder link, never a
   *  provider homepage, and never rewritten into a direct-download form.
   *  This is the canonical field; see `googleDriveUrl` below for the
   *  deprecated alias kept only for backward compatibility. */
  externalUrl: string;
  accessMode: AccessMode;
  previewMode: PreviewMode;
  tags?: string[];
  featured?: boolean;
  /**
   * @deprecated Use `externalUrl` + `provider: 'google-drive'` instead. Kept
   * only so a resource object written against the pre-upgrade shape keeps
   * working - see normalizeResource() in src/lib/resourceModel.ts, the ONLY
   * place this field should ever be read from again.
   */
  googleDriveUrl?: string;
}

/**
 * The minimum shape the admin wizard is expected to produce before
 * normalization fills in the rest. Kept distinct from `Resource` so
 * normalizeResource()'s job - "accept something looser, return something
 * complete" - is visible in the type signature itself.
 */
export type ResourceInput = Partial<Resource> &
  Pick<Resource, 'id' | 'title' | 'description' | 'externalUrl' | 'provider' | 'resourceType'>;
