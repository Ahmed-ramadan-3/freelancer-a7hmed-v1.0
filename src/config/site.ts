/**
 * Centralized branding config (master spec, section 1 & 13).
 *
 * Every user-facing mention of the platform's name, description, favicon and
 * default language/theme flows through this one object, which itself reads
 * from environment variables. To rebrand the whole app, edit .env (or the
 * Vercel project's environment variables) - never search-and-replace strings
 * across components.
 */
export type SupportedLanguage = 'ar' | 'en';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface SiteConfig {
  name: string;
  description: Record<SupportedLanguage, string>;
  url: string;
  faviconEmoji: string;
  defaultLanguage: SupportedLanguage;
  supportedLanguages: SupportedLanguage[];
  defaultTheme: ThemePreference;
}

export const siteConfig: SiteConfig = {
  name: import.meta.env.VITE_SITE_NAME || 'Studio Learn',
  description: {
    ar:
      import.meta.env.VITE_SITE_DESCRIPTION_AR ||
      'متجر موارد رقمية صغير: تصفّح، اختر، وحمّل عبر Google Drive أو OneDrive',
    en:
      import.meta.env.VITE_SITE_DESCRIPTION_EN ||
      'A small digital resource store: browse, pick, and download via Google Drive or OneDrive',
  },
  url: import.meta.env.VITE_SITE_URL || 'http://localhost:5173',
  faviconEmoji: '📦',
  defaultLanguage: (import.meta.env.VITE_DEFAULT_LANGUAGE as SupportedLanguage) || 'ar',
  supportedLanguages: ['ar', 'en'],
  defaultTheme: (import.meta.env.VITE_DEFAULT_THEME as ThemePreference) || 'system',
};
