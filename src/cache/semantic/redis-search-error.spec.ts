import {
  isRedisSearchIndexAlreadyExistsError,
  isRedisSearchMissingIndexError,
  isRedisSearchModuleMissingError,
  redisSearchErrorMessage,
} from './redis-search-error';

describe('redisSearchErrorMessage', () => {
  it('reads Error.message', () => {
    expect(redisSearchErrorMessage(new Error('Index already exists'))).toBe(
      'Index already exists',
    );
  });

  it('stringifies non-Error values', () => {
    expect(redisSearchErrorMessage('plain')).toBe('plain');
  });
});

describe('isRedisSearchIndexAlreadyExistsError', () => {
  it('matches already exists', () => {
    expect(
      isRedisSearchIndexAlreadyExistsError(new Error('Index already exists')),
    ).toBe(true);
  });

  it('rejects other messages', () => {
    expect(
      isRedisSearchIndexAlreadyExistsError(new Error('Unknown Index name')),
    ).toBe(false);
  });
});

describe('isRedisSearchMissingIndexError', () => {
  it('matches unknown index and no such index', () => {
    expect(
      isRedisSearchMissingIndexError(new Error('Unknown Index name')),
    ).toBe(true);
    expect(isRedisSearchMissingIndexError(new Error('no such index'))).toBe(
      true,
    );
  });
});

describe('isRedisSearchModuleMissingError', () => {
  it('matches unknown command', () => {
    expect(
      isRedisSearchModuleMissingError(
        new Error("ERR unknown command 'FT.INFO'"),
      ),
    ).toBe(true);
  });
});
