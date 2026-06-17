import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { CacheRegistryService } from '../cache/cache-registry.service';
import {
  createMockConfigService,
  type MockConfigServiceOptions,
} from '../common/mocks/createMockConfigService';

const healthyReadinessConfig: MockConfigServiceOptions = {
  gatewayOptions: { models: {} },
  resolvedSystemPrompts: { master: 'prompt' },
  cache: { enabled: false },
};

describe('HealthService', () => {
  let service: HealthService;
  let mockCacheRegistry: Partial<CacheRegistryService>;

  async function initService(
    configOptions: MockConfigServiceOptions = healthyReadinessConfig,
  ) {
    const mockConfigService = createMockConfigService(configOptions);

    mockCacheRegistry = {
      resolve: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CacheRegistryService, useValue: mockCacheRegistry },
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

      const result = service.getReadiness();

      expect(result.status).toBe('ready');
      expect(result.checks.config.status).toBe('healthy');
      expect(result.checks.cache.status).toBe('healthy');
    });

    it('should return not_ready when config unhealthy', async () => {
      await initService({
        gateway: null,
        cache: { enabled: false },
      });

      const result = service.getReadiness();

      expect(result.status).toBe('not_ready');
      expect(result.checks.config.status).toBe('unhealthy');
    });

    it('should include version and uptime', async () => {
      await initService(healthyReadinessConfig);

      const result = service.getReadiness();

      expect(result.version).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should be ready when cache degraded', async () => {
      await initService({
        gatewayOptions: { models: {} },
        resolvedSystemPrompts: { master: 'prompt' },
        cache: { enabled: true, backend: 'redis' },
      });

      (mockCacheRegistry.resolve as jest.Mock).mockReturnValue({
        isAvailable: jest.fn().mockReturnValue(false),
      });

      const result = service.getReadiness();

      expect(result.status).toBe('ready');
      expect(result.checks.cache.status).toBe('degraded');
    });
  });

  describe('checkConfig', () => {
    it('should be healthy when gateway and prompts present', async () => {
      await initService(healthyReadinessConfig);

      const result = service.getReadiness();

      expect(result.checks.config.status).toBe('healthy');
      expect(result.checks.config.message).toBe('Config is loaded');
    });

    it('should be unhealthy when gateway config missing', async () => {
      await initService({
        gateway: null,
        resolvedSystemPrompts: { master: 'prompt' },
        cache: { enabled: false },
      });

      const result = service.getReadiness();

      expect(result.checks.config.status).toBe('unhealthy');
      expect(result.checks.config.message).toContain('missing or incomplete');
    });

    it('should be unhealthy when prompts missing', async () => {
      await initService({
        gatewayOptions: { models: {} },
        resolvedSystemPrompts: null,
        cache: { enabled: false },
      });

      const result = service.getReadiness();

      expect(result.checks.config.status).toBe('unhealthy');
    });
  });

  describe('checkCache', () => {
    it('should be healthy when cache disabled', async () => {
      await initService(healthyReadinessConfig);

      const result = service.getReadiness();

      expect(result.checks.cache.status).toBe('healthy');
      expect(result.checks.cache.message).toBe('Cache disabled (noop)');
    });

    it('should be healthy when cache enabled and available', async () => {
      await initService({
        gatewayOptions: { models: {} },
        resolvedSystemPrompts: { master: 'prompt' },
        cache: { enabled: true, backend: 'redis' },
      });

      (mockCacheRegistry.resolve as jest.Mock).mockReturnValue({
        isAvailable: jest.fn().mockReturnValue(true),
      });

      const result = service.getReadiness();

      expect(result.checks.cache.status).toBe('healthy');
      expect(result.checks.cache.message).toContain('available');
    });

    it('should be degraded when cache enabled but unavailable', async () => {
      await initService({
        gatewayOptions: { models: {} },
        resolvedSystemPrompts: { master: 'prompt' },
        cache: { enabled: true, backend: 'redis' },
      });

      (mockCacheRegistry.resolve as jest.Mock).mockReturnValue({
        isAvailable: jest.fn().mockReturnValue(false),
      });

      const result = service.getReadiness();

      expect(result.checks.cache.status).toBe('degraded');
      expect(result.checks.cache.message).toContain('unavailable');
    });

    it('should default to noop when backend undefined', async () => {
      await initService({
        gatewayOptions: { models: {} },
        resolvedSystemPrompts: { master: 'prompt' },
        cache: { enabled: true },
      });

      const result = service.getReadiness();

      expect(result.checks.cache.status).toBe('healthy');
    });
  });
});
