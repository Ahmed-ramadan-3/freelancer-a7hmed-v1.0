import type { FileResource } from '@/types';

/**
 * Seed data for local demo mode ONLY. This lets a reviewer see a populated
 * library without provisioning Supabase. It is intentionally small and
 * fictional - see src/services/mock/mockFileService.ts for the storage
 * mechanism (browser localStorage, not a real backend).
 */
export const seedFiles: FileResource[] = [
  {
    id: 'seed-1',
    title: { ar: 'أساسيات تصميم واجهات المستخدم', en: 'UI Design Fundamentals' },
    description: {
      ar: 'دورة مصورة تغطي مبادئ التصميم، الشبكات، والألوان للمبتدئين.',
      en: 'A video course covering design principles, grids, and color for beginners.',
    },
    categorySlug: 'courses',
    resourceType: 'video',
    storagePath: 'demo/ui-fundamentals.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 812_000_000,
    version: '1.2',
    isPublic: true,
    isDownloadable: true,
    thumbnailUrl: null,
    createdAt: '2026-08-02T10:00:00.000Z',
    updatedAt: '2026-08-02T10:00:00.000Z',
    createdBy: 'owner-demo',
  },
  {
    id: 'seed-2',
    title: { ar: 'دليل TypeScript الشامل', en: 'The Complete TypeScript Handbook' },
    description: {
      ar: 'كتاب إلكتروني بصيغة PDF يشرح TypeScript من الصفر حتى الاحتراف.',
      en: 'A PDF ebook explaining TypeScript from the basics through advanced patterns.',
    },
    categorySlug: 'pdfs',
    resourceType: 'pdf',
    storagePath: 'demo/typescript-handbook.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 6_400_000,
    version: null,
    isPublic: true,
    isDownloadable: true,
    thumbnailUrl: null,
    createdAt: '2026-07-20T10:00:00.000Z',
    updatedAt: '2026-07-20T10:00:00.000Z',
    createdBy: 'owner-demo',
  },
  {
    id: 'seed-3',
    title: { ar: 'حزمة أيقونات واجهات - 500 أيقونة', en: 'UI Icon Pack - 500 Icons' },
    description: {
      ar: 'أرشيف مضغوط يحتوي على أيقونات SVG قابلة للتعديل لمشاريع الويب والتطبيقات.',
      en: 'A ZIP archive of editable SVG icons for web and app projects.',
    },
    categorySlug: 'utilities',
    resourceType: 'archive',
    storagePath: 'demo/icon-pack.zip',
    mimeType: 'application/zip',
    sizeBytes: 41_200_000,
    version: '3.0',
    isPublic: true,
    isDownloadable: true,
    thumbnailUrl: null,
    createdAt: '2026-06-11T10:00:00.000Z',
    updatedAt: '2026-06-11T10:00:00.000Z',
    createdBy: 'owner-demo',
  },
  {
    id: 'seed-4',
    title: { ar: 'قالب إدارة المشاريع', en: 'Project Management Template' },
    description: {
      ar: 'ملف مستند لتنظيم المهام والمواعيد النهائية لفريق صغير.',
      en: 'A document template for organizing tasks and deadlines for a small team.',
    },
    categorySlug: 'other',
    resourceType: 'document',
    storagePath: 'demo/pm-template.docx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 1_100_000,
    version: null,
    isPublic: true,
    isDownloadable: true,
    thumbnailUrl: null,
    createdAt: '2026-05-04T10:00:00.000Z',
    updatedAt: '2026-05-04T10:00:00.000Z',
    createdBy: 'owner-demo',
  },
];
