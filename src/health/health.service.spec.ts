import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { CacheRegistryService } from '../cache/cache-registry.service';
import { RedisConnectionService } from '../cache/adapters/redis-cache/redis-connection.service';
import { AppMetricsService } from '../observability/app-metrics/app-metrics.service';
import { PreMetricsScrapeRegistry } from '../observability/app-metrics/pre-metrics-scrape.registry';
import { LoggingService } from '../logging/logging.service';
import {
  createMockConfigService,
  type MockConfigServiceOptions,
} from '../common/mocks/createMockConfigService';
import { createMockLoggingService } from '../common/mocks/createMockLoggingService';

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
  let mockAppMetrics: Partial<AppMetricsService>;
  let mockLogger: Partial<LoggingService>;
  let preMetricsScrapeRegistry: PreMetricsScrapeRegistry;

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

    mockAppMetrics = {
      syncHealthMetrics: jest.fn(),
      setProcessUpTime: jest.fn(),
    };

    mockLogger = createMockLoggingService();
    preMetricsScrapeRegistry = new PreMetricsScrapeRegistry();

    const module = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CacheRegistryService, useValue: mockCacheRegistry },
        { provide: RedisConnectionService, useValue: mockRedisConnection },
        { provide: AppMetricsService, useValue: mockAppMetrics },
        {
          provide: PreMetricsScrapeRegistry,
          useValue: preMetricsScrapeRegistry,
        },
        { provide: LoggingService, useValue: mockLogger },
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
      expect(result.checks.redis).toBeUndefined();
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

    it('should sync health metrics after evaluation', async () => {
      await initService(healthyReadinessConfig);

      const result = await service.getReadiness();

      expect(mockAppMetrics.syncHealthMetrics).toHaveBeenCalledWith({
        ready: true,
        components: {
          config: 'healthy',
          cache: 'healthy',
        },
      });
      expect(mockAppMetrics.setProcessUpTime).toHaveBeenCalledWith(
        result.uptime,
      );
    });

    it('should log error once on first not_ready evaluation', async () => {
      await initService({
        gateway: null,
        cache: { enabled: false },
        extra: { RATE_LIMIT_SMART_ENABLED: false },
      });

      await service.getReadiness();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Readiness status changed',
        undefined,
        expect.objectContaining({
          previous: undefined,
          current: 'not_ready',
        }),
      );
    });

    it('should log info on first ready evaluation', async () => {
      await initService(healthyReadinessConfig);

      await service.getReadiness();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Readiness status changed',
        expect.objectContaining({
          previous: undefined,
          current: 'ready',
        }),
      );
    });

    it('should not log again when aggregate status unchanged', async () => {
      await initService({
        gateway: null,
        cache: { enabled: false },
        extra: { RATE_LIMIT_SMART_ENABLED: false },
      });

      await service.getReadiness();
      await service.getReadiness();

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
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
    it('should omit redis check when not required', async () => {
      await initService(healthyReadinessConfig);

      const result = await service.getReadiness();

      expect(result.checks.redis).toBeUndefined();
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

      expect(result.checks.redis).toBeDefined();
      expect(result.checks.redis!.status).toBe('degraded');
      expect(result.checks.redis!.message).toBe(
        'Redis required but unavailable',
      );
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

      expect(result.checks.redis).toBeDefined();
      expect(result.checks.redis!.status).toBe('degraded');
      expect(result.checks.redis!.message).toBe(
        'Redis connected but ping failed',
      );
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
      expect(result.checks.cache.message).toBe(
        'Cache enabled (redis backend).',
      );
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

  describe('refreshMetricsForScrape', () => {
    it('should sync health metrics on scrape refresh', async () => {
      await initService(healthyReadinessConfig);

      await service.refreshMetricsForScrape();

      expect(mockAppMetrics.syncHealthMetrics).toHaveBeenCalledWith({
        ready: true,
        components: {
          config: 'healthy',
          cache: 'healthy',
        },
      });
    });

    it('should skip refresh when called again within throttle window', async () => {
      await initService(healthyReadinessConfig);

      await service.refreshMetricsForScrape();
      await service.refreshMetricsForScrape();

      expect(mockAppMetrics.syncHealthMetrics).toHaveBeenCalledTimes(1);
    });

    it('should warm up metrics on module init', async () => {
      await initService(healthyReadinessConfig);
      await service.onModuleInit();

      expect(mockAppMetrics.syncHealthMetrics).toHaveBeenCalled();
    });

    it('should run registered hook after throttle window', async () => {
      jest.useFakeTimers();
      try {
        await initService(healthyReadinessConfig);
        await service.onModuleInit();
        (mockAppMetrics.syncHealthMetrics as jest.Mock).mockClear();

        jest.advanceTimersByTime(5_000);
        await preMetricsScrapeRegistry.runAll();

        expect(mockAppMetrics.syncHealthMetrics).toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
