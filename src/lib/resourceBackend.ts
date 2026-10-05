import type { Resource } from '@/types';
import { normalizeResource } from './resourceModel';

/**
 * The PUBLIC read path to the catalog's metadata backend (master spec,
 * section 3: "the resource catalog needs to be synchronized for all
 * visitors/devices"). This deliberately uses plain `fetch()` against
 * Supabase's PostgREST endpoint instead of importing `@supabase/
 * supabase-js` - that package is reserved for the lazy-loaded legacy admin
 * chunk only (see src/lib/supabaseClient.ts's own comment); importing it
 * here would pull the whole SDK into the main bundle every visitor
 * downloads, which is exactly what that earlier design decision was meant
 * to prevent. A few CRUD-free GET requests don't need an SDK.
 *
 * Only the public anon key is ever used from this file. It is safe in the
 * browser bundle because `resources` has no write policy at all for it -
 * see supabase/resources_schema.sql.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isResourceBackendConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

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
    // own CHECK constraints (resources_schema.sql) are the real guarantee
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

/** Fetches every row visible to the anon key (i.e. every resource - see the
 *  public-read RLS policy). Throws on a network or server error; callers
 *  decide how to degrade (resourceStore.ts keeps serving the local seed). */
export async function fetchPublicResources(): Promise<Resource[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/resources?select=*&order=created_at.asc`, {
    headers: {
      apikey: SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`resources_fetch_failed:${res.status}`);
  const rows = (await res.json()) as ResourceRow[];
  return rows.map(rowToResource);
}
