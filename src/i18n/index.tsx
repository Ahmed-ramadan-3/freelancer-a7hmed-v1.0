import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Language } from '@/types';
import { siteConfig } from '@/config/site';
import ar from './locales/ar.json';
import en from './locales/en.json';

/**
 * Small, purpose-built i18n layer instead of a general-purpose library:
 * the app only ever needs two locales and flat "namespace.key" lookups with
 * a handful of {placeholder} interpolations, so ~60 lines here replaces a
 * dependency that would otherwise ship a much larger runtime for the same
 * result (master spec, section 5: "every dependency must have a reason").
 */

type Dictionary = typeof ar;
const dictionaries: Record<Language, Dictionary> = { ar, en };

const STORAGE_KEY = 'app-language';

function resolveKey(dict: Dictionary, key: string): string | undefined {
  return key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], dict) as
    | string
    | undefined;
}

interface I18nContextValue {
  language: Language;
  direction: 'rtl' | 'ltr';
  setLanguage: (language: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readInitialLanguage(): Language {
  if (typeof window === 'undefined') return siteConfig.defaultLanguage;
  const saved = window.localStorage.getItem(STORAGE_KEY) as Language | null;
  return saved && siteConfig.supportedLanguages.includes(saved) ? saved : siteConfig.defaultLanguage;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readInitialLanguage);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = dictionaries[language];
      let value = resolveKey(dict, key) ?? resolveKey(dictionaries.en, key) ?? key;
      if (vars) {
        for (const [name, replacement] of Object.entries(vars)) {
          value = value.replace(`{${name}}`, String(replacement));
        }
      }
      return value;
    },
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, direction: language === 'ar' ? 'rtl' : 'ltr', setLanguage, t }),
    [language, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within an I18nProvider');
  return ctx;
}
