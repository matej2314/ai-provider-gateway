import type { SmartRateLimiterService } from '../../rate-limit/smart-rate-limiter.service';

export function createMockSmartRateLimiter(): Partial<SmartRateLimiterService> {
  return {
    checkCooldown: jest.fn().mockResolvedValue({ allowed: true }),
    checkRateLimit: jest
      .fn()
      .mockResolvedValue({ allowed: true, remaining: 100 }),
    checkConcurrentStreams: jest.fn().mockResolvedValue({ allowed: true }),
    releaseStream: jest.fn(),
    setCooldown: jest.fn(),
  };
}
