/**
 * Admin-only upload limits, used by the preserved-but-disabled Admin upload
 * screen (src/pages/admin/AdminUploadPage.tsx). The active public resource
 * store never uploads anything - its one real file lives on Google Drive -
 * so this config has no effect unless VITE_ENABLE_ADMIN=true. These are
 * CLIENT-SIDE conveniences only (fast feedback before a large file even
 * starts uploading); if the Admin+Supabase path is reactivated for real
 * use, the real limit must also be enforced server-side (Postgres check
 * constraints / storage policies / an edge function).
 */
export const uploadConfig = {
  maxFileSizeMB: Number(import.meta.env.VITE_MAX_FILE_SIZE_MB) || 500,
  maxFilesPerUpload: Number(import.meta.env.VITE_MAX_FILES_PER_UPLOAD) || 1,
  allowedExtensions: [
    '.zip',
    '.rar',
    '.7z',
    '.pdf',
    '.epub',
    '.mp4',
    '.mkv',
    '.mov',
    '.doc',
    '.docx',
    '.ppt',
    '.pptx',
    '.xls',
    '.xlsx',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
  ],
} as const;

export function isExtensionAllowed(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return (uploadConfig.allowedExtensions as readonly string[]).includes(ext);
}

export function isSizeAllowed(bytes: number): boolean {
  return bytes <= uploadConfig.maxFileSizeMB * 1024 * 1024;
}
