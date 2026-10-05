/**
 * Minimal cookie parsing/serialization - no dependency pulled in for this,
 * since the format is a handful of lines of string splitting (master spec:
 * "Do NOT add unnecessary packages").
 */

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

export interface CookieOptions {
  maxAgeSeconds?: number;
  path?: string;
}

/**
 * Always HttpOnly + Secure + SameSite=Strict - this cookie is a bearer
 * session token for the admin console, never meant to be read or sent by
 * anything other than this site's own same-site requests (master spec,
 * section 15: "Use secure cookies/tokens").
 */
export function serializeSessionCookie(
  name: string,
  value: string,
  { maxAgeSeconds, path = '/' }: CookieOptions = {},
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ];
  if (typeof maxAgeSeconds === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
  }
  return parts.join('; ');
}
