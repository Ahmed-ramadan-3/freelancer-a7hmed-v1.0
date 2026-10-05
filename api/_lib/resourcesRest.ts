/**
 * Server-only helpers for api/resources/*.ts: a thin PostgREST client using
 * the Supabase **service_role** key (bypasses Row Level Security - see
 * supabase/resources_schema.sql's comments), plus the field validation the
 * master spec asks for (section 15: "Validate submitted URLs... Accept only
 * safe HTTP/HTTPS URLs... Reject javascript:, data:, vbscript:...").
 *
 * This deliberately does NOT import `@supabase/supabase-js` - a plain
 * `fetch()` against Supabase's REST endpoint is all a handful of CRUD calls
 * need, and it keeps the Edge Function bundle tiny (master spec: "Do NOT
 * add unnecessary packages").
 *
 * This file intentionally duplicates a small amount of logic already in
 * src/lib/provider.ts and src/lib/validation.ts rather than importing them:
 * api/ is built and deployed independently of the Vite app (a different
 * bundler, a different runtime), so keeping it self-contained avoids a
 * fragile cross-build import path for a few dozen lines of logic. If either
 * copy changes, keep both in sync - each file's comment points at the
 * other.
 */

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

interface SupabaseAdminConfig {
  url: string;
  serviceRoleKey: string;
}

/** `VITE_SUPABASE_URL` is not a secret (it's already shipped to the
 *  browser for the public read path), so it's fine to reuse here. The
 *  service_role key is the one piece that must never have a VITE_ prefix. */
export function getSupabaseAdminConfig(): SupabaseAdminConfig | null {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

function restHeaders(serviceRoleKey: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'content-type': 'application/json',
    ...extra,
  };
}

export async function insertResourceRow(
  config: SupabaseAdminConfig,
  row: ValidatedResourceInput,
): Promise<ResourceRow> {
  const res = await fetch(`${config.url}/rest/v1/resources`, {
    method: 'POST',
    headers: restHeaders(config.serviceRoleKey, { Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`insert_failed:${res.status}:${await res.text()}`);
  const rows = (await res.json()) as ResourceRow[];
  return rows[0];
}

export async function updateResourceRow(
  config: SupabaseAdminConfig,
  id: string,
  row: ValidatedResourceInput,
): Promise<ResourceRow> {
  const { id: _unused, ...patch } = row;
  const res = await fetch(`${config.url}/rest/v1/resources?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: restHeaders(config.serviceRoleKey, { Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`update_failed:${res.status}:${await res.text()}`);
  const rows = (await res.json()) as ResourceRow[];
  if (rows.length === 0) throw new Error('not_found');
  return rows[0];
}

export async function deleteResourceRow(config: SupabaseAdminConfig, id: string): Promise<void> {
  const res = await fetch(`${config.url}/rest/v1/resources?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: restHeaders(config.serviceRoleKey),
  });
  if (!res.ok) throw new Error(`delete_failed:${res.status}:${await res.text()}`);
}
