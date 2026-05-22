import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisCacheAdapter } from 'src/cache/adapters/redis-cache/redis-cache.adapter';

export interface HealtCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisCacheAdapter,
  ) {}

  getLiveness() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  getReadiness() {
    const checks = {
      config: this.checkConfig(),
      redis: this.checkRedis(),
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

  private checkConfig(): HealtCheckResult {
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

  private checkRedis(): HealtCheckResult {
    if (!this.redis.isAvailable()) {
      return {
        status: 'degraded',
        message: 'Redis unavailable (graceful degradation)',
      };
    }
    return {
      status: 'healthy',
      message: 'Redis connected',
    };
  }
}
