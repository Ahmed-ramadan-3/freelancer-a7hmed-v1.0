/**
 * The Admin panel and everything it depends on (Supabase client, auth,
 * file-management UI) is preserved in the repository but OFF by default in
 * the active product (master spec: "Admin panel - CRITICAL"). Setting
 * VITE_ENABLE_ADMIN=true re-enables the /admin routes for local development
 * or a future relaunch; it stays unset (or "false") in the deployed active
 * site. src/routes/router.tsx is the only place that reads this flag.
 */
export const isAdminEnabled = import.meta.env.VITE_ENABLE_ADMIN === 'true';
