import {
  EMBEDDING_PROBE_TIMEOUT_MS,
  GATEWAY_HEALTHCHECK_TIMEOUT_MS,
  SEMANTIC_CACHE_PROJECT_ID,
  canonicalSemanticSchema,
  embeddingProbeTimeoutMs,
  semanticSchemaFtCreateArgs,
} from './semantic-cache.constants';

describe('SEMANTIC_CACHE_PROJECT_ID', () => {
  it('must not contain spaces or colons (index-name segment separator)', () => {
    expect(SEMANTIC_CACHE_PROJECT_ID).toBe('ai-provider-gateway');
    expect(SEMANTIC_CACHE_PROJECT_ID).not.toMatch(/[\s:]/);
  });
});

describe('canonicalSemanticSchema / semanticSchemaFtCreateArgs', () => {
  it('should stay aligned for TAG fields and vector DIM', () => {
    const dim = 1024;
    const canonical = canonicalSemanticSchema(dim);
    const ftArgs = semanticSchemaFtCreateArgs(dim);

    expect(canonical).toContain('modelAlias:TAG:CASESENSITIVE');
    expect(canonical).toContain(`vector:VECTOR:FLAT:FLOAT32:${dim}:COSINE`);
    expect(ftArgs).toEqual(
      expect.arrayContaining([
        'modelAlias',
        'TAG',
        'CASESENSITIVE',
        'DIM',
        String(dim),
        'DISTANCE_METRIC',
        'COSINE',
      ]),
    );
  });

  it('should change when dim changes', () => {
    expect(canonicalSemanticSchema(1024)).not.toBe(
      canonicalSemanticSchema(768),
    );
  });
});

describe('embeddingProbeTimeoutMs', () => {
  it.each([
    [5000, 2000],
    [2500, 2000],
    [2000, 2000],
    [1000, 1000],
    [1, 1],
    [10_000, 2000],
  ] as const)(
    'maps embeddingTimeoutMs %i to probe budget %i',
    (embeddingTimeoutMs, expected) => {
      const budget = embeddingProbeTimeoutMs(embeddingTimeoutMs);

      expect(budget).toBe(expected);
      expect(budget).toBeGreaterThanOrEqual(1);
      expect(budget).toBeLessThan(GATEWAY_HEALTHCHECK_TIMEOUT_MS);
      expect(budget).toBeLessThanOrEqual(EMBEDDING_PROBE_TIMEOUT_MS);
    },
  );
});
