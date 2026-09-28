/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_NAME: string;
  readonly VITE_SITE_DESCRIPTION_AR: string;
  readonly VITE_SITE_DESCRIPTION_EN: string;
  readonly VITE_SITE_URL: string;
  readonly VITE_DEFAULT_LANGUAGE: string;
  readonly VITE_DEFAULT_THEME: string;
  readonly VITE_MAX_FILE_SIZE_MB: string;
  readonly VITE_MAX_FILES_PER_UPLOAD: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Active-site download countdown, in seconds (1-10). See src/config/download.ts. */
  readonly VITE_DOWNLOAD_PREPARATION_SECONDS: string;
  /** "true" to re-enable the preserved-but-disabled /admin routes. */
  readonly VITE_ENABLE_ADMIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
