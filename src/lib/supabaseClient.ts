/**
 * ⚠️ ADMIN-ONLY, PRESERVED FOR FUTURE USE. See src/services/index.ts for the
 * full explanation - the active public resource store never imports this
 * file, so @supabase/supabase-js only ends up in the lazy-loaded /admin
 * chunk, not the main bundle a visitor to the store downloads.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * `supabase` is `null` whenever the owner hasn't configured a backend yet.
 * src/services/index.ts checks this to decide whether to serve real data
 * (Supabase) or the local mock (see src/services/mock) - this is the ONLY
 * branch point for that decision, so no component ever needs to know which
 * backend is active.
 *
 * Only the public anon key is ever read here. It is safe in the browser
 * bundle because every table it can touch is protected by Row Level
 * Security (see supabase/schema.sql) - the anon key alone grants nothing.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const isBackendConfigured = supabase !== null;
