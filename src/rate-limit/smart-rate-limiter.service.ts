import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisConnectionService } from 'src/cache/adapters/redis-cache/redis-connection.service';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

@Injectable()
export class SmartRateLimiterService {
  private readonly logger = new Logger(SmartRateLimiterService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly redisConnection: RedisConnectionService,
  ) {}

  async checkRateLimit(gatewayKey: string): Promise<RateLimitResult> {
    if (!this.redisConnection.isReady()) {
      return {
        allowed: true,
        remaining: 9999999,
        resetAt: new Date(),
      };
    }

    const rps = this.config.get<number>('RATELIMIT_RPS_PER_KEY', 10);
    const burst = this.config.get<number>('RATE_LIMIT_BURST_PER_KEY', 20);

    const key = `rateLimit:key:${gatewayKey}`;
    const now = Date.now();
    const windowMs = 1000;

    try {
      const client = this.redisConnection.getClient();

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

      const result = await client!.eval(
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

      if (allowed === 1) {
        return {
          allowed: true,
          remaining: Math.floor(remaining),
          resetAt: new Date(lastRefill + windowMs),
          reason: 'Rate limit exceeed for gateway key',
        };
      }
    } catch (error) {
      this.logger.error(
        `Rate limit check failed for key ${gatewayKey}: ${error.message}`,
      );

      return { allowed: true, remaining: 999, resetAt: new Date() };
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
      reason: 'Rate limit check failed',
    };
  }

  async checkConcurrentStreams(gatewayKey: string): Promise<RateLimitResult> {
    if (!this.redisConnection.isReady()) {
      return { allowed: true, remaining: 999, resetAt: new Date() };
    }

    const maxConcurrent = this.config.get<number>(
      'RATE_LIMIT_STREAMS_CONCURRENT',
      3,
    );

    const key = `rateLimit:streams:${gatewayKey}`;

    try {
      const client = this.redisConnection.getClient();
      const current = await client!.incr(key);
      await client!.expire(key, 300);
      if (current <= maxConcurrent) {
        return {
          allowed: true,
          remaining: maxConcurrent - current,
          resetAt: new Date(Date.now() + 300000),
        };
      } else {
        await client?.decr(key);
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + 300000),
          reason: `Max concurrent streams (${maxConcurrent}) exceed for gateway key.`,
        };
      }
    } catch (err) {
      this.logger.error(
        `Concurrent streams check failed for key ${gatewayKey}:`,
        err.message,
      );
      return { allowed: true, remaining: 999, resetAt: new Date() };
    }
  }

  async releaseStream(gatewayKey: string): Promise<void> {
    if (!this.redisConnection.isReady()) return;

    const key = `rateLimit:streams:${gatewayKey}`;

    try {
      const client = this.redisConnection.getClient();
      await client!.decr(key);
    } catch (err) {
      this.logger.error(
        `Gailed to release stream for key ${gatewayKey}:`,
        err.message,
      );
    }
  }

  async checkCooldown(
    gatewayKey: string,
    provider: string,
  ): Promise<RateLimitResult> {
    if (!this.redisConnection.isReady()) {
      return { allowed: true, remaining: 999, resetAt: new Date() };
    }

    const key = `rateLimit:cooldown:${gatewayKey}:${provider}`;

    try {
      const ttl = await this.redisConnection.getClient()!.ttl(key);

      if (ttl > 0) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + ttl * 1000),
          reason: `Provider ${provider} in cooldown after 429. ${ttl} remaining.`,
        };
      }

      return { allowed: true, remaining: 999, resetAt: new Date() };
    } catch (err) {
      this.logger.error(
        `Cooldown check failed for ${gatewayKey}:${provider}:`,
        err.message,
      );
      return { allowed: true, remaining: 999, resetAt: new Date() };
    }
  }

  async setCooldown(gatewayKey: string, provider: string): Promise<void> {
    if (!this.redisConnection.isReady()) return;

    const cooldownSeconds = this.config.get<number>(
      'RATE_LIMIT_COOLDOWN_AFTER_429',
      60,
    );

    const key = `rateLimit:cooldown:${gatewayKey}:${provider}`;

    try {
      const client = this.redisConnection.getClient();
      if (client)
        await client.set(key, String(cooldownSeconds), 'EX', cooldownSeconds);
      this.logger.warn(
        `Cooldown set for ${gatewayKey}:${provider} (${cooldownSeconds})s`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to set cooldown for ${gatewayKey}:${provider}:`,
        err.message,
      );
    }
  }
}
