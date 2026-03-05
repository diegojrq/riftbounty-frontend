/** Slug: 3–30 chars, only a-z, 0-9, _. Used for public profile URL (e.g. /app/:slug). */
export const SLUG_REGEX = /^[a-z0-9_]{3,30}$/;

export function normalizeSlugInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function validateSlug(value: string): string | null {
  const normalized = normalizeSlugInput(value.trim());
  if (normalized.length < 3) return "Slug must be 3–30 characters (letters, numbers, underscores).";
  if (normalized.length > 30) return "Slug must be 3–30 characters.";
  if (!SLUG_REGEX.test(normalized)) return "Slug can only use letters (a-z), numbers, and underscores.";
  return null;
}
