/**
 * Shared field-length limits and validators for the admin "إضافة الملفات"
 * wizard (master spec, "Security Hardening": "validate field lengths - no
 * unbounded text saved to the catalog"). Kept in one small file rather than
 * scattered magic numbers across the four wizard steps, so a limit only
 * ever needs changing in one place.
 */

export const FIELD_LIMITS = {
  title: 120,
  description: 600,
  fileType: 20,
  fileSize: 20,
  platform: 40,
  tag: 30,
  maxTags: 8,
  url: 2048,
} as const;

export interface FieldValidation {
  ok: boolean;
  errorKey: string | null;
  errorParams?: Record<string, string | number>;
}

/** Required, non-empty (after trimming) and within `max` characters. */
export function validateRequiredText(
  value: string,
  max: number,
  requiredErrorKey: string,
): FieldValidation {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, errorKey: requiredErrorKey };
  if (trimmed.length > max) {
    return { ok: false, errorKey: 'wizard.errors.tooLong', errorParams: { max } };
  }
  return { ok: true, errorKey: null };
}

/** Optional field: empty is fine, but if present it still respects `max`. */
export function validateOptionalText(value: string, max: number): FieldValidation {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, errorKey: null };
  if (trimmed.length > max) {
    return { ok: false, errorKey: 'wizard.errors.tooLong', errorParams: { max } };
  }
  return { ok: true, errorKey: null };
}

/** Splits a comma-separated tags input into trimmed, de-duplicated,
 *  length-bounded tags, silently dropping anything past `maxTags` or longer
 *  than `tag` characters rather than rejecting the whole field - tags are a
 *  convenience, not a field an admin should have to fight with. */
export function parseTagsInput(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const candidate of raw.split(',')) {
    const tag = candidate.trim().slice(0, FIELD_LIMITS.tag);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= FIELD_LIMITS.maxTags) break;
  }
  return tags;
}
