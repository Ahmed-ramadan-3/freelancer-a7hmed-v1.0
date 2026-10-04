import type { Resource, ResourceInput } from '@/types';
import { normalizeResource } from '@/lib/resourceModel';
import { seedResources } from './resources';

/**
 * ---------------------------------------------------------------------------
 * THE active catalog's public read/write API. Every page/component - public
 * or admin - reads resources through the functions here, never by importing
 * `seedResources` directly (see src/data/resources.ts).
 * ---------------------------------------------------------------------------
 *
 * Two sources are merged:
 *  1. `seedResources` - the build-time catalog, shipped with the site.
 *  2. Admin-made additions/edits/deletions, kept in the browser's own
 *     localStorage under STORAGE_KEY.
 *
 * ⚠️ IMPORTANT, HONEST LIMITATION (master spec, "Admin behavior": "do NOT
 * pretend that browser-only admin changes are globally persistent across
 * all visitors"): this project still has no backend. A resource the admin
 * adds or edits through the "إضافة الملفات" wizard is saved ONLY in the
 * browser/profile the admin used - another visitor, another browser, or the
 * admin on another device will NOT see it. The Admin Catalog screen states
 * this plainly (see src/pages/admin/AdminCatalogPage.tsx). This module's
 * functions are written as a clean, synchronous CRUD surface specifically so
 * that connecting a real metadata backend later means replacing the body of
 * these functions with real API calls - no caller elsewhere in the app
 * would need to change.
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

export function getAllResources(): Resource[] {
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
 *  admin wizard - used by the Admin Catalog screen to label rows. */
export function isSeedResource(id: string): boolean {
  return seedResources.some((resource) => resource.id === id);
}

export function addResource(input: Omit<ResourceInput, 'id'> & { id?: string }): Resource {
  const overrides = readOverrides();
  const existingIds = new Set(getAllResources().map((r) => r.id));
  const id =
    input.id && !existingIds.has(input.id) ? input.id : generateUniqueId(input.title, existingIds);
  const resource = normalizeResource({ ...input, id });

  overrides.added.push(resource);
  writeOverrides(overrides);
  return resource;
}

export function updateResource(id: string, patch: Partial<Resource>): Resource {
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

export function deleteResource(id: string): void {
  const overrides = readOverrides();
  overrides.added = overrides.added.filter((resource) => resource.id !== id);
  delete overrides.edited[id];
  if (!overrides.deletedIds.includes(id)) overrides.deletedIds.push(id);
  writeOverrides(overrides);
}

/** Admin-facing escape hatch: discard every local addition/edit/deletion and
 *  return to exactly the build-time seed catalog. */
export function resetLocalCatalogOverrides(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
