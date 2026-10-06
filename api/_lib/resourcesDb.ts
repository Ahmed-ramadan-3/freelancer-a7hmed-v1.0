/**
 * Server-only helpers for api/resources/*.ts: a thin Neon Postgres client
 * (via `@neondatabase/serverless`'s HTTP-mode `neon()` tagged-template
 * function - Neon's own recommended approach for a single query per
 * serverless/Edge request, no connection pooling to manage), plus the field
 * validation the master spec asks for ("Validate all incoming resource
 * data... Validate/sanitize external URLs... Prevent SQL injection by using
 * parameterized queries").
 *
 * All queries use `sql\`...\`` tagged templates, never string concatenation
 * - every value in a query is sent as a separate, properly-typed parameter
 * by the driver, which is what actually prevents SQL injection here (not
 * the validation below - that exists to keep bad/oversized data out of the
 * table in the first place).
 *
 * This file intentionally duplicates a small amount of logic already in
 * src/lib/provider.ts and src/lib/validation.ts rather than importing them:
 * api/ is built and deployed independently of the Vite app (a different
 * bundler, a different runtime), so keeping it self-contained avoids a
 * fragile cross-build import path for a few dozen lines of logic. If either
 * copy changes, keep both in sync - each file's comment points at the
 * other.
 */

import { neon } from '@neondatabase/serverless';

const DANGEROUS_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:'];
const GOOGLE_DRIVE_HOSTS = ['drive.google.com'];
const ONE_DRIVE_HOSTS = ['1drv.ms', 'onedrive.live.com'];
const ONE_DRIVE_HOST_SUFFIX = '.sharepoint.com';

const FIELD_LIMITS = {
  title: 120,
  description: 600,
  fileType: 20,
  fileSize: 20,
  platform: 40,
  tag: 30,
  maxTags: 8,
};

const RESOURCE_TYPES = [
  'archive', 'software', 'tool', 'document', 'code',
  'pdf', 'image', 'video', 'course', 'other',
];
const ACCESS_MODES = ['download-only', 'preview-download', 'view-only'];
const PREVIEW_MODES = ['provider', 'video', 'image', 'pdf', 'none'];

function isSafeExternalUrl(url: string): boolean {
  const trimmed = url.trim();
  if (DANGEROUS_SCHEMES.some((scheme) => trimmed.toLowerCase().startsWith(scheme))) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function detectProvider(url: string): 'google-drive' | 'one-drive' | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (GOOGLE_DRIVE_HOSTS.includes(host)) return 'google-drive';
    if (ONE_DRIVE_HOSTS.includes(host) || host.endsWith(ONE_DRIVE_HOST_SUFFIX)) return 'one-drive';
    return null;
  } catch {
    return null;
  }
}

export interface ResourceRow {
  id: string;
  title: string;
  description: string;
  category: string;
  resource_type: string;
  file_type: string;
  file_size: string;
  platform: string | null;
  icon: string | null;
  image: string | null;
  provider: string;
  external_url: string;
  access_mode: string;
  preview_mode: string;
  tags: string[];
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export type ValidatedResourceInput = Omit<ResourceRow, 'created_at' | 'updated_at'>;

interface ValidationResult {
  ok: boolean;
  error?: string;
  value?: ValidatedResourceInput;
}

function clampText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'resource'
  );
}

/**
 * Validates and normalizes a raw JSON body into a safe row ready to insert
 * or update. Returns `{ ok: false }` for anything that doesn't pass - the
 * caller (api/resources/*.ts) turns that into a 400, never a 500 or a
 * silently-accepted bad value.
 */
export function validateResourceBody(body: unknown, existingId?: string): ValidationResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'invalid_body' };
  const b = body as Record<string, unknown>;

  const title = clampText(b.title, FIELD_LIMITS.title);
  const description = clampText(b.description, FIELD_LIMITS.description);
  if (!title) return { ok: false, error: 'title_required' };
  if (!description) return { ok: false, error: 'description_required' };

  const externalUrl = typeof b.externalUrl === 'string' ? b.externalUrl.trim() : '';
  if (!externalUrl || !isSafeExternalUrl(externalUrl)) {
    return { ok: false, error: 'url_unsafe' };
  }
  const detectedProvider = detectProvider(externalUrl);
  if (!detectedProvider) return { ok: false, error: 'url_unsupported_provider' };

  const resourceType = typeof b.resourceType === 'string' ? b.resourceType : 'other';
  if (!RESOURCE_TYPES.includes(resourceType)) return { ok: false, error: 'invalid_resource_type' };

  const accessMode = typeof b.accessMode === 'string' ? b.accessMode : 'download-only';
  if (!ACCESS_MODES.includes(accessMode)) return { ok: false, error: 'invalid_access_mode' };

  const previewMode = typeof b.previewMode === 'string' ? b.previewMode : 'none';
  if (!PREVIEW_MODES.includes(previewMode)) return { ok: false, error: 'invalid_preview_mode' };

  const tags = Array.isArray(b.tags)
    ? b.tags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim().slice(0, FIELD_LIMITS.tag))
        .filter(Boolean)
        .slice(0, FIELD_LIMITS.maxTags)
    : [];

  const idSource = existingId ?? (typeof b.id === 'string' && b.id ? b.id : title);
  const id = existingId ?? slugify(idSource);

  return {
    ok: true,
    value: {
      id,
      title,
      description,
      category: clampText(b.category, 40) || 'other',
      resource_type: resourceType,
      file_type: clampText(b.fileType, FIELD_LIMITS.fileType),
      file_size: clampText(b.fileSize, FIELD_LIMITS.fileSize),
      platform: clampText(b.platform, FIELD_LIMITS.platform) || null,
      icon: typeof b.icon === 'string' ? b.icon.slice(0, 300) : null,
      image: typeof b.image === 'string' ? b.image.slice(0, 300) : null,
      provider: detectedProvider,
      external_url: externalUrl,
      access_mode: accessMode,
      preview_mode: previewMode,
      tags,
      featured: Boolean(b.featured),
    },
  };
}

// ---------------------------------------------------------------------------
// Neon connection. `DATABASE_URL` is read only here, only via
// `process.env` (never `import.meta.env`), so it never reaches any file the
// Vite build bundles for the browser - see .env.example's server-only
// section and README.md section 0.
// ---------------------------------------------------------------------------

type Sql = ReturnType<typeof neon>;

let cachedSql: Sql | null = null;
let cachedUrl: string | null = null;

/** Returns a ready-to-use `sql` tagged-template query function, or `null`
 *  when `DATABASE_URL` isn't set (lets every caller degrade the same way
 *  `getSupabaseAdminConfig()` used to: a clean "not configured" response,
 *  never a crash). Cached across invocations of the same warm Edge Function
 *  instance - `neon()` itself holds no socket open, so there is nothing to
 *  leak or to explicitly close between requests. */
export function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!cachedSql || cachedUrl !== url) {
    cachedSql = neon(url);
    cachedUrl = url;
  }
  return cachedSql;
}

/** Public read path - every visitor's browser reaches this only indirectly,
 *  through GET /api/resources (src/lib/resourceBackend.ts); nothing on the
 *  client ever holds `DATABASE_URL` or talks to Neon directly. */
export async function selectAllResourceRows(sql: Sql): Promise<ResourceRow[]> {
  const rows = await sql`
    select * from resources order by created_at asc
  `;
  return rows as unknown as ResourceRow[];
}

export async function insertResourceRow(sql: Sql, row: ValidatedResourceInput): Promise<ResourceRow> {
  const rows = await sql`
    insert into resources (
      id, title, description, category, resource_type, file_type, file_size,
      platform, icon, image, provider, external_url, access_mode,
      preview_mode, tags, featured
    ) values (
      ${row.id}, ${row.title}, ${row.description}, ${row.category}, ${row.resource_type},
      ${row.file_type}, ${row.file_size}, ${row.platform}, ${row.icon}, ${row.image},
      ${row.provider}, ${row.external_url}, ${row.access_mode}, ${row.preview_mode},
      ${row.tags}::text[], ${row.featured}
    )
    returning *
  `;
  return rows[0] as unknown as ResourceRow;
}

export async function updateResourceRow(
  sql: Sql,
  id: string,
  row: ValidatedResourceInput,
): Promise<ResourceRow> {
  const rows = await sql`
    update resources set
      title = ${row.title},
      description = ${row.description},
      category = ${row.category},
      resource_type = ${row.resource_type},
      file_type = ${row.file_type},
      file_size = ${row.file_size},
      platform = ${row.platform},
      icon = ${row.icon},
      image = ${row.image},
      provider = ${row.provider},
      external_url = ${row.external_url},
      access_mode = ${row.access_mode},
      preview_mode = ${row.preview_mode},
      tags = ${row.tags}::text[],
      featured = ${row.featured}
    where id = ${id}
    returning *
  `;
  if (rows.length === 0) throw new Error('not_found');
  return rows[0] as unknown as ResourceRow;
}

/** Deletes only the metadata row - see api/resources/[id].ts's own comment:
 *  this function has no ability to reach, let alone delete, the actual
 *  Google Drive/OneDrive file a resource points to. */
export async function deleteResourceRow(sql: Sql, id: string): Promise<void> {
  await sql`delete from resources where id = ${id}`;
}
