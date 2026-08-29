import {
  EMBEDDING_CIRCUIT_OPEN_AFTER,
  EMBEDDING_CIRCUIT_COOLDOWN_MS,
} from './semantic-cache.constants';
import { EmbeddingCircuitBreaker } from './embedding-circuit-breaker';

describe('EmbeddingCircuitBreaker', () => {
  it('opens after N failures (G2: += not ==)', () => {
    const c = new EmbeddingCircuitBreaker();
    for (let i = 0; i < EMBEDDING_CIRCUIT_OPEN_AFTER - 1; i += 1) {
      c.recordEmbedFailure();
    }
    expect(c.isCircuitOpen()).toBe(false);
    c.recordEmbedFailure();
    expect(c.isCircuitOpen()).toBe(true);
  });

  it('should reset failures on success', () => {
    const c = new EmbeddingCircuitBreaker();
    c.recordEmbedFailure();
    c.recordEmbedFailure();
    c.recordEmbedSuccess();
    c.recordEmbedFailure();
    expect(c.isCircuitOpen()).toBe(false);
  });

  describe('half-open recovery', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('allows a single trial after cooldown (half-open)', () => {
      const c = new EmbeddingCircuitBreaker(
        EMBEDDING_CIRCUIT_OPEN_AFTER,
        1_000,
      );
      for (let i = 0; i < EMBEDDING_CIRCUIT_OPEN_AFTER; i += 1) {
        c.recordEmbedFailure();
      }
      expect(c.shouldSkipEmbed()).toBe(true);
      jest.advanceTimersByTime(1_000);
      expect(c.shouldSkipEmbed()).toBe(false); // trial
      expect(c.shouldSkipEmbed()).toBe(true); // drugi request czeka na wynik trialu
    });

    it('should close after success on half-open trial', () => {
      const c = new EmbeddingCircuitBreaker(
        EMBEDDING_CIRCUIT_OPEN_AFTER,
        1_000,
      );
      for (let i = 0; i < EMBEDDING_CIRCUIT_OPEN_AFTER; i += 1) {
        c.recordEmbedFailure();
      }
      jest.advanceTimersByTime(1_000);
      expect(c.shouldSkipEmbed()).toBe(false);
      c.recordEmbedSuccess();
      expect(c.isCircuitOpen()).toBe(false);
      expect(c.shouldSkipEmbed()).toBe(false);
    });

    it('uses the named production cooldown by default', () => {
      expect(EMBEDDING_CIRCUIT_COOLDOWN_MS).toBe(30_000);
      const c = new EmbeddingCircuitBreaker();
      for (let i = 0; i < EMBEDDING_CIRCUIT_OPEN_AFTER; i += 1) {
        c.recordEmbedFailure();
      }
      expect(c.shouldSkipEmbed()).toBe(true);
      jest.advanceTimersByTime(EMBEDDING_CIRCUIT_COOLDOWN_MS - 1);
      expect(c.shouldSkipEmbed()).toBe(true);
      jest.advanceTimersByTime(1);
      expect(c.shouldSkipEmbed()).toBe(false);
    });
  });
});
