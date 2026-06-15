import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheRegistryService } from '../cache/cache-registry.service';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly config: ConfigService,
    private readonly cacheRegistry: CacheRegistryService,
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
      cache: this.checkCache(),
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

  private checkCache(): HealthCheckResult {
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

    const backend = this.cacheRegistry.resolve();

    if (!backend.isAvailable()) {
      return {
        status: 'degraded',
        message: `Cache backend "${backendId}" unavailable`,
      };
    }

    return {
      status: 'healthy',
      message: `Cache backend "${backendId}" available`,
    };
  }
}
