import {
  getRedisConsumers,
  isRedisRequired,
  isRedisRequiredFromEnv,
} from './should-include-redis-stack';

describe('should-include-redis-stack', () => {
  describe('isRedisRequiredFromEnv', () => {
    it('should be false when cache noop and rate limit disabled', () => {
      expect(
        isRedisRequiredFromEnv({
          CACHE_ENABLED: 'false',
          CACHE_BACKEND: 'redis',
          RATE_LIMIT_SMART_ENABLED: 'false',
        }),
      ).toBe(false);
    });
    it('should be true when only rate limit enabled', () => {
      expect(
        isRedisRequiredFromEnv({
          CACHE_ENABLED: 'false',
          CACHE_BACKEND: 'noop',
          RATE_LIMIT_SMART_ENABLED: 'true',
        }),
      ).toBe(true);
    });
    it('should be true when only cache redis enabled', () => {
      expect(
        isRedisRequiredFromEnv({
          CACHE_ENABLED: 'true',
          CACHE_BACKEND: 'redis',
          RATE_LIMIT_SMART_ENABLED: 'false',
        }),
      ).toBe(true);
    });
    it('should ignore CACHE_BACKEND=redis when CACHE_ENABLED=false', () => {
      expect(
        isRedisRequiredFromEnv({
          CACHE_ENABLED: 'false',
          CACHE_BACKEND: 'redis',
          RATE_LIMIT_SMART_ENABLED: 'false',
        }),
      ).toBe(false);
    });
  });
  describe('getRedisConsumers', () => {
    it('should return both consumers when cache redis and rate limit enabled', () => {
      expect(
        getRedisConsumers({
          cache: { enabled: true, backend: 'redis' },
          rateLimitSmartEnabled: true,
        }),
      ).toEqual(['cache', 'rate-limit']);
    });
  });
  describe('isRedisRequired', () => {
    it('should be false for empty snapshot', () => {
      expect(isRedisRequired({})).toBe(false);
    });
  });
});
