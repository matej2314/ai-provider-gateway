import type { SmartRateLimiterService } from '../../../src/rate-limit/smart-rate-limiter.service';

export function createE2eRateLimiterBlocked(): Partial<SmartRateLimiterService> {
  const blocked = {
    allowed: false,
    remaining: 0,
    resetAt: new Date(),
    reason: 'Rate limit exceeded for gateway key.',
  };

  return {
    checkRateLimit: jest.fn().mockResolvedValue(blocked),
    checkConcurrentStreams: jest.fn().mockResolvedValue(blocked),
    releaseStream: jest.fn().mockResolvedValue(undefined),
    setCooldown: jest.fn().mockResolvedValue(undefined),
    checkCooldown: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 999,
      resetAt: new Date(),
    }),
  };
}

export function createE2eSaturatedConcurrentStreamLimiter(): Partial<SmartRateLimiterService> {
  return {
    checkRateLimit: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 999,
      resetAt: new Date(),
    }),
    checkConcurrentStreams: jest.fn().mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
      reason: 'Max concurrent streams (3) exceeded for gateway key.',
    }),
    releaseStream: jest.fn().mockResolvedValue(undefined),
    setCooldown: jest.fn().mockResolvedValue(undefined),
    checkCooldown: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 999,
      resetAt: new Date(),
    }),
  };
}

export function createE2eBurstRateLimiter(
  allowedRequests: number,
): Partial<SmartRateLimiterService> {
  let requestCount = 0;

  return {
    checkRateLimit: jest.fn().mockImplementation(async () => {
      requestCount += 1;
      if (requestCount > allowedRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(),
          reason: 'Rate limit exceeded for gateway key.',
        };
      }
      return {
        allowed: true,
        remaining: allowedRequests - requestCount,
        resetAt: new Date(),
      };
    }),
    checkConcurrentStreams: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 3,
      resetAt: new Date(),
    }),
    releaseStream: jest.fn().mockResolvedValue(undefined),
    setCooldown: jest.fn().mockResolvedValue(undefined),
    checkCooldown: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 999,
      resetAt: new Date(),
    }),
  };
}
