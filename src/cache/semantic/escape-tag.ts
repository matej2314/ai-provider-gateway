/**
 * RediSearch TAG special characters that must be escaped in query syntax.
 * Hyphen is included for queries but remains allowed in configured IDs
 * (e.g. `Team-A`, `chat-default`) — see {@link REDIS_SEARCH_TAG_ID_FORBIDDEN}.
 */
export const REDIS_SEARCH_TAG_SPECIAL_CHARS =
  /([,.<>{}[\]"':;!@#$%^&*()\-+=~|/\\ ])/g;

/**
 * Characters forbidden in YAML/CLI `clients` / `models` keys used as semantic
 * TAG partition fields. Hyphen is allowed (escaped only in KNN query strings).
 * Comma is rejected because it is the default TAG separator (S17).
 */
export const REDIS_SEARCH_TAG_ID_FORBIDDEN =
  /[,.<>{}[\]"':;!@#$%^&*()+=~|/\\ ]/;

export function escapeRedisSearchTag(value: string): string {
  return value.replace(REDIS_SEARCH_TAG_SPECIAL_CHARS, '\\$1');
}

export function isRedisSearchTagSafeId(value: string): boolean {
  return value.length > 0 && !REDIS_SEARCH_TAG_ID_FORBIDDEN.test(value);
}

export const REDIS_SEARCH_TAG_ID_MESSAGE =
  'must not contain RediSearch TAG special characters (comma, braces, spaces, punctuation other than hyphen)';
