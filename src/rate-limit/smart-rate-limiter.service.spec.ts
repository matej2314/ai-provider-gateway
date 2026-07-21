import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmartRateLimiterService } from './smart-rate-limiter.service';
import { RedisConnectionService } from '../cache/adapters/redis-cache/redis-connection.service';
import { LoggingService } from '../logging/logging.service';
import { AppMetricsService } from '../observability/app-metrics/app-metrics.service';
import { createMockLoggingService } from '../common/mocks/createMockLoggingService';
import { createMockConfigService } from '../common/mocks/createMockConfigService';
import {
  asGatewayKey,
  asEnvRef,
  asMaxConcurrentStreams,
  asProviderInstanceId,
  asRateLimitBurst,
  asRateLimitRps,
} from '../common/types';
import { asClientId } from '../common/types/branded.types';
import type { ResolvedGatewayClient } from '../config/configuration.types';

const UNKNOWN_CLIENT_ID = asClientId('unknown');

describe('SmartRateLimiterService', () => {
  let service: SmartRateLimiterService;
  let mockConfig: Partial<ConfigService>;
  let mockRedis: Partial<RedisConnectionService>;
  let mockLogger: Partial<LoggingService>;
  let mockAppMetrics: Partial<AppMetricsService>;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockRedisClient = {
      eval: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      set: jest.fn(),
    };

    mockConfig = createMockConfigService({
      gatewayKey: { clients: [] },
      rateLimit: {
        rps: asRateLimitRps(10),
        burst: asRateLimitBurst(20),
        maxConcurrentStreams: asMaxConcurrentStreams(3),
        cooldownAfter429: 60,
      },
    });

    mockRedis = {
      isReady: jest.fn().mockReturnValue(true),
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    mockLogger = createMockLoggingService();
    mockAppMetrics = {
      recordRateLimit: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        SmartRateLimiterService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: RedisConnectionService, useValue: mockRedis },
        { provide: LoggingService, useValue: mockLogger },
        { provide: AppMetricsService, useValue: mockAppMetrics },
      ],
    }).compile();

    service = module.get(SmartRateLimiterService);
  });

  async function createServiceWithGatewayClients(
    clients: ResolvedGatewayClient[],
    rateLimitOverrides?: {
      rps?: number;
      burst?: number;
      maxConcurrentStreams?: number;
    },
  ): Promise<SmartRateLimiterService> {
    const config = createMockConfigService({
      gatewayKey: { clients },
      rateLimit: {
        rps: asRateLimitRps(rateLimitOverrides?.rps ?? 10),
        burst: asRateLimitBurst(rateLimitOverrides?.burst ?? 20),
        maxConcurrentStreams: asMaxConcurrentStreams(
          rateLimitOverrides?.maxConcurrentStreams ?? 3,
        ),
        cooldownAfter429: 60,
      },
    });

    const module = await Test.createTestingModule({
      providers: [
        SmartRateLimiterService,
        { provide: ConfigService, useValue: config },
        { provide: RedisConnectionService, useValue: mockRedis },
        { provide: LoggingService, useValue: mockLogger },
        { provide: AppMetricsService, useValue: mockAppMetrics },
      ],
    }).compile();

    return module.get(SmartRateLimiterService);
  }

  describe('checkRateLimit', () => {
    it('should allow when Redis not ready', async () => {
      (mockRedis.isReady as jest.Mock).mockReturnValue(false);

      const result = await service.checkRateLimit(asGatewayKey('gw_key_123'));

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(1000);
    });

    it('should allow when tokens available', async () => {
      mockRedisClient.eval.mockResolvedValue([1, 19, Date.now()]);

      const result = await service.checkRateLimit(asGatewayKey('gw_key_123'));

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(19);
    });

    it('should deny when no tokens', async () => {
      mockRedisClient.eval.mockResolvedValue([0, 0, Date.now()]);

      const result = await service.checkRateLimit(asGatewayKey('gw_key_123'));

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.reason).toContain('Rate limit exceeded');
      expect(mockAppMetrics.recordRateLimit).toHaveBeenCalledWith(
        UNKNOWN_CLIENT_ID,
        'rate',
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should not record metrics when request is allowed', async () => {
      mockRedisClient.eval.mockResolvedValue([1, 19, Date.now()]);

      await service.checkRateLimit(asGatewayKey('gw_key_123'));

      expect(mockAppMetrics.recordRateLimit).not.toHaveBeenCalled();
    });

    it('should use default limits when client not configured', async () => {
      mockRedisClient.eval.mockResolvedValue([1, 19, Date.now()]);

      await service.checkRateLimit(asGatewayKey('gw_unknown_key'));

      expect(mockRedisClient.eval).toHaveBeenCalled();
      const args = (mockRedisClient.eval as jest.Mock).mock.calls[0];
      expect(args[4]).toBe('10');
      expect(args[5]).toBe('20');
    });

    it('should fallback to allowed on Redis error', async () => {
      mockRedisClient.eval.mockRejectedValue(new Error('Redis error'));

      const result = await service.checkRateLimit(asGatewayKey('gw_key_123'));

      expect(result.allowed).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should include resetAt timestamp', async () => {
      const now = Date.now();
      mockRedisClient.eval.mockResolvedValue([1, 19, now]);

      const result = await service.checkRateLimit(asGatewayKey('gw_key_123'));

      expect(result.resetAt).toBeInstanceOf(Date);
    });
  });

  describe('checkRateLimit — configured vs unknown gateway keys (Faza 1.6)', () => {
    const configuredKey = asGatewayKey('gw_configured_client');
    const unknownKey = asGatewayKey('gw_unknown_key');

    const configuredClient: ResolvedGatewayClient = {
      instanceId: asProviderInstanceId('client-web'),
      name: 'Web Client',
      type: 'webapp',
      gatewayKeyRef: asEnvRef('CLIENT_GW_KEY_ENV'),
      gatewayKey: configuredKey,
      rateLimit: {
        rps: asRateLimitRps(5),
        burst: asRateLimitBurst(10),
        maxConcurrentStreams: asMaxConcurrentStreams(2),
      },
    };

    it('uses client-specific limits for configured gateway key', async () => {
      mockRedisClient.eval.mockResolvedValue([1, 9, Date.now()]);
      const configuredService = await createServiceWithGatewayClients([
        configuredClient,
      ]);

      await configuredService.checkRateLimit(configuredKey);

      const args = (mockRedisClient.eval as jest.Mock).mock.calls[0];
      expect(args[4]).toBe('5');
      expect(args[5]).toBe('10');
    });

    it('uses default limits for unknown gateway key', async () => {
      mockRedisClient.eval.mockResolvedValue([1, 19, Date.now()]);
      const configuredService = await createServiceWithGatewayClients([
        configuredClient,
      ]);

      await configuredService.checkRateLimit(unknownKey);

      const args = (mockRedisClient.eval as jest.Mock).mock.calls[0];
      expect(args[4]).toBe('10');
      expect(args[5]).toBe('20');
    });

    it('records rate limit metric with configured client name', async () => {
      mockRedisClient.eval.mockResolvedValue([0, 0, Date.now()]);
      const configuredService = await createServiceWithGatewayClients([
        configuredClient,
      ]);

      await configuredService.checkRateLimit(configuredKey);

      expect(mockAppMetrics.recordRateLimit).toHaveBeenCalledWith(
        asClientId('Web Client'),
        'rate',
      );
    });
  });

  describe('checkConcurrentStreams — configured vs unknown gateway keys (Faza 1.6)', () => {
    const configuredKey = asGatewayKey('gw_configured_streams');
    const unknownKey = asGatewayKey('gw_unknown_streams');

    const configuredClient: ResolvedGatewayClient = {
      instanceId: asProviderInstanceId('client-stream'),
      name: 'Stream Client',
      type: 'service',
      gatewayKeyRef: asEnvRef('CLIENT_STREAM_KEY_ENV'),
      gatewayKey: configuredKey,
      rateLimit: {
        rps: asRateLimitRps(5),
        burst: asRateLimitBurst(10),
        maxConcurrentStreams: asMaxConcurrentStreams(2),
      },
    };

    it('uses client-specific maxConcurrentStreams for configured gateway key', async () => {
      mockRedisClient.incr.mockResolvedValue(2);
      const configuredService = await createServiceWithGatewayClients([
        configuredClient,
      ]);

      const result = await configuredService.checkConcurrentStreams(
        configuredKey,
        asClientId('Stream Client'),
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('uses default maxConcurrentStreams for unknown gateway key', async () => {
      mockRedisClient.incr.mockResolvedValue(2);
      const configuredService = await createServiceWithGatewayClients([
        configuredClient,
      ]);

      const result = await configuredService.checkConcurrentStreams(
        unknownKey,
        UNKNOWN_CLIENT_ID,
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe('checkConcurrentStreams', () => {
    it('should allow when Redis not ready', async () => {
      (mockRedis.isReady as jest.Mock).mockReturnValue(false);

      const result = await service.checkConcurrentStreams(
        asGatewayKey('gw_key_123'),
        UNKNOWN_CLIENT_ID,
      );

      expect(result.allowed).toBe(true);
    });

    it('should allow when under limit', async () => {
      mockRedisClient.incr.mockResolvedValue(2);

      const result = await service.checkConcurrentStreams(
        asGatewayKey('gw_key_123'),
        UNKNOWN_CLIENT_ID,
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
      expect(mockAppMetrics.recordRateLimit).not.toHaveBeenCalled();
    });

    it('should deny when at limit', async () => {
      mockRedisClient.incr.mockResolvedValue(4);

      const result = await service.checkConcurrentStreams(
        asGatewayKey('gw_key_123'),
        UNKNOWN_CLIENT_ID,
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Max concurrent streams');
      expect(mockRedisClient.decr).toHaveBeenCalled();
      expect(mockAppMetrics.recordRateLimit).toHaveBeenCalledWith(
        UNKNOWN_CLIENT_ID,
        'concurrency',
      );
    });

    it('should set expire on counter', async () => {
      mockRedisClient.incr.mockResolvedValue(1);

      await service.checkConcurrentStreams(
        asGatewayKey('gw_key_123'),
        UNKNOWN_CLIENT_ID,
      );

      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'rateLimit:streams:gw_key_123',
        300,
      );
    });

    it('should fallback on error', async () => {
      mockRedisClient.incr.mockRejectedValue(new Error('Redis error'));

      const result = await service.checkConcurrentStreams(
        asGatewayKey('gw_key_123'),
        UNKNOWN_CLIENT_ID,
      );

      expect(result.allowed).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockAppMetrics.recordRateLimit).not.toHaveBeenCalled();
    });
  });

  describe('releaseStream', () => {
    it('should decrement counter', async () => {
      await service.releaseStream(asGatewayKey('gw_key_123'));

      expect(mockRedisClient.decr).toHaveBeenCalledWith(
        'rateLimit:streams:gw_key_123',
      );
    });

    it('should not throw on error', async () => {
      mockRedisClient.decr.mockRejectedValue(new Error('Redis error'));

      await expect(
        service.releaseStream(asGatewayKey('gw_key_123')),
      ).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should do nothing when Redis not ready', async () => {
      (mockRedis.isReady as jest.Mock).mockReturnValue(false);

      await service.releaseStream(asGatewayKey('gw_key_123'));

      expect(mockRedisClient.decr).not.toHaveBeenCalled();
    });
  });

  describe('branded rate limit configuration (Faza 4.5)', () => {
    it('passes branded rps and burst values to Redis token bucket script', async () => {
      mockRedisClient.eval.mockResolvedValue([1, 4, Date.now()]);
      const configuredKey = asGatewayKey('gw_branded_limits');
      const configuredClient: ResolvedGatewayClient = {
        instanceId: asProviderInstanceId('client-branded'),
        name: 'Branded Limits Client',
        type: 'service',
        gatewayKeyRef: asEnvRef('CLIENT_BRANDED_KEY_ENV'),
        gatewayKey: configuredKey,
        rateLimit: {
          rps: asRateLimitRps(7),
          burst: asRateLimitBurst(14),
          maxConcurrentStreams: asMaxConcurrentStreams(4),
        },
      };
      const brandedService = await createServiceWithGatewayClients([
        configuredClient,
      ]);

      await brandedService.checkRateLimit(configuredKey);

      const args = (mockRedisClient.eval as jest.Mock).mock.calls[0];
      expect(args[4]).toBe('7');
      expect(args[5]).toBe('14');
    });
  });

  describe('checkCooldown', () => {
    it('should allow when Redis not ready', async () => {
      (mockRedis.isReady as jest.Mock).mockReturnValue(false);

      const result = await service.checkCooldown(
        asGatewayKey('gw_key_123'),
        'anthropic',
      );

      expect(result.allowed).toBe(true);
    });

    it('should allow when no cooldown', async () => {
      mockRedisClient.ttl.mockResolvedValue(-1);

      const result = await service.checkCooldown(
        asGatewayKey('gw_key_123'),
        'anthropic',
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny when in cooldown', async () => {
      mockRedisClient.ttl.mockResolvedValue(30);

      const result = await service.checkCooldown(
        asGatewayKey('gw_key_123'),
        'anthropic',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('cooldown');
      expect(result.reason).toContain('30');
    });

    it('should fallback on error', async () => {
      mockRedisClient.ttl.mockRejectedValue(new Error('Redis error'));

      const result = await service.checkCooldown(
        asGatewayKey('gw_key_123'),
        'anthropic',
      );

      expect(result.allowed).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('setCooldown', () => {
    it('should set cooldown key with TTL', async () => {
      await service.setCooldown(asGatewayKey('gw_key_123'), 'anthropic');

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'rateLimit:cooldown:gw_key_123:anthropic',
        '60',
        'EX',
        60,
      );
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should use configured cooldown seconds', async () => {
      const mockConfig = createMockConfigService({
        rateLimit: { cooldownAfter429: 120 },
        gatewayKey: { clients: [] },
      });

      const newService = new SmartRateLimiterService(
        mockConfig as any,
        mockRedis as any,
        mockLogger as any,
        mockAppMetrics as AppMetricsService,
      );

      await newService.setCooldown(asGatewayKey('gw_key_123'), 'anthropic');

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.any(String),
        '120',
        'EX',
        120,
      );
    });

    it('should not throw on error', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis error'));

      await expect(
        service.setCooldown(asGatewayKey('gw_key_123'), 'anthropic'),
      ).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should do nothing when Redis not ready', async () => {
      (mockRedis.isReady as jest.Mock).mockReturnValue(false);

      await service.setCooldown(asGatewayKey('gw_key_123'), 'anthropic');

      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });
  });
});
