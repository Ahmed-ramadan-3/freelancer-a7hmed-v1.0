import type { Language } from '@/types';

/** Minimal, dependency-free class-name joiner (avoids pulling in `clsx` for
 *  something four lines of code already does). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Locale-aware byte formatting. Arabic-Indic numerals are intentionally
 *  NOT forced here - most Arabic-reading users of technical products expect
 *  Western digits for file sizes/dates, so we pass 'ar-EG' but let
 *  Intl choose standard digits via numberingSystem override. */
export function formatBytes(bytes: number, language: Language): string {
  if (bytes === 0) return language === 'ar' ? '٠ بايت' : '0 B';
  const units =
    language === 'ar'
      ? ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت', 'تيرابايت']
      : ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  const formatted = new Intl.NumberFormat(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value);
  return `${formatted} ${units[exponent]}`;
}

export function formatDate(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso));
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
