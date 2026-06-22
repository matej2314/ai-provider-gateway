import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheRegistryService } from '../cache/cache-registry.service';
import { RedisConnectionService } from '../cache/adapters/redis-cache/redis-connection.service';
import {
  getRedisConsumersFromConfig,
  isRedisRequiredFromConfig,
  RedisConsumer,
} from '../cache/should-include-redis-stack';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
}

export interface HealthRedisCheckResult extends HealthCheckResult {
  required: boolean;
  consumers?: RedisConsumer[];
}

@Injectable()
export class HealthService {
  constructor(
    private readonly config: ConfigService,
    private readonly cacheRegistry: CacheRegistryService,
    private readonly redisConnection: RedisConnectionService,
  ) {}

  getLiveness() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const configCheck = this.checkConfig();
    const redisCheck = await this.checkRedis();
    const cacheCheck = this.checkCache(redisCheck);

    const checks = {
      config: configCheck,
      redis: redisCheck,
      cache: cacheCheck,
    };

    const allHealthy = Object.values(checks).every(
      (check) => check.status === 'healthy' || check.status === 'degraded',
    );

    return {
      status: allHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      uptime: Math.floor(process.uptime()),
      checks,
    };
  }

  private checkConfig(): HealthCheckResult {
    const hasGatewayConfig = !!this.config.get('gateway');
    const hasResolvedPrompts = !!this.config.get('resolvedSystemPrompts');

    if (hasGatewayConfig && hasResolvedPrompts) {
      return {
        status: 'healthy',
        message: 'Config is loaded',
      };
    }

    return {
      status: 'unhealthy',
      message: 'Config is missing or incomplete.',
    };
  }

  private checkCache(redisCheck: HealthRedisCheckResult): HealthCheckResult {
    const cacheConfig = this.config.get<{
      enabled?: boolean;
      backend?: string;
    }>('cache');

    const backendId = (cacheConfig?.backend ?? 'noop').toLowerCase();

    if (!cacheConfig?.enabled || backendId === 'noop') {
      return {
        status: 'healthy',
        message: 'Cache disabled (noop)',
      };
    }

    if (backendId === 'redis') {
      if (redisCheck.status === 'healthy') {
        return {
          status: 'healthy',
          message: 'Cache enabled (redis backend).',
        };
      }

      return {
        status: 'degraded',
        message: 'Cache enabled (redis backend unavailable).',
      };
    }

    const backend = this.cacheRegistry.resolve();

    if (!backend.isAvailable()) {
      return {
        status: 'degraded',
        message: `Cache backend ${backendId} unavailable`,
      };
    }

    return {
      status: 'healthy',
      message: `Cache backend ${backendId} available`,
    };
  }

  private async checkRedis(): Promise<HealthRedisCheckResult> {
    const required = isRedisRequiredFromConfig(this.config);

    if (!required) {
      return {
        status: 'healthy',
        message: 'Redis not required.',
        required: false,
      };
    }

    const consumers = getRedisConsumersFromConfig(this.config);
    const pingOk = await this.redisConnection.ping();

    if (pingOk) {
      return {
        status: 'healthy',
        message: 'Redis available',
        required: true,
        consumers,
      };
    }

    if (this.redisConnection.isReady()) {
      return {
        status: 'degraded',
        message: 'Redis connected but ping failed',
        required: true,
        consumers,
      };
    }

    return {
      status: 'degraded',
      message: 'Redis required but unavailable',
      required: true,
      consumers,
    };
  }
}
