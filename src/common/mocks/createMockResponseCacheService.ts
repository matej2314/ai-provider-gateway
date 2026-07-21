import type { ResponseCacheService } from '../../cache/response-cache.service';

export function createMockResponseCacheService(): Partial<ResponseCacheService> {
  return {
    getCachedResponse: jest.fn().mockResolvedValue(null),
    setCachedResponse: jest.fn(),
  };
}
