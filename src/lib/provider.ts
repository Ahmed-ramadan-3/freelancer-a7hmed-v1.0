import type { ResourceProvider } from '@/types';

/**
 * Small, honest adapter over "a cloud share link" (master spec, "Provider
 * URL Handling"). This file is the ONLY place that knows what a Google
 * Drive or OneDrive URL looks like - nothing else in the app parses a
 * provider URL by hand. It never fetches these URLs (no browser-side
 * request to arbitrary remote hosts just to inspect a file), never turns
 * them into a direct-download proxy, and never invents a capability a
 * provider doesn't actually expose - when a safe transformation isn't
 * possible, functions here return `null` rather than guessing.
 */

const GOOGLE_DRIVE_HOSTS = ['drive.google.com'];
const ONE_DRIVE_HOSTS = ['1drv.ms', 'onedrive.live.com'];
/** Business/education OneDrive share links live on a tenant's SharePoint
 *  subdomain, e.g. contoso-my.sharepoint.com - matched by suffix. */
const ONE_DRIVE_HOST_SUFFIX = '.sharepoint.com';

const DANGEROUS_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:'];

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** HTTPS only, and never one of the schemes that can execute script or
 *  smuggle content in the URL itself. This is checked BEFORE anything else
 *  in this file does string work on a URL. */
export function isSafeExternalUrl(url: string): boolean {
  const trimmed = url.trim();
  if (DANGEROUS_SCHEMES.some((scheme) => trimmed.toLowerCase().startsWith(scheme))) {
    return false;
  }
  const parsed = parseUrl(trimmed);
  return parsed !== null && parsed.protocol === 'https:';
}

export function detectProvider(url: string): ResourceProvider | null {
  if (!isSafeExternalUrl(url)) return null;
  const parsed = parseUrl(url);
  if (!parsed) return null;
  const host = parsed.hostname.toLowerCase();

  if (GOOGLE_DRIVE_HOSTS.includes(host)) return 'google-drive';
  if (ONE_DRIVE_HOSTS.includes(host) || host.endsWith(ONE_DRIVE_HOST_SUFFIX)) return 'one-drive';
  return null;
}

/** Extracts the `<ID>` out of `https://drive.google.com/file/d/<ID>/view...`.
 *  Returns null for anything else (a folder link, the Drive homepage, a
 *  malformed URL) - callers must treat null as "cannot safely derive a
 *  preview URL", never as "assume it works anyway". */
export function extractGoogleDriveFileId(url: string): string | null {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * A provider-hosted preview page, only when the format is safely derivable.
 * Google Drive's `/preview` endpoint is a documented, stable pattern for any
 * file-by-id link and renders images/PDFs/video/many other types with
 * Drive's own viewer and controls. OneDrive share links have no single
 * reliable, documented transformation into an embeddable preview URL across
 * personal and business accounts, so this deliberately returns `null` for
 * OneDrive rather than guessing - the UI falls back to "open on OneDrive in
 * a new tab" instead of a maybe-broken embed (master spec: "do not invent
 * unsupported ... capabilities").
 */
export function getProviderPreviewUrl(
  provider: ResourceProvider,
  externalUrl: string,
): string | null {
  if (provider !== 'google-drive') return null;
  const fileId = extractGoogleDriveFileId(externalUrl);
  return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
}

export function getProviderLabel(provider: ResourceProvider): string {
  // Brand names are proper nouns and stay in Latin script in both
  // languages, consistent with how "Visual Studio Code" is handled
  // elsewhere - see the i18n guidance comment in src/i18n/index.tsx.
  return provider === 'google-drive' ? 'Google Drive' : 'OneDrive';
}

/**
 * Validates a URL end-to-end for the admin wizard: safe scheme, HTTPS, and
 * a recognized provider domain. Returns the detected provider on success so
 * the wizard doesn't have to call detectProvider() a second time, or an
 * i18n error key ready to show the admin.
 */
export function validateResourceUrl(
  url: string,
): { ok: true; provider: ResourceProvider } | { ok: false; errorKey: string } {
  const trimmed = url.trim();
  if (!trimmed) return { ok: false, errorKey: 'wizard.errors.urlRequired' };
  if (!isSafeExternalUrl(trimmed)) return { ok: false, errorKey: 'wizard.errors.urlUnsafe' };
  const provider = detectProvider(trimmed);
  if (!provider) return { ok: false, errorKey: 'wizard.errors.urlUnsupportedProvider' };
  return { ok: true, provider };
}
