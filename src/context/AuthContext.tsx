/**
 * ⚠️ ADMIN-ONLY. <AuthProvider> is mounted once, only inside the
 * lazy-loaded, VITE_ENABLE_ADMIN-gated /admin subtree (see
 * src/routes/router.tsx, AdminGate) - the public resource store has no
 * concept of a signed-in user and never renders this provider.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthSession } from '@/types';
import { authService } from '@/services';

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** True for both "owner" and "admin" - the two roles that may manage
   *  content (master spec, section 26-28). */
  isStaff: boolean;
  isOwner: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authService.getSession().then((s) => {
      if (active) {
        setSession(s);
        setIsLoading(false);
      }
    });
    const unsubscribe = authService.onSessionChange((s) => setSession(s));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      signIn: async (email, password) => {
        const s = await authService.signInWithPassword(email, password);
        setSession(s);
      },
      signOut: async () => {
        await authService.signOut();
        setSession(null);
      },
      isStaff: session?.role === 'owner' || session?.role === 'admin',
      isOwner: session?.role === 'owner',
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
