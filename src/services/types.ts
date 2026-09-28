import type {
  AdminInvitation,
  AuthSession,
  FileResource,
  UploadMetadataInput,
  UploadProgressEvent,
  UserRole,
} from '@/types';

/**
 * Backend-agnostic contracts. Every screen depends on THESE interfaces, not
 * on Supabase or the mock directly (master spec, section 3: "modular so the
 * backend can later be replaced ... without rewriting the entire frontend").
 * src/services/index.ts is the single place that decides which
 * implementation satisfies them.
 */

export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  onSessionChange(callback: (session: AuthSession | null) => void): () => void;
  signInWithPassword(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  inviteAdmin(email: string, role: UserRole): Promise<AdminInvitation>;
  listInvitations(): Promise<AdminInvitation[]>;
}

export interface FileService {
  listFiles(params?: { categorySlug?: string; search?: string }): Promise<FileResource[]>;
  getFile(id: string): Promise<FileResource | null>;
  getDownloadUrl(file: FileResource): Promise<string>;
  uploadFile(
    file: File,
    metadata: UploadMetadataInput,
    onProgress?: (event: UploadProgressEvent) => void,
  ): Promise<FileResource>;
  updateFile(id: string, metadata: Partial<UploadMetadataInput>): Promise<FileResource>;
  deleteFile(id: string): Promise<void>;
}
