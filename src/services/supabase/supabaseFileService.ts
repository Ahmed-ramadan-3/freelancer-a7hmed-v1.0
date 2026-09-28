import { supabase } from '@/lib/supabaseClient';
import type { FileResource, ResourceType } from '@/types';
import type { FileService } from '@/services/types';

const BUCKET = 'resources';

function guessResourceType(mime: string, name: string): ResourceType {
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (/\.(zip|rar|7z)$/i.test(name)) return 'archive';
  if (/\.(doc|docx|ppt|pptx|xls|xlsx)$/i.test(name)) return 'document';
  return 'other';
}

function rowToResource(row: Record<string, unknown>): FileResource {
  return {
    id: row.id as string,
    title: { ar: row.title_ar as string, en: row.title_en as string },
    description: { ar: row.description_ar as string, en: row.description_en as string },
    categorySlug: row.category_slug as string,
    resourceType: row.resource_type as ResourceType,
    storagePath: row.storage_path as string,
    mimeType: row.mime_type as string,
    sizeBytes: row.size_bytes as number,
    version: (row.version as string | null) ?? null,
    isPublic: row.is_public as boolean,
    isDownloadable: row.is_downloadable as boolean,
    thumbnailUrl: (row.thumbnail_url as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: row.created_by as string,
  };
}

export const supabaseFileService: FileService = {
  async listFiles(params) {
    let query = supabase!.from('files').select('*').order('created_at', { ascending: false });
    if (params?.categorySlug) query = query.eq('category_slug', params.categorySlug);
    if (params?.search) {
      // Matches either language's title/description. RLS still filters out
      // anything the current user (anonymous or authenticated) can't see.
      query = query.or(
        `title_ar.ilike.%${params.search}%,title_en.ilike.%${params.search}%,description_ar.ilike.%${params.search}%,description_en.ilike.%${params.search}%`,
      );
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(rowToResource);
  },

  async getFile(id) {
    const { data, error } = await supabase!.from('files').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToResource(data) : null;
  },

  async getDownloadUrl(file) {
    // The `resources` bucket is PRIVATE (see supabase/storage_policies.sql),
    // so every download - public or restricted - goes through a short-lived
    // signed URL rather than a bare public URL. What makes a file "public"
    // is the storage RLS policy allowing signed-URL creation when
    // files.is_public = true; there is no separate public-bucket code path
    // to keep in sync with that rule. If the policy would reject the
    // request (e.g. a private file and an unauthorized caller), Supabase
    // returns an error here instead of silently succeeding.
    const { data, error } = await supabase!.storage
      .from(BUCKET)
      .createSignedUrl(file.storagePath, 60 * 10);
    if (error || !data) throw error ?? new Error('Could not create signed URL');
    return data.signedUrl;
  },

  async uploadFile(file, metadata, onProgress) {
    const { data: sessionData } = await supabase!.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('Not authenticated');

    const storagePath = `${userId}/${crypto.randomUUID()}-${file.name}`;

    // supabase-js v2's storage.upload doesn't expose granular progress on
    // every runtime, so we report start/finish here; swap to the
    // resumable/TUS upload client (already supported by Supabase Storage)
    // if fine-grained progress becomes important for very large files.
    onProgress?.({ loadedBytes: 0, totalBytes: file.size, percent: 0 });
    const { error: uploadError } = await supabase!.storage.from(BUCKET).upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError) throw uploadError;
    onProgress?.({ loadedBytes: file.size, totalBytes: file.size, percent: 100 });

    const { data, error } = await supabase!
      .from('files')
      .insert({
        title_ar: metadata.titleAr,
        title_en: metadata.titleEn,
        description_ar: metadata.descriptionAr,
        description_en: metadata.descriptionEn,
        category_slug: metadata.categorySlug,
        resource_type: guessResourceType(file.type, file.name),
        storage_path: storagePath,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        version: metadata.version ?? null,
        is_public: metadata.isPublic,
        is_downloadable: metadata.isDownloadable,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToResource(data);
  },

  async updateFile(id, metadata) {
    const patch: Record<string, unknown> = {};
    if (metadata.titleAr !== undefined) patch.title_ar = metadata.titleAr;
    if (metadata.titleEn !== undefined) patch.title_en = metadata.titleEn;
    if (metadata.descriptionAr !== undefined) patch.description_ar = metadata.descriptionAr;
    if (metadata.descriptionEn !== undefined) patch.description_en = metadata.descriptionEn;
    if (metadata.categorySlug !== undefined) patch.category_slug = metadata.categorySlug;
    if (metadata.isPublic !== undefined) patch.is_public = metadata.isPublic;
    if (metadata.isDownloadable !== undefined) patch.is_downloadable = metadata.isDownloadable;
    if (metadata.version !== undefined) patch.version = metadata.version;

    const { data, error } = await supabase!
      .from('files')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToResource(data);
  },

  async deleteFile(id) {
    const { data: file } = await supabase!.from('files').select('storage_path').eq('id', id).single();
    // RLS on `files` DELETE (owner/admin only, see schema.sql) protects the
    // row; we also remove the underlying object so storage doesn't leak.
    const { error } = await supabase!.from('files').delete().eq('id', id);
    if (error) throw error;
    if (file?.storage_path) {
      await supabase!.storage.from(BUCKET).remove([file.storage_path]);
    }
  },
};
