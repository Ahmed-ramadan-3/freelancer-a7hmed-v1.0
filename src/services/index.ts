/**
 * ⚠️ ADMIN-ONLY, PRESERVED FOR FUTURE USE - not part of the active public
 * resource store. Nothing under src/pages/HomePage.tsx, ResourceDetailsPage,
 * or src/components/resources imports this module; the active site reads
 * src/data/resources.ts directly. This file (and everything it wires
 * together - Supabase, the mock backend, auth) exists only to keep the
 * preserved Admin panel working if VITE_ENABLE_ADMIN=true re-enables it, and
 * lives in a lazy-loaded route chunk so it never reaches the active bundle.
 * See README.md "Admin panel: preserved, disabled".
 */
import { isBackendConfigured } from '@/lib/supabaseClient';
import { mockAuthService } from './mock/mockAuthService';
import { mockFileService } from './mock/mockFileService';
import { supabaseAuthService } from './supabase/supabaseAuthService';
import { supabaseFileService } from './supabase/supabaseFileService';
import type { AuthService, FileService } from './types';

/**
 * THE single branch point between "real backend" and "local demo backend".
 * Every component, hook, and page imports `authService`/`fileService` from
 * here - never directly from ./mock or ./supabase - so swapping or removing
 * the mock later touches exactly one file.
 */
export const authService: AuthService = isBackendConfigured ? supabaseAuthService : mockAuthService;
export const fileService: FileService = isBackendConfigured ? supabaseFileService : mockFileService;

export { isBackendConfigured };
