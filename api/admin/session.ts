import { parseCookies } from '../_lib/cookies';
import { SESSION_COOKIE_NAME, readAdminEnv, verifySessionToken } from '../_lib/adminAuth';

export const config = { runtime: 'edge' };

/**
 * GET -> { authenticated: boolean }. The frontend's AdminSessionContext
 * calls this on mount to decide whether to show the login form or the
 * catalog console - the cookie itself is HttpOnly, so this is the only way
 * client-side code can know whether a session is currently valid.
 */
export default async function handler(req: Request): Promise<Response> {
  const env = readAdminEnv();
  if (!env) {
    return new Response(JSON.stringify({ authenticated: false, configured: false }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  const cookies = parseCookies(req.headers.get('cookie'));
  const authenticated = await verifySessionToken(cookies[SESSION_COOKIE_NAME], env.sessionSecret);

  return new Response(JSON.stringify({ authenticated, configured: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
