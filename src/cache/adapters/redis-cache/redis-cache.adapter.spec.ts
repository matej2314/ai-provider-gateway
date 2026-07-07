import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisCacheAdapter } from './redis-cache.adapter';
import { RedisConnectionService } from './redis-connection.service';
import { CacheRegistryService } from '../../cache-registry.service';
import { LoggingService } from '../../../logging/logging.service';
import { createMockLoggingService } from '../../../common/mocks/createMockLoggingService';
import { createMockConfigService } from '../../../common/mocks/createMockConfigService';
import {
  asCacheKey,
  asCacheTtlSeconds,
  type CacheTtlSeconds,
} from '../../../common/types/branded.types';
import {
  TEST_CACHE_KEY,
  TEST_CACHE_TTL_SECONDS,
  TEST_CACHE_TTL_CUSTOM,
} from '../../../common/mocks/test-constants';

describe('RedisCacheAdapter', () => {
  let adapter: RedisCacheAdapter;
  let mockConnection: Partial<RedisConnectionService>;
  let mockConfig: Partial<ConfigService>;
  let mockRegistry: Partial<CacheRegistryService>;
  let mockLogger: Partial<LoggingService>;
  let mockRedisClient: {
    get: jest.Mock;
    set: jest.Mock;
    setex: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(async () => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    mockConnection = {
      isReady: jest.fn().mockReturnValue(true),
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    mockConfig = createMockConfigService();

    mockRegistry = {
      register: jest.fn(),
    };

    mockLogger = createMockLoggingService();

    const module = await Test.createTestingModule({
      providers: [
        RedisCacheAdapter,
        { provide: RedisConnectionService, useValue: mockConnection },
        { provide: ConfigService, useValue: mockConfig },
        { provide: CacheRegistryService, useValue: mockRegistry },
        { provide: LoggingService, useValue: mockLogger },
      ],
    }).compile();

    adapter = module.get(RedisCacheAdapter);
  });

  describe('onModuleInit', () => {
    it('should register itself with registry', () => {
      adapter.onModuleInit();

      expect(mockRegistry.register).toHaveBeenCalledWith('redis', adapter);
    });
  });

  describe('isAvailable', () => {
    it('should return true when Redis ready', () => {
      (mockConnection.isReady as jest.Mock).mockReturnValue(true);

      const result = adapter.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false when Redis not ready', () => {
      (mockConnection.isReady as jest.Mock).mockReturnValue(false);

      const result = adapter.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('should return value from Redis', async () => {
      mockRedisClient.get.mockResolvedValue('cached-value');

      const result = await adapter.get(TEST_CACHE_KEY);

      expect(result).toBe('cached-value');
      expect(mockRedisClient.get).toHaveBeenCalledWith(TEST_CACHE_KEY);
    });

    it('should return null when key not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await adapter.get(asCacheKey('nonexistent'));

      expect(result).toBeNull();
    });

    it('should return null when client not available', async () => {
      (mockConnection.getClient as jest.Mock).mockReturnValue(null);

      const result = await adapter.get(TEST_CACHE_KEY);

      expect(result).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should return null and log warn on Redis error', async () => {
      const error = new Error('Redis connection lost');
      mockRedisClient.get.mockRejectedValue(error);

      const result = await adapter.get(TEST_CACHE_KEY);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Redis  GET failed for key test-key'),
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockRedisClient.get.mockRejectedValue('string error');

      const result = await adapter.get(TEST_CACHE_KEY);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should set value with TTL using SETEX', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      const result = await adapter.set(
        TEST_CACHE_KEY,
        'value',
        TEST_CACHE_TTL_SECONDS,
      );

      expect(result).toBe(true);
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        TEST_CACHE_KEY,
        TEST_CACHE_TTL_SECONDS,
        'value',
      );
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should set value with default TTL from config', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');
      (mockConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'cache') {
          return { ttl: 7200 };
        }
        return undefined;
      });

      const result = await adapter.set(TEST_CACHE_KEY, 'value');

      expect(result).toBe(true);
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        TEST_CACHE_KEY,
        TEST_CACHE_TTL_CUSTOM,
        'value',
      );
    });

    it('should use SET without TTL when TTL is 0', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await adapter.set(
        TEST_CACHE_KEY,
        'value',
        asCacheTtlSeconds(0),
      );

      expect(result).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(TEST_CACHE_KEY, 'value');
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('should use SET without TTL when TTL is negative', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await adapter.set(
        TEST_CACHE_KEY,
        'value',
        -1 as CacheTtlSeconds,
      );

      expect(result).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(TEST_CACHE_KEY, 'value');
    });

    it('should return false when client not available', async () => {
      (mockConnection.getClient as jest.Mock).mockReturnValue(null);

      const result = await adapter.set(TEST_CACHE_KEY, 'value');

      expect(result).toBe(false);
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('should return false and log warn on Redis error', async () => {
      const error = new Error('Redis write error');
      mockRedisClient.setex.mockRejectedValue(error);

      const result = await adapter.set(
        TEST_CACHE_KEY,
        'value',
        TEST_CACHE_TTL_SECONDS,
      );

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Redis SET failed for key test-key'),
      );
    });
  });

  describe('delete', () => {
    it('should delete key from Redis', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      const result = await adapter.delete(TEST_CACHE_KEY);

      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith(TEST_CACHE_KEY);
    });

    it('should return false when key not found', async () => {
      mockRedisClient.del.mockResolvedValue(0);

      const result = await adapter.delete(asCacheKey('nonexistent'));

      expect(result).toBe(false);
    });

    it('should return false when client not available', async () => {
      (mockConnection.getClient as jest.Mock).mockReturnValue(null);

      const result = await adapter.delete(TEST_CACHE_KEY);

      expect(result).toBe(false);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should return false and log warn on Redis error', async () => {
      const error = new Error('Redis delete error');
      mockRedisClient.del.mockRejectedValue(error);

      const result = await adapter.delete(TEST_CACHE_KEY);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Redis DELETE failed for key test-key'),
      );
    });
  });

  describe('error handling', () => {
    it('should handle all operation errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('GET error'));
      mockRedisClient.setex.mockRejectedValue(new Error('SET error'));
      mockRedisClient.del.mockRejectedValue(new Error('DEL error'));

      await expect(adapter.get(TEST_CACHE_KEY)).resolves.toBeNull();
      await expect(adapter.set(TEST_CACHE_KEY, 'val')).resolves.toBe(false);
      await expect(adapter.delete(TEST_CACHE_KEY)).resolves.toBe(false);
    });
  });
});
