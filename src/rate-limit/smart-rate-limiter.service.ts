import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppMetricsService } from '../observability/app-metrics/app-metrics.service';
import { getAppConfig, getAppConfigOrThrow } from '../config/typed-config';
import { RedisConnectionService } from '../cache/adapters/redis-cache/redis-connection.service';
import { ResolvedGatewayClient } from '../config/configuration.types';
import { LoggingService } from '../logging/logging.service';
import { resolveClientIdFromKey } from '../common/resolveClientIdFromKey';
import type { GatewayKey, ClientId } from '../common/types/branded.types';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

@Injectable()
export class SmartRateLimiterService {
  private readonly logger: LoggingService;
  private readonly clientsMap: Map<GatewayKey, ResolvedGatewayClient>;

  constructor(
    private readonly config: ConfigService,
    @Optional()
    @Inject(RedisConnectionService)
    private readonly redisConnection: RedisConnectionService | undefined,
    private readonly loggingService: LoggingService,
    private readonly appMetrics: AppMetricsService,
  ) {
    const logger = this.loggingService.child({
      module: 'SmartRateLimiterService',
    });
    this.logger = logger;

    const gatewayKeyConfig = getAppConfigOrThrow(this.config, 'gatewayKey');
    this.clientsMap = new Map(
      gatewayKeyConfig.clients
        .filter((client) => client.gatewayKey)
        .map((client) => [client.gatewayKey, client]),
    );
  }

  private getLimitsForClient(gatewayKey: GatewayKey) {
    const client = this.clientsMap.get(gatewayKey);

    if (client?.rateLimit) {
      return {
        rps: client.rateLimit.rps,
        burst: client.rateLimit.burst,
        maxConcurrentStreams: client.rateLimit.maxConcurrentStreams,
      };
    }

    const rateLimit = getAppConfig(this.config, 'rateLimit');
    return {
      rps: rateLimit?.rps ?? 10,
      burst: rateLimit?.burst ?? 20,
      maxConcurrentStreams: rateLimit?.maxConcurrentStreams ?? 3,
    };
  }

  async checkRateLimit(gatewayKey: GatewayKey): Promise<RateLimitResult> {
    if (!this.redisConnection?.isReady()) {
      return {
        allowed: true,
        remaining: 9999999,
        resetAt: new Date(),
      };
    }

    const limits = this.getLimitsForClient(gatewayKey);
    const { rps, burst } = limits;

    const key = `rateLimit:key:${gatewayKey}`;
    const now = Date.now();
    const windowMs = 1000;

    try {
      const client = this.redisConnection.getClient();

      if (!client) {
        return { allowed: true, remaining: 999, resetAt: new Date() };
      }

      const script = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local rate = tonumber(ARGV[2])
        local burst = tonumber(ARGV[3])
        local window = tonumber(ARGV[4])
        
        local bucket = redis.call('HGETALL', key)
        local tokens = burst
        local lastRefill = now
        
        if #bucket > 0 then
          for i = 1, #bucket, 2 do
            if bucket[i] == 'tokens' then
              tokens = tonumber(bucket[i+1])
            elseif bucket[i] == 'lastRefill' then
              lastRefill = tonumber(bucket[i+1])
            end
          end
          
          -- Refill tokens based on time passed
          local elapsed = now - lastRefill
          local refillAmount = math.floor((elapsed / window) * rate)
          tokens = math.min(burst, tokens + refillAmount)
          lastRefill = now
        end
        
        if tokens >= 1 then
          tokens = tokens - 1
          redis.call('HSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
          redis.call('EXPIRE', key, 60)
          return {1, tokens, lastRefill}
        else
          return {0, 0, lastRefill}
        end
      `;

      const result = await client.eval(
        script,
        1,
        key,
        now.toString(),
        rps.toString(),
        burst.toString(),
        windowMs.toString(),
      );

      const [allowed, remaining, lastRefill] = result as [
        number,
        number,
        number,
      ];

      const clients = Array.from(this.clientsMap.values());
      const clientId = resolveClientIdFromKey(gatewayKey, clients);

      if (!allowed) {
        this.appMetrics.recordRateLimit(clientId, 'rate');
        this.logger.warn(
          `Rate limit exceeded for client: ${clientId}, key: ${gatewayKey}`,
        );
      }

      if (allowed === 1) {
        return {
          allowed: true,
          remaining: Math.floor(remaining),
          resetAt: new Date(lastRefill + windowMs),
        };
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `Rate limit check failed for key ${gatewayKey}: ${error.message}`,
        error,
      );

      return { allowed: true, remaining: 999, resetAt: new Date() };
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
      reason: 'Rate limit exceeded for gateway key.',
    };
  }

  async checkConcurrentStreams(
    gatewayKey: GatewayKey,
    clientId: ClientId,
  ): Promise<RateLimitResult> {
    if (!this.redisConnection?.isReady()) {
      return { allowed: true, remaining: 999, resetAt: new Date() };
    }

    const limits = this.getLimitsForClient(gatewayKey);
    const { maxConcurrentStreams: maxConcurrent } = limits;

    const key = `rateLimit:streams:${gatewayKey}`;

    try {
      const client = this.redisConnection.getClient();
      if (!client) {
        return { allowed: true, remaining: 999, resetAt: new Date() };
      }

      const current = await client.incr(key);
      await client.expire(key, 300);
      if (current <= maxConcurrent) {
        return {
          allowed: true,
          remaining: maxConcurrent - current,
          resetAt: new Date(Date.now() + 300000),
        };
      } else {
        await client.decr(key);
        this.appMetrics.recordRateLimit(clientId, 'concurrency');
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + 300000),
          reason: `Max concurrent streams (${maxConcurrent}) exceeded for gateway key.`,
        };
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `Concurrent streams check failed for key ${gatewayKey}:`,
        error,
      );
      return { allowed: true, remaining: 999, resetAt: new Date() };
    }
  }

  async releaseStream(gatewayKey: GatewayKey): Promise<void> {
    if (!this.redisConnection?.isReady()) return;

    const key = `rateLimit:streams:${gatewayKey}`;

    try {
      const client = this.redisConnection.getClient();
      if (!client) return;

      await client.decr(key);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `Failed to release stream for key ${gatewayKey}:`,
        error,
      );
    }
  }

  async checkCooldown(
    gatewayKey: GatewayKey,
    provider: string,
  ): Promise<RateLimitResult> {
    if (!this.redisConnection?.isReady()) {
      return { allowed: true, remaining: 999, resetAt: new Date() };
    }

    const key = `rateLimit:cooldown:${gatewayKey}:${provider}`;

    try {
      const client = this.redisConnection.getClient();
      if (!client) {
        return { allowed: true, remaining: 999, resetAt: new Date() };
      }

      const ttl = await client.ttl(key);

      if (ttl > 0) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + ttl * 1000),
          reason: `Provider ${provider} in cooldown after 429. ${ttl} remaining.`,
        };
      }

      return { allowed: true, remaining: 999, resetAt: new Date() };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `Cooldown check failed for ${gatewayKey}:${provider}:`,
        error,
      );
      return { allowed: true, remaining: 999, resetAt: new Date() };
    }
  }

  async setCooldown(gatewayKey: GatewayKey, provider: string): Promise<void> {
    if (!this.redisConnection?.isReady()) return;

    const cooldownSeconds =
      getAppConfig(this.config, 'rateLimit')?.cooldownAfter429 ?? 60;

    const key = `rateLimit:cooldown:${gatewayKey}:${provider}`;

    try {
      const client = this.redisConnection.getClient();
      if (client)
        await client.set(key, String(cooldownSeconds), 'EX', cooldownSeconds);
      this.logger.warn(
        `Cooldown set for ${gatewayKey}:${provider} (${cooldownSeconds})s`,
      );
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `Failed to set cooldown for ${gatewayKey}:${provider}:`,
        error,
      );
    }
  }
}
