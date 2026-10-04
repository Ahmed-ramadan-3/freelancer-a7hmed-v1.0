import type { AccessMode, CatalogResourceType } from '@/types';

/**
 * The wizard's own in-progress shape - looser than `Resource` (plain string
 * inputs, a raw `tagsInput` the admin is still typing) so each step can bind
 * directly to form fields. `ResourceWizard` is the only place this is
 * converted into a real `ResourceInput` for resourceStore.ts.
 */
export interface WizardDraft {
  resourceType: CatalogResourceType;
  externalUrl: string;
  title: string;
  description: string;
  category: string;
  fileType: string;
  fileSize: string;
  platform: string;
  tagsInput: string;
  featured: boolean;
  accessMode: AccessMode;
}
