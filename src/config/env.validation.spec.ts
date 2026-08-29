import { validate } from './env.validation';

describe('EnvironmentVariables SEMANTIC_CACHE_MIN_SIMILARITY', () => {
  const base = {
    CACHE_ENABLED: 'false',
    RATE_LIMIT_SMART_ENABLED: 'false',
    SEMANTIC_CACHE_ENABLED: 'false',
  };

  it('accepts 0', () => {
    expect(
      validate({ ...base, SEMANTIC_CACHE_MIN_SIMILARITY: '0' })
        .SEMANTIC_CACHE_MIN_SIMILARITY,
    ).toBe(0);
  });

  it('accepts 1', () => {
    expect(
      validate({ ...base, SEMANTIC_CACHE_MIN_SIMILARITY: '1' })
        .SEMANTIC_CACHE_MIN_SIMILARITY,
    ).toBe(1);
  });

  it('accepts 0.9', () => {
    expect(
      validate({ ...base, SEMANTIC_CACHE_MIN_SIMILARITY: '0.9' })
        .SEMANTIC_CACHE_MIN_SIMILARITY,
    ).toBe(0.9);
  });

  it('rejects 1.01', () => {
    expect(() =>
      validate({ ...base, SEMANTIC_CACHE_MIN_SIMILARITY: '1.01' }),
    ).toThrow(/Config validation error/);
  });

  it('rejects 5', () => {
    expect(() =>
      validate({ ...base, SEMANTIC_CACHE_MIN_SIMILARITY: '5' }),
    ).toThrow(/Config validation error/);
  });

  it('rejects CACHE_BACKEND=memory', () => {
    expect(() => validate({ ...base, CACHE_BACKEND: 'memory' })).toThrow(
      /Config validation error/,
    );
  });

  it('rejects CACHE_BACKEND=other', () => {
    expect(() => validate({ ...base, CACHE_BACKEND: 'other' })).toThrow(
      /Config validation error/,
    );
  });
});
