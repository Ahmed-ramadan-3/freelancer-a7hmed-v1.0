/**
 * ⚠️ NEW-ADMIN-CONSOLE-ONLY. Mounted only inside the lazy-loaded, default
 * (VITE_ENABLE_ADMIN unset/false) admin route branch in src/routes/
 * router.tsx - the legacy Supabase-Auth-backed panel (VITE_ENABLE_ADMIN=
 * true) uses its own, separate src/context/AuthContext.tsx and never
 * touches this file. The two are intentionally independent: this one knows
 * nothing about Supabase, roles, or profiles - just "is there a valid
 * admin_session cookie right now" (see api/admin/session.ts).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { adminLogin, adminLogout, fetchAdminSession, type AdminLoginResult } from '@/lib/adminConsoleClient';

interface AdminSessionContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  /** False only when the server-only ADMIN_USERNAME/ADMIN_PASSWORD/
   *  ADMIN_SESSION_SECRET env vars aren't set at all - lets the login page
   *  say so plainly instead of just rejecting every password silently. */
  isConfigured: boolean;
  login: (username: string, password: string) => Promise<AdminLoginResult>;
  logout: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchAdminSession().then(({ authenticated, configured }) => {
      if (!active) return;
      setIsAuthenticated(authenticated);
      setIsConfigured(configured);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await adminLogin(username, password);
    if (result.ok) setIsAuthenticated(true);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await adminLogout();
    setIsAuthenticated(false);
  }, []);

  const value = useMemo<AdminSessionContextValue>(
    () => ({ isAuthenticated, isLoading, isConfigured, login, logout }),
    [isAuthenticated, isLoading, isConfigured, login, logout],
  );

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSessionContextValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error('useAdminSession must be used within an AdminSessionProvider');
  return ctx;
}
