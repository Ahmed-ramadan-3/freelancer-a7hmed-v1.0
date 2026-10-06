import type { Resource } from '@/types';
import { normalizeResource } from './resourceModel';

/**
 * The PUBLIC read path to the catalog's metadata backend (master spec:
 * "the resource catalog needs to be synchronized for all visitors/
 * devices"). This calls this site's own `GET /api/resources` - a
 * same-origin, same-domain request - which is the only thing that talks to
 * the Neon database directly (api/_lib/resourcesDb.ts, server-only,
 * `DATABASE_URL`). The browser never holds a database connection string or
 * credential of any kind for this.
 *
 * `isResourceBackendConfigured` is a plain, non-secret boolean the owner
 * sets at build time (`VITE_RESOURCES_BACKEND_ENABLED`) to say "a Neon
 * database is configured, go ahead and sync" - it carries no connection
 * info itself, unlike the Supabase anon key this file used before this
 * phase's migration. If it's on but the server-side `DATABASE_URL` turns
 * out to be missing, `/api/resources` simply answers with an error and
 * `resourceStore.ts` degrades to the local seed, exactly as it already did
 * for any other network failure.
 */

export const isResourceBackendConfigured = import.meta.env.VITE_RESOURCES_BACKEND_ENABLED === 'true';

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
  tags: string[] | null;
  featured: boolean;
}

export function rowToResource(row: ResourceRow): Resource {
  return normalizeResource({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the DB's
    // own CHECK constraints (db/resources_schema.sql) are the real guarantee
    // that these strings are one of the known enum values.
    resourceType: row.resource_type as any,
    fileType: row.file_type,
    fileSize: row.file_size,
    platform: row.platform ?? undefined,
    icon: row.icon ?? undefined,
    image: row.image ?? undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provider: row.provider as any,
    externalUrl: row.external_url,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accessMode: row.access_mode as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    previewMode: row.preview_mode as any,
    tags: row.tags ?? undefined,
    featured: row.featured,
  });
}

/** Fetches every resource from the database, via this site's own public API
 *  route. Throws on a network or server error; callers decide how to
 *  degrade (resourceStore.ts keeps serving the local seed). */
export async function fetchPublicResources(): Promise<Resource[]> {
  const res = await fetch('/api/resources');
  if (!res.ok) throw new Error(`resources_fetch_failed:${res.status}`);
  const data = (await res.json()) as { ok?: boolean; resources?: ResourceRow[] };
  if (!data.ok || !Array.isArray(data.resources)) throw new Error('resources_fetch_invalid');
  return data.resources.map(rowToResource);
}
