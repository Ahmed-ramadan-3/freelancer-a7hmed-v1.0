import { requireAdminSession } from '../_lib/adminAuth';
import { getSupabaseAdminConfig, insertResourceRow, validateResourceBody } from '../_lib/resourcesRest';

export const config = { runtime: 'edge' };

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/**
 * POST -> create a new catalog resource. Protected: requires a valid admin
 * session cookie (checked server-side, never trusting anything the client
 * claims - master spec, section 15). Writes metadata only, via the
 * service_role key - never any file bytes, per the master spec's hard
 * "no file storage" requirement; this endpoint has no body field capable of
 * holding one.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405);
  }

  const authorized = await requireAdminSession(req);
  if (!authorized) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const config = getSupabaseAdminConfig();
  if (!config) {
    return json({ ok: false, error: 'backend_not_configured' }, 500);
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
    const created = await insertResourceRow(config, validation.value);
    return json({ ok: true, resource: created }, 201);
  } catch (error) {
    return json({ ok: false, error: 'insert_failed', detail: String(error) }, 500);
  }
}
