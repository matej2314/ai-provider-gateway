import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { CacheRegistryService } from '../cache/cache-registry.service';
import { RedisConnectionService } from '../cache/adapters/redis-cache/redis-connection.service';
import {
  createMockConfigService,
  type MockConfigServiceOptions,
} from '../common/mocks/createMockConfigService';

const healthyReadinessConfig: MockConfigServiceOptions = {
  gatewayOptions: { models: {} },
  resolvedSystemPrompts: { master: 'prompt' },
  cache: { enabled: false },
  extra: { RATE_LIMIT_SMART_ENABLED: false },
};

describe('HealthService', () => {
  let service: HealthService;
  let mockCacheRegistry: Partial<CacheRegistryService>;
  let mockRedisConnection: Partial<RedisConnectionService>;

  async function initService(
    configOptions: MockConfigServiceOptions = healthyReadinessConfig,
  ) {
    const mockConfigService = createMockConfigService(configOptions);

    mockCacheRegistry = {
      resolve: jest.fn(),
    };

    mockRedisConnection = {
      isReady: jest.fn().mockReturnValue(false),
      ping: jest.fn().mockResolvedValue(false),
    };

    const module = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CacheRegistryService, useValue: mockCacheRegistry },
        { provide: RedisConnectionService, useValue: mockRedisConnection },
      ],
    }).compile();

    service = module.get(HealthService);
  }

  beforeEach(async () => {
    await initService();
  });

  describe('getLiveness', () => {
    it('should always return healthy', () => {
      const result = service.getLiveness();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
    });

    it('should return ISO timestamp', () => {
      const result = service.getLiveness();

      expect(() => new Date(result.timestamp)).not.toThrow();
    });
  });

  describe('getReadiness', () => {
    it('should return ready when all checks healthy', async () => {
      await initService(healthyReadinessConfig);

      const result = await service.getReadiness();

      expect(result.status).toBe('ready');
      expect(result.checks.config.status).toBe('healthy');
      expect(result.checks.redis.status).toBe('healthy');
      expect(result.checks.redis.required).toBe(false);
      expect(result.checks.cache.status).toBe('healthy');
    });

    it('should return not_ready when config unhealthy', async () => {
      await initService({
        gateway: null,
        cache: { enabled: false },
        extra: { RATE_LIMIT_SMART_ENABLED: false },
      });

      const result = await service.getReadiness();

      expect(result.status).toBe('not_ready');
      expect(result.checks.config.status).toBe('unhealthy');
    });

    it('should include version and uptime', async () => {
      await initService(healthyReadinessConfig);

      const result = await service.getReadiness();

      expect(result.version).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should be ready when cache degraded', async () => {
      await initService({
        gatewayOptions: { models: {} },
        resolvedSystemPrompts: { master: 'prompt' },
        cache: { enabled: true, backend: 'redis' },
        extra: { RATE_LIMIT_SMART_ENABLED: false },
      });

      const result = await service.getReadiness();

      expect(result.status).toBe('ready');
      expect(result.checks.cache.status).toBe('degraded');
      expect(mockCacheRegistry.resolve).not.toHaveBeenCalled();
    });
  });

  describe('checkConfig', () => {
    it('should be healthy when gateway and prompts present', async () => {
      await initService(healthyReadinessConfig);

      const result = await service.getReadiness();

      expect(result.checks.config.status).toBe('healthy');
      expect(result.checks.config.message).toBe('Config is loaded');
    });

    it('should be unhealthy when gateway config missing', async () => {
      await initService({
        gateway: null,
        resolvedSystemPrompts: { master: 'prompt' },
        cache: { enabled: false },
        extra: { RATE_LIMIT_SMART_ENABLED: false },
      });

      const result = await service.getReadiness();

      expect(result.checks.config.status).toBe('unhealthy');
      expect(result.checks.config.message).toContain('missing or incomplete');
    });

    it('should be unhealthy when prompts missing', async () => {
      await initService({
        gatewayOptions: { models: {} },
        resolvedSystemPrompts: null,
        cache: { enabled: false },
        extra: { RATE_LIMIT_SMART_ENABLED: false },
      });

      const result = await service.getReadiness();

      expect(result.checks.config.status).toBe('unhealthy');
    });
  });

  describe('checkRedis', () => {
    it('should not probe redis when not required', async () => {
      await initService(healthyReadinessConfig);

      const result = await service.getReadiness();

      expect(result.checks.redis).toEqual({
        status: 'healthy',
        message: 'Redis not required.',
        required: false,
      });
      expect(mockRedisConnection.ping).not.toHaveBeenCalled();
    });

    it('should probe redis when only rate limit enabled', async () => {
      await initService({
        ...healthyReadinessConfig,
        extra: { RATE_LIMIT_SMART_ENABLED: true },
      });
      (mockRedisConnection.ping as jest.Mock).mockResolvedValue(true);

      const result = await service.getReadiness();

      expect(mockRedisConnection.ping).toHaveBeenCalled();
      expect(result.checks.redis).toEqual({
        status: 'healthy',
        message: 'Redis available',
        required: true,
        consumers: ['rate-limit'],
      });
      expect(result.checks.cache.message).toBe('Cache disabled (noop)');
    });

    it('should be degraded when redis required but ping fails', async () => {
      await initService({
        ...healthyReadinessConfig,
        extra: { RATE_LIMIT_SMART_ENABLED: true },
      });
      (mockRedisConnection.ping as jest.Mock).mockResolvedValue(false);
      (mockRedisConnection.isReady as jest.Mock).mockReturnValue(false);

      const result = await service.getReadiness();

      expect(result.checks.redis.status).toBe('degraded');
      expect(result.checks.redis.message).toBe('Redis required but unavailable');
      expect(result.status).toBe('ready');
    });

    it('should be degraded when connected but ping fails', async () => {
      await initService({
        ...healthyReadinessConfig,
        extra: { RATE_LIMIT_SMART_ENABLED: true },
      });
      (mockRedisConnection.ping as jest.Mock).mockResolvedValue(false);
      (mockRedisConnection.isReady as jest.Mock).mockReturnValue(true);

      const result = await service.getReadiness();

      expect(result.checks.redis.status).toBe('degraded');
      expect(result.checks.redis.message).toBe('Redis connected but ping failed');
    });
  });

  describe('checkCache', () => {
    it('should be healthy when cache disabled', async () => {
      await initService(healthyReadinessConfig);

      const result = await service.getReadiness();

      expect(result.checks.cache.status).toBe('healthy');
      expect(result.checks.cache.message).toBe('Cache disabled (noop)');
    });

    it('should be healthy when cache enabled and redis available', async () => {
      await initService({
        gatewayOptions: { models: {} },
        resolvedSystemPrompts: { master: 'prompt' },
        cache: { enabled: true, backend: 'redis' },
        extra: { RATE_LIMIT_SMART_ENABLED: false },
      });
      (mockRedisConnection.ping as jest.Mock).mockResolvedValue(true);

      const result = await service.getReadiness();

      expect(result.checks.cache.status).toBe('healthy');
      expect(result.checks.cache.message).toBe('Cache enabled (redis backend).');
      expect(mockCacheRegistry.resolve).not.toHaveBeenCalled();
    });

    it('should be degraded when cache enabled but redis unavailable', async () => {
      await initService({
        gatewayOptions: { models: {} },
        resolvedSystemPrompts: { master: 'prompt' },
        cache: { enabled: true, backend: 'redis' },
        extra: { RATE_LIMIT_SMART_ENABLED: false },
      });
      (mockRedisConnection.ping as jest.Mock).mockResolvedValue(false);
      (mockRedisConnection.isReady as jest.Mock).mockReturnValue(false);

      const result = await service.getReadiness();

      expect(result.checks.cache.status).toBe('degraded');
      expect(result.checks.cache.message).toBe(
        'Cache enabled (redis backend unavailable).',
      );
      expect(mockCacheRegistry.resolve).not.toHaveBeenCalled();
    });

    it('should default to noop when backend undefined', async () => {
      await initService({
        gatewayOptions: { models: {} },
        resolvedSystemPrompts: { master: 'prompt' },
        cache: { enabled: true },
        extra: { RATE_LIMIT_SMART_ENABLED: false },
      });

      const result = await service.getReadiness();

      expect(result.checks.cache.status).toBe('healthy');
    });
  });
});
