import { EmbeddingCircuitBreaker } from './embedding-circuit-breaker';

describe('EmbeddingCircuitBreaker', () => {
  it('opens after N failures (G2: += not ==)', () => {
    const c = new EmbeddingCircuitBreaker(3);
    c.recordEmbedFailure();
    c.recordEmbedFailure();
    expect(c.isCircuitOpen()).toBe(false);
    c.recordEmbedFailure();
    expect(c.isCircuitOpen()).toBe(true);
  });

  it('should reset failures on success', () => {
    const c = new EmbeddingCircuitBreaker(3);
    c.recordEmbedFailure();
    c.recordEmbedFailure();
    c.recordEmbedSuccess();
    c.recordEmbedFailure();
    expect(c.isCircuitOpen()).toBe(false);
  });
});
