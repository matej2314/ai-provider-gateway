import {
  EMBEDDING_PROBE_TIMEOUT_MS,
  GATEWAY_HEALTHCHECK_TIMEOUT_MS,
  embeddingProbeTimeoutMs,
} from './semantic-cache.constants';

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
