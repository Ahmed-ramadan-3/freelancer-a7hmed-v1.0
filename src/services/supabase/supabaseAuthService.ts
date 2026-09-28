import { supabase } from '@/lib/supabaseClient';
import type { AdminInvitation, UserRole } from '@/types';
import type { AuthService } from '@/services/types';

/**
 * Real backend implementation. Authorization is NOT decided here in the
 * frontend - this file only reads the `role` that Postgres Row Level
 * Security already trusts (see supabase/schema.sql, table `profiles`).
 * Every write this service makes is re-checked by an RLS policy on the
 * server; if the policy rejects it, Supabase returns an error and the UI
 * surfaces it, so a malicious client bypassing this file entirely still
 * can't do anything the database doesn't allow.
 */

async function fetchRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabase!
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (error || !data) return 'viewer';
  return data.role as UserRole;
}

export const supabaseAuthService: AuthService = {
  async getSession() {
    const { data } = await supabase!.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    const role = await fetchRole(user.id);
    return { userId: user.id, email: user.email ?? '', role };
  },

  onSessionChange(callback) {
    const { data } = supabase!.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        callback(null);
        return;
      }
      const role = await fetchRole(session.user.id);
      callback({ userId: session.user.id, email: session.user.email ?? '', role });
    });
    return () => data.subscription.unsubscribe();
  },

  async signInWithPassword(email, password) {
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw error ?? new Error('Sign-in failed');
    const role = await fetchRole(data.user.id);
    return { userId: data.user.id, email: data.user.email ?? '', role };
  },

  async signOut() {
    await supabase!.auth.signOut();
  },

  async inviteAdmin(email, role) {
    // Sending an actual invitation email requires a privileged (service-role)
    // call, which must run in a server context that can hold that secret -
    // e.g. a Supabase Edge Function - never in this browser bundle. This
    // writes the intent to a table an edge function can watch/process; see
    // README.md "Next Recommended Development" for the function itself.
    const { data, error } = await supabase!
      .from('admin_invitations')
      .insert({ email, role, status: 'pending' })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      email: data.email,
      role: data.role,
      status: data.status,
      invitedBy: data.invited_by,
      createdAt: data.created_at,
    } satisfies AdminInvitation;
  },

  async listInvitations() {
    const { data, error } = await supabase!
      .from('admin_invitations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.status,
      invitedBy: row.invited_by,
      createdAt: row.created_at,
    }));
  },
};
