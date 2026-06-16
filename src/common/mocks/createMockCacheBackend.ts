import { CacheBackend } from 'src/cache/interfaces/cache-backend-interface';

export function createMockCacheBackend(): Partial<CacheBackend> {
  return {
    isAvailable: jest.fn().mockReturnValue(true),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };
}
