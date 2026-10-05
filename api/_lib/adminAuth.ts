/**
 * Server-only admin session handling (master spec, section 5: "Admin login
 * must require username + password... do NOT expose real credentials in
 * public client-side JavaScript... validate server-side"). Everything in
 * this file runs only inside Vercel Edge Functions under api/ - Vite never
 * bundles this directory into the browser build, so none of it - not the
 * env var reads, not the signing secret - ever reaches a client.
 *
 * The session is a small signed, expiring token (HMAC-SHA256 via the
 * platform's built-in Web Crypto - no JWT library needed for one claim and
 * one expiry) carried in an HttpOnly cookie. There is no database table for
 * sessions - verifying the signature and the expiry IS the whole check,
 * which keeps this "lightweight" per the master spec rather than standing
 * up a sessions table for a single-owner login.
 */
import { parseCookies } from './cookies';

export const SESSION_COOKIE_NAME = 'studio_admin_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

/** Constant-time-ish comparison for the decoded signature bytes, so a
 *  mismatched token can't be distinguished by how early the compare bails
 *  out (timing side channel). */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Same idea, for the plain-text username/password comparison in login.ts -
 *  avoids a `===` short-circuit leaking length/prefix information. */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.length !== bBytes.length) {
    // Still do a same-cost dummy compare so a length mismatch and a content
    // mismatch take roughly the same time.
    timingSafeEqual(aBytes, aBytes);
    return false;
  }
  return timingSafeEqual(aBytes, bBytes);
}

export interface AdminEnv {
  username: string;
  password: string;
  sessionSecret: string;
}

/** Reads the three server-only env vars this feature needs. Returns `null`
 *  (rather than throwing) when any are missing, so callers can return a
 *  clear 500 instead of a confusing crash - a misconfigured deployment
 *  should fail loudly, never fall back to "anyone can log in". */
export function readAdminEnv(): AdminEnv | null {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!username || !password || !sessionSecret) return null;
  return { username, password, sessionSecret };
}

interface SessionPayload {
  u: string;
  exp: number; // epoch seconds
}

export async function createSessionToken(username: string, secret: string): Promise<string> {
  const payload: SessionPayload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

/**
 * Shared guard used by every protected endpoint (api/resources/*.ts) - never
 * trusts anything the frontend claims about itself (master spec: "Never
 * trust the frontend to authorize Admin operations"), only this cookie's
 * signature and expiry.
 */
export async function requireAdminSession(req: Request): Promise<boolean> {
  const env = readAdminEnv();
  if (!env) return false;
  const cookies = parseCookies(req.headers.get('cookie'));
  return verifySessionToken(cookies[SESSION_COOKIE_NAME], env.sessionSecret);
}

export async function verifySessionToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;
  const payloadB64 = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  const expectedSignature = await sign(payloadB64, secret);
  if (!timingSafeEqual(fromBase64Url(signature), fromBase64Url(expectedSignature))) {
    return false;
  }

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64))) as SessionPayload;
    return typeof payload.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
