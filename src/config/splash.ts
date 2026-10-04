/**
 * The branding splash is a deliberate, bounded presentation moment - not a
 * loading spinner waiting on real work (master spec, "Loading / Splash
 * Screen": minimum 5s, maximum 10s, default 5s, never exceed 10s, and
 * "use a real readiness gate plus a bounded presentation delay; do not
 * create an indefinite fake loading state"). App.tsx waits for both real
 * app readiness AND this timer before revealing the site.
 */
const MIN_SECONDS = 5;
const MAX_SECONDS = 10;
const DEFAULT_SECONDS = 5;

function readConfiguredSeconds(): number {
  const raw = Number(import.meta.env.VITE_SPLASH_DURATION_SECONDS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_SECONDS;
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(raw)));
}

export const SPLASH_DURATION_SECONDS = readConfiguredSeconds();
