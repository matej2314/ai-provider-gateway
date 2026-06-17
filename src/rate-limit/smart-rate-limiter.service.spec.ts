import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmartRateLimiterService } from './smart-rate-limiter.service';
import { RedisConnectionService } from '../cache/adapters/redis-cache/redis-connection.service';
import { LoggingService } from '../logging/logging.service';
import { createMockLoggingService } from '../common/mocks/createMockLoggingService';
import { createMockConfigService } from '../common/mocks/createMockConfigService';

describe('SmartRateLimiterService', () => {
  let service: SmartRateLimiterService;
  let mockConfig: Partial<ConfigService>;
  let mockRedis: Partial<RedisConnectionService>;
  let mockLogger: Partial<LoggingService>;
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
        rps: 10,
        burst: 20,
        maxConcurrentStreams: 3,
        cooldownAfter429: 60,
      },
    });

    mockRedis = {
      isReady: jest.fn().mockReturnValue(true),
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    mockLogger = createMockLoggingService();

    const module = await Test.createTestingModule({
      providers: [
        SmartRateLimiterService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: RedisConnectionService, useValue: mockRedis },
        { provide: LoggingService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(SmartRateLimiterService);
  });

  describe('checkRateLimit', () => {
    it('should allow when Redis not ready', async () => {
      (mockRedis.isReady as jest.Mock).mockReturnValue(false);

      const result = await service.checkRateLimit('gw_key_123');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(1000);
    });

    it('should allow when tokens available', async () => {
      mockRedisClient.eval.mockResolvedValue([1, 19, Date.now()]);

      const result = await service.checkRateLimit('gw_key_123');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(19);
    });

    it('should deny when no tokens', async () => {
      mockRedisClient.eval.mockResolvedValue([0, 0, Date.now()]);

      const result = await service.checkRateLimit('gw_key_123');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.reason).toContain('Rate limit exceeded');
    });

    it('should use default limits when client not configured', async () => {
      mockRedisClient.eval.mockResolvedValue([1, 19, Date.now()]);

      await service.checkRateLimit('gw_unknown_key');

      expect(mockRedisClient.eval).toHaveBeenCalled();
      const args = (mockRedisClient.eval as jest.Mock).mock.calls[0];
      expect(args[4]).toBe('10');
      expect(args[5]).toBe('20');
    });

    it('should fallback to allowed on Redis error', async () => {
      mockRedisClient.eval.mockRejectedValue(new Error('Redis error'));

      const result = await service.checkRateLimit('gw_key_123');

      expect(result.allowed).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should include resetAt timestamp', async () => {
      const now = Date.now();
      mockRedisClient.eval.mockResolvedValue([1, 19, now]);

      const result = await service.checkRateLimit('gw_key_123');

      expect(result.resetAt).toBeInstanceOf(Date);
    });
  });

  describe('checkConcurrentStreams', () => {
    it('should allow when Redis not ready', async () => {
      (mockRedis.isReady as jest.Mock).mockReturnValue(false);

      const result = await service.checkConcurrentStreams('gw_key_123');

      expect(result.allowed).toBe(true);
    });

    it('should allow when under limit', async () => {
      mockRedisClient.incr.mockResolvedValue(2);

      const result = await service.checkConcurrentStreams('gw_key_123');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should deny when at limit', async () => {
      mockRedisClient.incr.mockResolvedValue(4);

      const result = await service.checkConcurrentStreams('gw_key_123');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Max concurrent streams');
      expect(mockRedisClient.decr).toHaveBeenCalled();
    });

    it('should set expire on counter', async () => {
      mockRedisClient.incr.mockResolvedValue(1);

      await service.checkConcurrentStreams('gw_key_123');

      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'rateLimit:streams:gw_key_123',
        300,
      );
    });

    it('should fallback on error', async () => {
      mockRedisClient.incr.mockRejectedValue(new Error('Redis error'));

      const result = await service.checkConcurrentStreams('gw_key_123');

      expect(result.allowed).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('releaseStream', () => {
    it('should decrement counter', async () => {
      await service.releaseStream('gw_key_123');

      expect(mockRedisClient.decr).toHaveBeenCalledWith(
        'rateLimit:streams:gw_key_123',
      );
    });

    it('should not throw on error', async () => {
      mockRedisClient.decr.mockRejectedValue(new Error('Redis error'));

      await expect(service.releaseStream('gw_key_123')).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should do nothing when Redis not ready', async () => {
      (mockRedis.isReady as jest.Mock).mockReturnValue(false);

      await service.releaseStream('gw_key_123');

      expect(mockRedisClient.decr).not.toHaveBeenCalled();
    });
  });

  describe('checkCooldown', () => {
    it('should allow when Redis not ready', async () => {
      (mockRedis.isReady as jest.Mock).mockReturnValue(false);

      const result = await service.checkCooldown('gw_key_123', 'anthropic');

      expect(result.allowed).toBe(true);
    });

    it('should allow when no cooldown', async () => {
      mockRedisClient.ttl.mockResolvedValue(-1);

      const result = await service.checkCooldown('gw_key_123', 'anthropic');

      expect(result.allowed).toBe(true);
    });

    it('should deny when in cooldown', async () => {
      mockRedisClient.ttl.mockResolvedValue(30);

      const result = await service.checkCooldown('gw_key_123', 'anthropic');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('cooldown');
      expect(result.reason).toContain('30');
    });

    it('should fallback on error', async () => {
      mockRedisClient.ttl.mockRejectedValue(new Error('Redis error'));

      const result = await service.checkCooldown('gw_key_123', 'anthropic');

      expect(result.allowed).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('setCooldown', () => {
    it('should set cooldown key with TTL', async () => {
      await service.setCooldown('gw_key_123', 'anthropic');

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
      );

      await newService.setCooldown('gw_key_123', 'anthropic');

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
        service.setCooldown('gw_key_123', 'anthropic'),
      ).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should do nothing when Redis not ready', async () => {
      (mockRedis.isReady as jest.Mock).mockReturnValue(false);

      await service.setCooldown('gw_key_123', 'anthropic');

      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });
  });
});
