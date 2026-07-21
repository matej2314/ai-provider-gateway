import type { CacheBackend } from '../../cache/interfaces/cache-backend-interface';

export const CreateNoOpCacheBackend = (): Partial<CacheBackend> => ({
  isAvailable: jest.fn().mockReturnValue(false),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(false),
  delete: jest.fn().mockResolvedValue(false),
});
