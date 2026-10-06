import { requireAdminSession } from '../_lib/adminAuth';
import { getSql, insertResourceRow, selectAllResourceRows, validateResourceBody } from '../_lib/resourcesDb';

export const config = { runtime: 'edge' };

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/**
 * GET  -> public, unauthenticated: the full catalog's metadata, read by
 * every visitor's browser (src/lib/resourceBackend.ts). This is the same
 * data the site has always shown publicly - there is nothing in the
 * `resources` table that isn't already meant to be on the public site.
 *
 * POST -> create a new catalog resource. Protected: requires a valid admin
 * session cookie (checked server-side, never trusting anything the client
 * claims - master spec: "Public users should NOT have unrestricted
 * create/update/delete access"). Writes metadata only, via a parameterized
 * query - never any file bytes, per the master spec's hard "no file
 * storage" requirement; this endpoint has no body field capable of holding
 * one.
 */
export default async function handler(req: Request): Promise<Response> {
  const sql = getSql();
  if (!sql) {
    return json({ ok: false, error: 'backend_not_configured' }, 500);
  }

  if (req.method === 'GET') {
    try {
      const resources = await selectAllResourceRows(sql);
      return json({ ok: true, resources }, 200);
    } catch (error) {
      return json({ ok: false, error: 'fetch_failed', detail: String(error) }, 500);
    }
  }

  if (req.method === 'POST') {
    const authorized = await requireAdminSession(req);
    if (!authorized) {
      return json({ ok: false, error: 'unauthorized' }, 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: 'invalid_body' }, 400);
    }

    const validation = validateResourceBody(body);
    if (!validation.ok || !validation.value) {
      return json({ ok: false, error: validation.error ?? 'invalid_body' }, 400);
    }

    try {
      const created = await insertResourceRow(sql, validation.value);
      return json({ ok: true, resource: created }, 201);
    } catch (error) {
      return json({ ok: false, error: 'insert_failed', detail: String(error) }, 500);
    }
  }

  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
