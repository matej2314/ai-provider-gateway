import type { SmartRateLimiterService } from '../../../src/rate-limit/smart-rate-limiter.service';
import { asRateLimitBurst } from '../../../src/common/types';
import {
  TEST_MAX_CONCURRENT_STREAMS,
  TEST_RATE_LIMIT_BURST,
} from '../../../src/common/mocks/test-constants';

export function createE2eRateLimiterBlocked(): Partial<SmartRateLimiterService> {
  const blocked = {
    allowed: false,
    remaining: 0,
    resetAt: new Date(),
    reason: 'Rate limit exceeded for gateway key.',
  };

  return {
    checkRateLimit: jest
      .fn()
      .mockImplementation(() => Promise.resolve(blocked)),
    checkConcurrentStreams: jest
      .fn()
      .mockImplementation(() => Promise.resolve(blocked)),
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
    checkRateLimit: jest.fn().mockImplementation(() =>
      Promise.resolve({
        allowed: true,
        remaining: 999,
        resetAt: new Date(),
      }),
    ),
    checkConcurrentStreams: jest.fn().mockImplementation(() =>
      Promise.resolve({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
        reason: `Max concurrent streams (${TEST_MAX_CONCURRENT_STREAMS}) exceeded for gateway key.`,
      }),
    ),
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
  const burstLimit = asRateLimitBurst(allowedRequests);
  let requestCount = 0;

  return {
    checkRateLimit: jest.fn().mockImplementation(() => {
      requestCount += 1;
      if (requestCount > burstLimit) {
        return Promise.resolve({
          allowed: false,
          remaining: 0,
          resetAt: new Date(),
          reason: 'Rate limit exceeded for gateway key.',
        });
      }
      return Promise.resolve({
        allowed: true,
        remaining: burstLimit - requestCount,
        resetAt: new Date(),
      });
    }),
    checkConcurrentStreams: jest.fn().mockImplementation(() =>
      Promise.resolve({
        allowed: true,
        remaining: TEST_MAX_CONCURRENT_STREAMS,
        resetAt: new Date(),
      }),
    ),
    releaseStream: jest.fn().mockResolvedValue(undefined),
    setCooldown: jest.fn().mockResolvedValue(undefined),
    checkCooldown: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: TEST_RATE_LIMIT_BURST,
      resetAt: new Date(),
    }),
  };
}
