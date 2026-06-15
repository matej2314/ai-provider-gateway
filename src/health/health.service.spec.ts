import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { CacheRegistryService } from '../cache/cache-registry.service';

describe('HealthService', () => {
  let service: HealthService;
  let mockConfigService: Partial<ConfigService>;
  let mockCacheRegistry: Partial<CacheRegistryService>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    };

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
    it('should return ready when all checks healthy', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce({ models: {} })
        .mockReturnValueOnce({ master: 'prompt' })
        .mockReturnValueOnce({ enabled: false });

      const result = service.getReadiness();

      expect(result.status).toBe('ready');
      expect(result.checks.config.status).toBe('healthy');
      expect(result.checks.cache.status).toBe('healthy');
    });

    it('should return not_ready when config unhealthy', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce({ enabled: false });

      const result = service.getReadiness();

      expect(result.status).toBe('not_ready');
      expect(result.checks.config.status).toBe('unhealthy');
    });

    it('should include version and uptime', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce({ models: {} })
        .mockReturnValueOnce({ master: 'prompt' })
        .mockReturnValueOnce({ enabled: false });

      const result = service.getReadiness();

      expect(result.version).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should be ready when cache degraded', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce({ models: {} })
        .mockReturnValueOnce({ master: 'prompt' })
        .mockReturnValueOnce({ enabled: true, backend: 'redis' });

      (mockCacheRegistry.resolve as jest.Mock).mockReturnValue({
        isAvailable: jest.fn().mockReturnValue(false),
      });

      const result = service.getReadiness();

      expect(result.status).toBe('ready');
      expect(result.checks.cache.status).toBe('degraded');
    });
  });

  describe('checkConfig', () => {
    it('should be healthy when gateway and prompts present', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce({ models: {} })
        .mockReturnValueOnce({ master: 'prompt' })
        .mockReturnValueOnce({ enabled: false });

      const result = service.getReadiness();

      expect(result.checks.config.status).toBe('healthy');
      expect(result.checks.config.message).toBe('Config is loaded');
    });

    it('should be unhealthy when gateway config missing', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce({ master: 'prompt' })
        .mockReturnValueOnce({ enabled: false });

      const result = service.getReadiness();

      expect(result.checks.config.status).toBe('unhealthy');
      expect(result.checks.config.message).toContain('missing or incomplete');
    });

    it('should be unhealthy when prompts missing', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce({ models: {} })
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce({ enabled: false });

      const result = service.getReadiness();

      expect(result.checks.config.status).toBe('unhealthy');
    });
  });

  describe('checkCache', () => {
    it('should be healthy when cache disabled', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce({ models: {} })
        .mockReturnValueOnce({ master: 'prompt' })
        .mockReturnValueOnce({ enabled: false });

      const result = service.getReadiness();

      expect(result.checks.cache.status).toBe('healthy');
      expect(result.checks.cache.message).toBe('Cache disabled (noop)');
    });

    it('should be healthy when cache enabled and available', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce({ models: {} })
        .mockReturnValueOnce({ master: 'prompt' })
        .mockReturnValueOnce({ enabled: true, backend: 'redis' });

      (mockCacheRegistry.resolve as jest.Mock).mockReturnValue({
        isAvailable: jest.fn().mockReturnValue(true),
      });

      const result = service.getReadiness();

      expect(result.checks.cache.status).toBe('healthy');
      expect(result.checks.cache.message).toContain('available');
    });

    it('should be degraded when cache enabled but unavailable', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce({ models: {} })
        .mockReturnValueOnce({ master: 'prompt' })
        .mockReturnValueOnce({ enabled: true, backend: 'redis' });

      (mockCacheRegistry.resolve as jest.Mock).mockReturnValue({
        isAvailable: jest.fn().mockReturnValue(false),
      });

      const result = service.getReadiness();

      expect(result.checks.cache.status).toBe('degraded');
      expect(result.checks.cache.message).toContain('unavailable');
    });

    it('should default to noop when backend undefined', () => {
      (mockConfigService.get as jest.Mock)
        .mockReturnValueOnce({ models: {} })
        .mockReturnValueOnce({ master: 'prompt' })
        .mockReturnValueOnce({ enabled: true });

      const result = service.getReadiness();

      expect(result.checks.cache.status).toBe('healthy');
    });
  });
});
