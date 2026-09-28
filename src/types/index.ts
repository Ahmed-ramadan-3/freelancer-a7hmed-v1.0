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
 * small static catalog (src/data/resources.ts) of items that live on Google
 * Drive. It is intentionally simpler than `FileResource` above - single
 * string fields, no storage path, no backend id - because there is no
 * database behind it. `FileResource` is kept as-is because it is still the
 * model the preserved-but-disabled Admin panel and Supabase services use;
 * the two models are independent on purpose (see README.md "Architecture").
 */
export interface Resource {
  id: string;
  title: string;
  description: string;
  /** A slug matching one of src/config/categories.ts, e.g. "programming". */
  category: string;
  fileType: string;
  fileSize: string;
  platform?: string;
  /** Path to a local asset under /public, e.g. "/icons/resources/x.svg". */
  icon?: string;
  image?: string;
  /** The exact Google Drive "view" URL for this file - never a folder or
   *  the Drive homepage, and never converted into a direct-download link. */
  googleDriveUrl: string;
  tags?: string[];
  featured?: boolean;
}
