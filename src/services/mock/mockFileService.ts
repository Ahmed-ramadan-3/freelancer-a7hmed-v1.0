import type { FileResource, ResourceType } from '@/types';
import type { FileService } from '@/services/types';
import { seedFiles } from './mockData';

/**
 * ⚠️ DEMO-ONLY IMPLEMENTATION - see mockAuthService.ts for the same
 * disclaimer. Files "uploaded" here are just object URLs held in memory /
 * localStorage metadata; nothing is actually persisted to durable storage,
 * and reloading in a new tab won't share state across tabs. This stands in
 * for src/services/supabase/supabaseFileService.ts, which uses Supabase
 * Storage + Postgres for real.
 */

const FILES_KEY = 'demo-files';

function readFiles(): FileResource[] {
  const raw = window.localStorage.getItem(FILES_KEY);
  if (raw) return JSON.parse(raw) as FileResource[];
  window.localStorage.setItem(FILES_KEY, JSON.stringify(seedFiles));
  return seedFiles;
}

function writeFiles(files: FileResource[]) {
  window.localStorage.setItem(FILES_KEY, JSON.stringify(files));
}

function guessResourceType(mime: string, name: string): ResourceType {
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (/\.(zip|rar|7z)$/i.test(name)) return 'archive';
  if (/\.(doc|docx|ppt|pptx|xls|xlsx)$/i.test(name)) return 'document';
  return 'other';
}

export const mockFileService: FileService = {
  async listFiles(params) {
    let files = readFiles();
    if (params?.categorySlug) {
      files = files.filter((f) => f.categorySlug === params.categorySlug);
    }
    if (params?.search) {
      const q = params.search.trim().toLowerCase();
      files = files.filter(
        (f) =>
          f.title.ar.toLowerCase().includes(q) ||
          f.title.en.toLowerCase().includes(q) ||
          f.description.ar.toLowerCase().includes(q) ||
          f.description.en.toLowerCase().includes(q),
      );
    }
    return [...files].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async getFile(id) {
    return readFiles().find((f) => f.id === id) ?? null;
  },

  async getDownloadUrl(file) {
    // A real backend would mint a short-lived signed URL here (see
    // supabaseFileService.ts). In demo mode there is no real object to
    // download, so we return a data URL that produces a tiny placeholder
    // text file - enough to exercise the download UX end-to-end.
    const blob = new Blob(
      [`This is a placeholder for "${file.title.en}" in local demo mode.`],
      { type: 'text/plain' },
    );
    return URL.createObjectURL(blob);
  },

  async uploadFile(file, metadata, onProgress) {
    // Simulate realistic multi-tick progress instead of jumping 0 -> 100,
    // so the upload UI (progress bar, percentage) can be verified visually.
    const total = file.size;
    for (let loaded = 0; loaded <= total; loaded += Math.max(total / 12, 50_000)) {
      const clamped = Math.min(loaded, total);
      onProgress?.({ loadedBytes: clamped, totalBytes: total, percent: (clamped / total) * 100 });
      await new Promise((resolve) => setTimeout(resolve, 60));
    }

    const now = new Date().toISOString();
    const newFile: FileResource = {
      id: crypto.randomUUID(),
      title: { ar: metadata.titleAr, en: metadata.titleEn },
      description: { ar: metadata.descriptionAr, en: metadata.descriptionEn },
      categorySlug: metadata.categorySlug,
      resourceType: guessResourceType(file.type, file.name),
      storagePath: `demo/${file.name}`,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      version: metadata.version ?? null,
      isPublic: metadata.isPublic,
      isDownloadable: metadata.isDownloadable,
      thumbnailUrl: null,
      createdAt: now,
      updatedAt: now,
      createdBy: 'demo-admin',
    };

    const files = readFiles();
    files.unshift(newFile);
    writeFiles(files);
    return newFile;
  },

  async updateFile(id, metadata) {
    const files = readFiles();
    const index = files.findIndex((f) => f.id === id);
    if (index === -1) throw new Error('File not found');
    const existing = files[index];
    const updated: FileResource = {
      ...existing,
      title: {
        ar: metadata.titleAr ?? existing.title.ar,
        en: metadata.titleEn ?? existing.title.en,
      },
      description: {
        ar: metadata.descriptionAr ?? existing.description.ar,
        en: metadata.descriptionEn ?? existing.description.en,
      },
      categorySlug: metadata.categorySlug ?? existing.categorySlug,
      isPublic: metadata.isPublic ?? existing.isPublic,
      isDownloadable: metadata.isDownloadable ?? existing.isDownloadable,
      version: metadata.version ?? existing.version,
      updatedAt: new Date().toISOString(),
    };
    files[index] = updated;
    writeFiles(files);
    return updated;
  },

  async deleteFile(id) {
    writeFiles(readFiles().filter((f) => f.id !== id));
  },
};
