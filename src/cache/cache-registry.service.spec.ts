import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheRegistryService } from './cache-registry.service';
import { LoggingService } from '../logging/logging.service';
import { createMockLoggingService } from '../common/mocks/createMockLoggingService';
import { CreateNoOpCacheBackend } from '../common/mocks/createNoOpCacheBackend';
import { createMockCacheBackend } from '../common/mocks/createMockCacheBackend';
import type { CacheBackend } from './interfaces/cache-backend-interface';

describe('CacheRegistryService', () => {
  let service: CacheRegistryService;
  let mockConfig: Partial<ConfigService>;
  let mockLogger: Partial<LoggingService>;
  let mockBackend: Partial<CacheBackend>;
  let mockNoopBackend: Partial<CacheBackend>;

  beforeEach(async () => {
    mockConfig = {
      get: jest.fn(),
    };

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
  });

  describe('register', () => {
    it('should register backend with lowercase id', () => {
      service.register('redis', mockBackend as CacheBackend);

      expect(() =>
        service.register('redis', mockBackend as CacheBackend),
      ).not.toThrow();
    });

    it('should normalize backend id to lowercase', () => {
      service.register('Redis', mockBackend as CacheBackend);
      service.register('noop', mockNoopBackend as CacheBackend);

      (mockConfig.get as jest.Mock).mockReturnValue({ backend: 'REDIS' });

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
    beforeEach(() => {
      service.register('redis', mockBackend as CacheBackend);
      service.register('noop', mockNoopBackend as CacheBackend);
    });

    it('should resolve configured backend', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({ backend: 'redis' });

      const result = service.resolve();

      expect(result).toBe(mockBackend);
    });

    it('should default to noop when backend not configured', () => {
      (mockConfig.get as jest.Mock).mockReturnValue(undefined);

      const result = service.resolve();

      expect(result).toBe(mockNoopBackend);
    });

    it('should default to noop when backend is null', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({ backend: null });

      const result = service.resolve();

      expect(result).toBe(mockNoopBackend);
    });

    it('should fallback to noop when backend not found', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        backend: 'nonexistent',
      });

      const result = service.resolve();

      expect(result).toBe(mockNoopBackend);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown cache backend: nonexistent'),
      );
    });

    it('should normalize backend id from config to lowercase', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({ backend: 'REDIS' });

      const result = service.resolve();

      expect(result).toBe(mockBackend);
    });

    it('should throw when noop backend not registered', () => {
      const serviceWithoutNoop = new CacheRegistryService(
        mockConfig as ConfigService,
        mockLogger as LoggingService,
      );

      serviceWithoutNoop.register('redis', mockBackend as CacheBackend);
      (mockConfig.get as jest.Mock).mockReturnValue({
        backend: 'nonexistent',
      });

      expect(() => serviceWithoutNoop.resolve()).toThrow(
        '[CacheRegistryService] cache backend "noop" is required',
      );
    });

    it('should handle empty backend string', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({ backend: '' });

      const result = service.resolve();

      expect(result).toBe(mockNoopBackend);
    });
  });

  describe('edge cases', () => {
    it('should handle re-registration of same backend', () => {
      service.register('redis', mockBackend as CacheBackend);
      const anotherBackend = { ...mockBackend };
      service.register('redis', anotherBackend as CacheBackend);

      (mockConfig.get as jest.Mock).mockReturnValue({ backend: 'redis' });

      const result = service.resolve();

      expect(result).toBe(anotherBackend);
    });

    it('should handle config.get returning undefined', () => {
      service.register('noop', mockNoopBackend as CacheBackend);
      (mockConfig.get as jest.Mock).mockReturnValue(undefined);

      const result = service.resolve();

      expect(result).toBe(mockNoopBackend);
    });
  });
});
