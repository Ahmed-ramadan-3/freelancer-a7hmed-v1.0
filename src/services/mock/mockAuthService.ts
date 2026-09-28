import type { AdminInvitation, AuthSession, UserRole } from '@/types';
import type { AuthService } from '@/services/types';

/**
 * ⚠️ DEMO-ONLY IMPLEMENTATION - NOT SECURE, NOT PRODUCTION CODE.
 *
 * This exists purely so the UI can be reviewed without a Supabase project.
 * "Authentication" here is a localStorage flag with no password check,
 * anyone can open devtools and grant themselves the owner role, and nothing
 * here should ever be mistaken for real access control. Real authorization
 * is enforced server-side by Postgres Row Level Security once Supabase is
 * connected (see supabase/schema.sql) - see src/services/supabase for the
 * real implementation and README.md for how to switch to it.
 */

const SESSION_KEY = 'demo-auth-session';
const INVITES_KEY = 'demo-admin-invitations';
const listeners = new Set<(session: AuthSession | null) => void>();

function readSession(): AuthSession | null {
  const raw = window.localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as AuthSession) : null;
}

function writeSession(session: AuthSession | null) {
  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_KEY);
  listeners.forEach((cb) => cb(session));
}

export const mockAuthService: AuthService = {
  async getSession() {
    return readSession();
  },

  onSessionChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  async signInWithPassword(email) {
    // Demo rule: an address containing "owner" signs in as the owner role,
    // anything else signs in as admin - only to make the two permission
    // tiers easy to try out. See the disclaimer above.
    const role: UserRole = email.toLowerCase().includes('owner') ? 'owner' : 'admin';
    const session: AuthSession = { userId: `demo-${role}`, email, role };
    writeSession(session);
    return session;
  },

  async signOut() {
    writeSession(null);
  },

  async inviteAdmin(email, role) {
    const invites = JSON.parse(window.localStorage.getItem(INVITES_KEY) ?? '[]') as AdminInvitation[];
    const invite: AdminInvitation = {
      id: crypto.randomUUID(),
      email,
      role,
      status: 'pending',
      invitedBy: readSession()?.userId ?? 'unknown',
      createdAt: new Date().toISOString(),
    };
    invites.unshift(invite);
    window.localStorage.setItem(INVITES_KEY, JSON.stringify(invites));
    return invite;
  },

  async listInvitations() {
    return JSON.parse(window.localStorage.getItem(INVITES_KEY) ?? '[]') as AdminInvitation[];
  },
};
