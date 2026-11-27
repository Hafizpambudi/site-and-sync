/**
 * Slugs become directory names and URL path segments, so they must stay
 * inside this alphabet. Anything else is rejected rather than sanitised,
 * because a silently rewritten slug breaks existing links.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const MAX_SLUG_LENGTH = 64;

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(slug);
}