import { serializeSessionCookie } from '../_lib/cookies';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createSessionToken,
  readAdminEnv,
  timingSafeStringEqual,
} from '../_lib/adminAuth';

export const config = { runtime: 'edge' };

function json(body: unknown, status: number, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/**
 * POST { username, password } -> sets an HttpOnly session cookie on success.
 * Credentials are compared against ADMIN_USERNAME/ADMIN_PASSWORD, server-only
 * env vars configured in Vercel's dashboard (never VITE_-prefixed, so they
 * are never inlined into the browser bundle - master spec, section 5/15).
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405);
  }

  const env = readAdminEnv();
  if (!env) {
    return json({ ok: false, error: 'not_configured' }, 500);
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid_body' }, 400);
  }

  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';

  // Both comparisons always run - never short-circuited - so a wrong
  // username and a wrong password take the same time as a wrong password
  // alone (no username-enumeration timing signal).
  const usernameOk = timingSafeStringEqual(username, env.username);
  const passwordOk = timingSafeStringEqual(password, env.password);

  if (!usernameOk || !passwordOk) {
    return json({ ok: false, error: 'invalid_credentials' }, 401);
  }

  const token = await createSessionToken(env.username, env.sessionSecret);
  const cookie = serializeSessionCookie(SESSION_COOKIE_NAME, token, {
    maxAgeSeconds: SESSION_TTL_SECONDS,
  });

  return json({ ok: true }, 200, { 'set-cookie': cookie });
}
