/**
 * Centralized timing for the "preparing your download" experience (master
 * spec: "keep the timing centralized in one configuration value"). Change
 * this one number - or set VITE_DOWNLOAD_PREPARATION_SECONDS - and every
 * download flow across the site updates together.
 */
const MIN_SECONDS = 1;
const MAX_SECONDS = 10;
const DEFAULT_SECONDS = 5;

function readConfiguredSeconds(): number {
  const raw = Number(import.meta.env.VITE_DOWNLOAD_PREPARATION_SECONDS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_SECONDS;
  // Clamped, not silently ignored, so a typo'd env value can't turn into an
  // unintentionally long fake wait (master spec: "no unnecessarily long
  // fake wait", "allow configuration up to 10 seconds").
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(raw)));
}

export const DOWNLOAD_PREPARATION_SECONDS = readConfiguredSeconds();
