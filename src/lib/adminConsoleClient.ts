import type { Resource, ResourceInput } from '@/types';
import { rowToResource, type ResourceRow } from './resourceBackend';

/**
 * Client-side calls to the new, lightweight admin API under api/admin/* and
 * api/resources/*.ts (master spec, section 3: "a lightweight backend...
 * save and serve resource metadata"). Every call is same-origin, so the
 * HttpOnly session cookie set by /api/admin/login is sent automatically -
 * no token handling needed here at all, and nothing in this file can read
 * the cookie's value (that's the point of HttpOnly).
 */

async function parseJson<T>(res: Response): Promise<T | Record<string, never>> {
  try {
    return (await res.json()) as T;
  } catch {
    return {};
  }
}

export interface AdminLoginResult {
  ok: boolean;
  error?: string;
}

export async function adminLogin(username: string, password: string): Promise<AdminLoginResult> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await parseJson<{ ok?: boolean; error?: string }>(res);
  return { ok: res.ok && data.ok === true, error: data.error };
}

export async function adminLogout(): Promise<void> {
  await fetch('/api/admin/logout', { method: 'POST' });
}

export async function fetchAdminSession(): Promise<{ authenticated: boolean; configured: boolean }> {
  try {
    const res = await fetch('/api/admin/session');
    const data = await parseJson<{ authenticated?: boolean; configured?: boolean }>(res);
    return { authenticated: Boolean(data.authenticated), configured: Boolean(data.configured) };
  } catch {
    return { authenticated: false, configured: false };
  }
}

function resourceInputToBody(input: Partial<ResourceInput>) {
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    resourceType: input.resourceType,
    fileType: input.fileType,
    fileSize: input.fileSize,
    platform: input.platform,
    icon: input.icon,
    image: input.image,
    provider: input.provider,
    externalUrl: input.externalUrl,
    accessMode: input.accessMode,
    previewMode: input.previewMode,
    tags: input.tags,
    featured: input.featured,
  };
}

async function unwrapResourceResponse(res: Response): Promise<Resource> {
  const data = await parseJson<{ ok?: boolean; resource?: ResourceRow; error?: string }>(res);
  if (!res.ok || !data.ok || !data.resource) {
    throw new Error(data.error ?? `request_failed:${res.status}`);
  }
  return rowToResource(data.resource);
}

export async function createResourceOnBackend(input: ResourceInput): Promise<Resource> {
  const res = await fetch('/api/resources', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(resourceInputToBody(input)),
  });
  return unwrapResourceResponse(res);
}

export async function updateResourceOnBackend(
  id: string,
  patch: Partial<ResourceInput>,
): Promise<Resource> {
  const res = await fetch(`/api/resources/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(resourceInputToBody(patch)),
  });
  return unwrapResourceResponse(res);
}

export async function deleteResourceOnBackend(id: string): Promise<void> {
  const res = await fetch(`/api/resources/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const data = await parseJson<{ ok?: boolean; error?: string }>(res);
  if (!res.ok || !data.ok) throw new Error(data.error ?? `delete_failed:${res.status}`);
}
