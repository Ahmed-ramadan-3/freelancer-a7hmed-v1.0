import type { Resource } from '@/types';

/**
 * THE single source of truth for the public catalog (master spec, "Resource
 * Data"). No component ever hard-codes a title, size, or Google Drive URL -
 * everything reads from this array. Adding a resource later means adding
 * one object here (with its own real Google Drive share URL); nothing else
 * needs to change.
 *
 * Each `googleDriveUrl` MUST be the exact "Anyone with the link can view"
 * sharing URL for that specific file (the `/file/d/<id>/view` form) - never
 * a folder link, never the Drive homepage, and never rewritten into a
 * direct-download or `uc?export=download` URL. The site always opens this
 * exact page; Google Drive's own Download button does the rest.
 */
export const resources: Resource[] = [
  {
    id: 'vscode-windows-7',
    title: 'Visual Studio Code for Windows 7',
    description:
      'Visual Studio Code for Windows 7 with useful extensions and an installation/tutorial video.',
    category: 'programming',
    fileType: 'ZIP',
    fileSize: '519 MB',
    platform: 'Windows 7',
    icon: '/icons/resources/vscode-windows-7.svg',
    googleDriveUrl:
      'https://drive.google.com/file/d/1p315_5HB424-Fxhqy4ZGd3RVr_ulqgox/view?usp=sharing',
    tags: ['Visual Studio Code', 'Windows 7', 'Programming', 'ZIP'],
    featured: true,
  },
];

export function getResourceById(id: string): Resource | undefined {
  return resources.find((resource) => resource.id === id);
}

export function getFeaturedResources(): Resource[] {
  return resources.filter((resource) => resource.featured);
}

export function getRelatedResources(resource: Resource, limit = 3): Resource[] {
  return resources
    .filter((item) => item.id !== resource.id && item.category === resource.category)
    .slice(0, limit);
}
