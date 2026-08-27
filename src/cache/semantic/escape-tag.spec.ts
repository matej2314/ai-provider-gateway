import {
  escapeRedisSearchTag,
  isRedisSearchTagSafeId,
  REDIS_SEARCH_TAG_ID_FORBIDDEN,
} from './escape-tag';

describe('escapeRedisSearchTag', () => {
  it('escapes hyphen for query syntax', () => {
    expect(escapeRedisSearchTag('Team-A')).toBe('Team\\-A');
  });

  it('escapes comma so it is not a TAG separator in queries', () => {
    expect(escapeRedisSearchTag('a,b')).toBe('a\\,b');
  });

  it('escapes braces and spaces', () => {
    expect(escapeRedisSearchTag('x{y} z')).toBe('x\\{y\\}\\ z');
  });

  it('leaves plain alphanumeric unchanged', () => {
    expect(escapeRedisSearchTag('webapp')).toBe('webapp');
  });
});

describe('isRedisSearchTagSafeId', () => {
  it('allows hyphenated client / model ids', () => {
    expect(isRedisSearchTagSafeId('Team-A')).toBe(true);
    expect(isRedisSearchTagSafeId('chat-default')).toBe(true);
    expect(isRedisSearchTagSafeId('ide-plugin')).toBe(true);
  });

  it('rejects comma (TAG separator)', () => {
    expect(isRedisSearchTagSafeId('a,b')).toBe(false);
    expect(REDIS_SEARCH_TAG_ID_FORBIDDEN.test('a,b')).toBe(true);
  });

  it('rejects other TAG specials but not hyphen', () => {
    expect(isRedisSearchTagSafeId('a.b')).toBe(false);
    expect(isRedisSearchTagSafeId('a b')).toBe(false);
    expect(isRedisSearchTagSafeId('a:b')).toBe(false);
    expect(isRedisSearchTagSafeId('a{b}')).toBe(false);
    expect(isRedisSearchTagSafeId('')).toBe(false);
  });

  it('is case-preserving (case differences are distinct ids)', () => {
    expect(isRedisSearchTagSafeId('Team-A')).toBe(true);
    expect(isRedisSearchTagSafeId('team-a')).toBe(true);
    expect(escapeRedisSearchTag('Team-A')).not.toBe(
      escapeRedisSearchTag('team-a'),
    );
  });
});
