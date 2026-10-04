import type { Resource } from '@/types';
import { normalizeResource } from '@/lib/resourceModel';

/**
 * The built-in, build-time catalog seed (master spec, "Resource Data
 * Model"). This is ONE of the two sources src/data/resourceStore.ts merges
 * together - the other being any resources the admin adds at runtime
 * through the "إضافة الملفات" wizard, which are stored in the visitor's own
 * browser (see resourceStore.ts for why, and its limits).
 *
 * `externalUrl` MUST be the exact share-page URL for the file (Google
 * Drive's `/file/d/<id>/view` form, or a OneDrive share link) - never a
 * folder link, never a provider homepage, and never rewritten into a
 * direct-download form. The site always opens this exact page; the
 * provider's own Download button does the rest.
 */
const seedResources: Resource[] = [
  normalizeResource({
    id: 'vscode-windows-7',
    title: 'Visual Studio Code for Windows 7',
    description:
      'Visual Studio Code for Windows 7 with useful extensions and an installation/tutorial video.',
    category: 'programming',
    resourceType: 'archive',
    fileType: 'ZIP',
    fileSize: '519 MB',
    platform: 'Windows 7',
    icon: '/icons/resources/vscode-windows-7.svg',
    provider: 'google-drive',
    externalUrl:
      'https://drive.google.com/file/d/1p315_5HB424-Fxhqy4ZGd3RVr_ulqgox/view?usp=sharing',
    accessMode: 'download-only',
    previewMode: 'none',
    tags: ['Visual Studio Code', 'Windows 7', 'Programming', 'ZIP'],
    featured: true,
  }),
];

export { seedResources };
