import type { Resource, ResourceInput } from '@/types';
import { normalizeResource } from '@/lib/resourceModel';
import {
  createResourceOnBackend,
  deleteResourceOnBackend,
  updateResourceOnBackend,
} from '@/lib/adminConsoleClient';
import { fetchPublicResources, isResourceBackendConfigured } from '@/lib/resourceBackend';
import { seedResources } from './resources';

/**
 * ---------------------------------------------------------------------------
 * THE active catalog's public read/write API. Every page/component - public
 * or admin - reads resources through the functions here, never by importing
 * `seedResources` directly (see src/data/resources.ts).
 * ---------------------------------------------------------------------------
 *
 * Two independent modes, chosen once by whether a metadata backend is
 * configured (`isResourceBackendConfigured`, src/lib/resourceBackend.ts -
 * same `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` vars the legacy admin
 * uses, now dual-purpose):
 *
 * 1. NO backend configured (the project's zero-setup default): exactly the
 *    original behavior - `seedResources` merged with admin edits kept in
 *    this browser's own `localStorage`. Honest limitation, documented since
 *    the project's first phase: these admin changes are per-browser only.
 *
 * 2. Backend configured: resource metadata is fetched from Supabase (via
 *    src/lib/resourceBackend.ts's plain `fetch()`, never `@supabase/
 *    supabase-js` - see that file's comment) and merged with
 *    `seedResources`, so the catalog is the same for every visitor and
 *    device (master spec, section 3). Admin writes go through the protected
 *    api/resources/*.ts endpoints (src/lib/adminConsoleClient.ts), which
 *    are the only code allowed to write using the service_role key.
 *
 * Reads (`getAllResources` and friends) stay SYNCHRONOUS in both modes, so
 * no existing call site needs a loading state: in backend mode, the first
 * call returns `seedResources` immediately (never an empty catalog while a
 * request is in flight) and a background fetch updates an in-memory cache;
 * `subscribeToResourceUpdates()` lets a component re-render once that
 * arrives. Writes (`addResource`/`updateResource`/`deleteResource`) are
 * ASYNC in both modes - trivially synchronous-and-resolved for the
 * localStorage path, a real network round trip for the backend path - so
 * every caller can `await` them uniformly.
 */

const STORAGE_KEY = 'studio-learn:catalog-overrides';

interface CatalogOverrides {
  added: Resource[];
  edited: Record<string, Partial<Resource>>;
  deletedIds: string[];
}

function readOverrides(): CatalogOverrides {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { added: [], edited: {}, deletedIds: [] };
    const parsed = JSON.parse(raw) as Partial<CatalogOverrides>;
    return {
      added: parsed.added ?? [],
      edited: parsed.edited ?? {},
      deletedIds: parsed.deletedIds ?? [],
    };
  } catch {
    // A corrupted value should never crash the storefront - fail back to
    // "no local overrides" rather than throwing.
    return { added: [], edited: {}, deletedIds: [] };
  }
}

function writeOverrides(overrides: CatalogOverrides) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
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

function generateUniqueId(title: string, existingIds: Set<string>): string {
  const base = slugify(title);
  if (!existingIds.has(base)) return base;
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

// ---------------------------------------------------------------------------
// Backend cache + a tiny pub-sub so components can refresh once the
// background fetch resolves, without pulling in a state-management library
// for one event (master spec: "Do NOT add unnecessary packages").
// ---------------------------------------------------------------------------

let backendCache: Resource[] | null = null;
let backendLoadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function subscribeToResourceUpdates(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

/** Fire-and-forget: kicks off (or reuses) a single in-flight fetch of the
 *  backend catalog. Safe to call repeatedly - callers don't need to track
 *  whether a fetch is already running. */
function refreshFromBackend(): Promise<void> {
  if (!isResourceBackendConfigured) return Promise.resolve();
  if (backendLoadPromise) return backendLoadPromise;

  backendLoadPromise = fetchPublicResources()
    .then((resources) => {
      backendCache = resources;
      notifyListeners();
    })
    .catch(() => {
      // Honest degradation: a transient network/Supabase error leaves
      // backendCache as-is (null on first load -> callers keep seeing
      // seedResources; already-populated -> callers keep seeing the last
      // good snapshot) rather than throwing out of a synchronous read API.
    })
    .finally(() => {
      backendLoadPromise = null;
    });

  return backendLoadPromise;
}

if (isResourceBackendConfigured) {
  void refreshFromBackend();
}

/** Re-fetches immediately (used right after a write, so the admin sees
 *  their own change without waiting for whatever is left of a prior poll). */
async function forceRefreshFromBackend(): Promise<void> {
  backendLoadPromise = null;
  await refreshFromBackend();
}

export function getAllResources(): Resource[] {
  if (isResourceBackendConfigured) {
    if (!backendCache) {
      void refreshFromBackend();
      return seedResources;
    }
    const backendIds = new Set(backendCache.map((r) => r.id));
    // Seed resources stay visible unless the backend has its own row with
    // the same id (an admin edit of a seed resource) - see README.md for
    // the one honest gap this implies (a seed resource can't be *deleted*
    // once a backend is active, only superseded by editing it).
    return [...seedResources.filter((r) => !backendIds.has(r.id)), ...backendCache];
  }

  const { added, edited, deletedIds } = readOverrides();
  const deleted = new Set(deletedIds);

  const fromSeed = seedResources
    .filter((resource) => !deleted.has(resource.id))
    .map((resource) =>
      edited[resource.id] ? normalizeResource({ ...resource, ...edited[resource.id] }) : resource,
    );

  const fromAdmin = added
    .filter((resource) => !deleted.has(resource.id))
    .map((resource) => normalizeResource({ ...resource, ...(edited[resource.id] ?? {}) }));

  return [...fromSeed, ...fromAdmin];
}

export function getResourceById(id: string): Resource | undefined {
  return getAllResources().find((resource) => resource.id === id);
}

export function getFeaturedResources(): Resource[] {
  return getAllResources().filter((resource) => resource.featured);
}

export function getRelatedResources(resource: Resource, limit = 3): Resource[] {
  return getAllResources()
    .filter((item) => item.id !== resource.id && item.category === resource.category)
    .slice(0, limit);
}

/** True for a resource that came from the build-time seed rather than the
 *  admin - used by the Admin Catalog screen to label rows. */
export function isSeedResource(id: string): boolean {
  return seedResources.some((resource) => resource.id === id);
}

export async function addResource(input: Omit<ResourceInput, 'id'> & { id?: string }): Promise<Resource> {
  if (isResourceBackendConfigured) {
    const created = await createResourceOnBackend(input as ResourceInput);
    await forceRefreshFromBackend();
    return created;
  }

  const overrides = readOverrides();
  const existingIds = new Set(getAllResources().map((r) => r.id));
  const id =
    input.id && !existingIds.has(input.id) ? input.id : generateUniqueId(input.title, existingIds);
  const resource = normalizeResource({ ...input, id });

  overrides.added.push(resource);
  writeOverrides(overrides);
  return resource;
}

export async function updateResource(id: string, patch: Partial<Resource>): Promise<Resource> {
  if (isResourceBackendConfigured) {
    const existing = getResourceById(id);
    if (!existing) throw new Error('Resource not found');
    const updated = await updateResourceOnBackend(id, { ...existing, ...patch });
    await forceRefreshFromBackend();
    return updated;
  }

  const overrides = readOverrides();

  const addedIndex = overrides.added.findIndex((resource) => resource.id === id);
  if (addedIndex !== -1) {
    overrides.added[addedIndex] = normalizeResource({ ...overrides.added[addedIndex], ...patch });
    writeOverrides(overrides);
    return overrides.added[addedIndex];
  }

  overrides.edited[id] = { ...overrides.edited[id], ...patch };
  writeOverrides(overrides);

  const updated = getResourceById(id);
  if (!updated) throw new Error('Resource not found after update');
  return updated;
}

export async function deleteResource(id: string): Promise<void> {
  if (isResourceBackendConfigured) {
    await deleteResourceOnBackend(id);
    await forceRefreshFromBackend();
    return;
  }

  const overrides = readOverrides();
  overrides.added = overrides.added.filter((resource) => resource.id !== id);
  delete overrides.edited[id];
  if (!overrides.deletedIds.includes(id)) overrides.deletedIds.push(id);
  writeOverrides(overrides);
}

/** Admin-facing escape hatch, local mode only: discard every local
 *  addition/edit/deletion and return to exactly the build-time seed
 *  catalog. Not offered in the UI when a real backend is configured (there,
 *  "reset" has no single well-defined meaning - see AdminCatalogPage). */
export function resetLocalCatalogOverrides(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
