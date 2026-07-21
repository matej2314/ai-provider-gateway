import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheRegistryService } from './cache-registry.service';
import { LoggingService } from '../logging/logging.service';
import { createMockLoggingService } from '../common/mocks/createMockLoggingService';
import { CreateNoOpCacheBackend } from '../common/mocks/createNoOpCacheBackend';
import { createMockCacheBackend } from '../common/mocks/createMockCacheBackend';
import {
  createMockConfigService,
  type MockConfigServiceOptions,
} from '../common/mocks/createMockConfigService';
import type { CacheBackend } from './interfaces/cache-backend-interface';
import { CACHE_BACKEND_TYPE } from '../cache/interfaces/cache-backend-interface';

describe('CacheRegistryService', () => {
  let service: CacheRegistryService;
  let mockConfig: Partial<ConfigService>;
  let mockLogger: Partial<LoggingService>;
  let mockBackend: Partial<CacheBackend>;
  let mockNoopBackend: Partial<CacheBackend>;

  async function initService(configOptions: MockConfigServiceOptions = {}) {
    mockConfig = createMockConfigService(configOptions);

    mockLogger = createMockLoggingService();
    mockBackend = createMockCacheBackend();
    mockNoopBackend = CreateNoOpCacheBackend();

    const module = await Test.createTestingModule({
      providers: [
        CacheRegistryService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: LoggingService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(CacheRegistryService);
  }

  beforeEach(async () => {
    await initService();
  });

  describe('register', () => {
    it('should register backend with lowercase id', () => {
      service.register('redis', mockBackend as CacheBackend);

      expect(() =>
        service.register('redis', mockBackend as CacheBackend),
      ).not.toThrow();
    });

    it('should normalize backend id to lowercase', async () => {
      await initService({ cache: { backend: 'REDIS' as CACHE_BACKEND_TYPE } });

      service.register('Redis', mockBackend as CacheBackend);
      service.register('noop', mockNoopBackend as CacheBackend);

      const result = service.resolve();

      expect(result).toBe(mockBackend);
    });

    it('should allow multiple backends', () => {
      service.register('redis', mockBackend as CacheBackend);
      service.register('noop', mockNoopBackend as CacheBackend);

      expect(() =>
        service.register('redis', mockBackend as CacheBackend),
      ).not.toThrow();
    });
  });

  describe('resolve', () => {
    it('should resolve configured backend', async () => {
      await initService({ cache: { backend: 'redis' } });
      service.register('redis', mockBackend as CacheBackend);
      service.register('noop', mockNoopBackend as CacheBackend);

      const result = service.resolve();

      expect(result).toBe(mockBackend);
    });

    it('should default to noop when backend not configured', async () => {
      await initService({ cache: null });
      service.register('redis', mockBackend as CacheBackend);
      service.register('noop', mockNoopBackend as CacheBackend);

      const result = service.resolve();

      expect(result).toBe(mockNoopBackend);
    });

    it('should default to noop when backend is null', async () => {
      await initService({
        cache: { backend: null as unknown as CACHE_BACKEND_TYPE },
      });
      service.register('redis', mockBackend as CacheBackend);
      service.register('noop', mockNoopBackend as CacheBackend);

      const result = service.resolve();

      expect(result).toBe(mockNoopBackend);
    });

    it('should fallback to noop when backend not found', async () => {
      await initService({
        cache: { backend: 'nonexistent' as CACHE_BACKEND_TYPE },
      });
      service.register('redis', mockBackend as CacheBackend);
      service.register('noop', mockNoopBackend as CacheBackend);

      const result = service.resolve();

      expect(result).toBe(mockNoopBackend);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown cache backend: nonexistent'),
      );
    });

    it('should normalize backend id from config to lowercase', async () => {
      await initService({ cache: { backend: 'REDIS' as CACHE_BACKEND_TYPE } });
      service.register('redis', mockBackend as CacheBackend);
      service.register('noop', mockNoopBackend as CacheBackend);

      const result = service.resolve();

      expect(result).toBe(mockBackend);
    });

    it('should throw when noop backend not registered', () => {
      const configWithoutNoop = createMockConfigService({
        cache: { backend: 'nonexistent' as CACHE_BACKEND_TYPE },
      });
      const serviceWithoutNoop = new CacheRegistryService(
        configWithoutNoop as ConfigService,
        mockLogger as LoggingService,
      );

      serviceWithoutNoop.register('redis', mockBackend as CacheBackend);

      expect(() => serviceWithoutNoop.resolve()).toThrow(
        '[CacheRegistryService] cache backend "noop" is required',
      );
    });

    it('should handle empty backend string', async () => {
      await initService({ cache: { backend: '' as CACHE_BACKEND_TYPE } });
      service.register('redis', mockBackend as CacheBackend);
      service.register('noop', mockNoopBackend as CacheBackend);

      const result = service.resolve();

      expect(result).toBe(mockNoopBackend);
    });
  });

  describe('edge cases', () => {
    it('should handle re-registration of same backend', async () => {
      await initService({ cache: { backend: 'redis' } });

      service.register('redis', mockBackend as CacheBackend);
      const anotherBackend = { ...mockBackend };
      service.register('redis', anotherBackend as CacheBackend);
      service.register('noop', mockNoopBackend as CacheBackend);

      const result = service.resolve();

      expect(result).toBe(anotherBackend);
    });

    it('should handle config.get returning undefined', async () => {
      await initService({ cache: null });

      service.register('noop', mockNoopBackend as CacheBackend);

      const result = service.resolve();

      expect(result).toBe(mockNoopBackend);
    });
  });
});
