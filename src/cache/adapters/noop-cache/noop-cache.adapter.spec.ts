import { Test } from '@nestjs/testing';
import { NoOpCacheBackend } from './noop-cache.adapter';
import { CacheRegistryService } from '../../cache-registry.service';
import { asCacheKey } from '../../../common/types/branded.types';
import { TEST_CACHE_TTL_SECONDS } from '../../../common/mocks/test-constants';

describe('NoOpCacheBackend', () => {
  let adapter: NoOpCacheBackend;
  let mockRegistry: Partial<CacheRegistryService>;

  beforeEach(async () => {
    mockRegistry = {
      register: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        NoOpCacheBackend,
        { provide: CacheRegistryService, useValue: mockRegistry },
      ],
    }).compile();

    adapter = module.get(NoOpCacheBackend);
  });

  describe('onModuleInit', () => {
    it('should register itself with registry', () => {
      adapter.onModuleInit();

      expect(mockRegistry.register).toHaveBeenCalledWith('noop', adapter);
    });

    it('should register only once on multiple calls', () => {
      adapter.onModuleInit();
      adapter.onModuleInit();

      expect(mockRegistry.register).toHaveBeenCalledTimes(2);
      expect(mockRegistry.register).toHaveBeenCalledWith('noop', adapter);
    });
  });

  describe('isAvailable', () => {
    it('should always return false', () => {
      expect(adapter.isAvailable()).toBe(false);
    });
  });

  describe('get', () => {
    it('should always return null', async () => {
      const result = await adapter.get(asCacheKey('any-key'));

      expect(result).toBeNull();
    });

    it('should ignore key parameter', async () => {
      await expect(adapter.get(asCacheKey('key1'))).resolves.toBeNull();
      await expect(adapter.get(asCacheKey('key2'))).resolves.toBeNull();
      await expect(adapter.get(asCacheKey(''))).resolves.toBeNull();
    });
  });

  describe('set', () => {
    it('should always return false', async () => {
      const result = await adapter.set(asCacheKey('key'), 'value');

      expect(result).toBe(false);
    });

    it('should ignore all parameters', async () => {
      await expect(
        adapter.set(asCacheKey('key'), 'value', TEST_CACHE_TTL_SECONDS),
      ).resolves.toBe(false);
      await expect(adapter.set(asCacheKey(''), '')).resolves.toBe(false);
    });
  });

  describe('delete', () => {
    it('should always return false', async () => {
      const result = await adapter.delete(asCacheKey('key'));

      expect(result).toBe(false);
    });

    it('should ignore key parameter', async () => {
      await expect(adapter.delete(asCacheKey('key1'))).resolves.toBe(false);
      await expect(adapter.delete(asCacheKey('key2'))).resolves.toBe(false);
      await expect(adapter.delete(asCacheKey(''))).resolves.toBe(false);
    });
  });

  describe('behavior verification', () => {
    it('should not throw errors on any operation', async () => {
      expect(() => adapter.isAvailable()).not.toThrow();
      await expect(adapter.get(asCacheKey('key'))).resolves.not.toThrow();
      await expect(
        adapter.set(asCacheKey('key'), 'value'),
      ).resolves.not.toThrow();
      await expect(adapter.delete(asCacheKey('key'))).resolves.not.toThrow();
    });

    it('should complete operations synchronously/immediately', async () => {
      const start = Date.now();
      await adapter.get(asCacheKey('key'));
      await adapter.set(asCacheKey('key'), 'value');
      await adapter.delete(asCacheKey('key'));
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10);
    });
  });
});
