import { requireAdminSession } from '../_lib/adminAuth';
import {
  deleteResourceRow,
  getSql,
  updateResourceRow,
  validateResourceBody,
} from '../_lib/resourcesDb';

export const config = { runtime: 'edge' };

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** Edge Functions receive only a Web-standard `Request` - no framework
 *  "params" object - so the dynamic `:id` segment is read directly out of
 *  the request URL's path, same as any other Web-standard router would. */
function readIdFromUrl(req: Request): string | null {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];
  return id ? decodeURIComponent(id) : null;
}

/**
 * PATCH -> update an existing resource's metadata.
 * DELETE -> remove a resource entry from the catalog ONLY. Per the master
 * spec: "Deleting a resource from the Admin must NOT delete the actual
 * Google Drive/OneDrive file" - this endpoint only ever touches the
 * metadata row; it has no ability to reach the provider's file at all.
 * Both require a valid admin session cookie.
 */
export default async function handler(req: Request): Promise<Response> {
  const id = readIdFromUrl(req);
  if (!id) return json({ ok: false, error: 'missing_id' }, 400);

  const authorized = await requireAdminSession(req);
  if (!authorized) return json({ ok: false, error: 'unauthorized' }, 401);

  const sql = getSql();
  if (!sql) return json({ ok: false, error: 'backend_not_configured' }, 500);

  if (req.method === 'PATCH') {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: 'invalid_body' }, 400);
    }
    const validation = validateResourceBody(body, id);
    if (!validation.ok || !validation.value) {
      return json({ ok: false, error: validation.error ?? 'invalid_body' }, 400);
    }
    try {
      const updated = await updateResourceRow(sql, id, validation.value);
      return json({ ok: true, resource: updated }, 200);
    } catch (error) {
      const notFound = error instanceof Error && error.message === 'not_found';
      return json({ ok: false, error: notFound ? 'not_found' : 'update_failed' }, notFound ? 404 : 500);
    }
  }

  if (req.method === 'DELETE') {
    try {
      await deleteResourceRow(sql, id);
      return json({ ok: true }, 200);
    } catch (error) {
      return json({ ok: false, error: 'delete_failed', detail: String(error) }, 500);
    }
  }

  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
