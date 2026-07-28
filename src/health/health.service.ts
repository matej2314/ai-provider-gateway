import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfig } from '../config/typed-config';
import { AppMetricsService } from '../observability/app-metrics/app-metrics.service';
import { PreMetricsScrapeRegistry } from '../observability/app-metrics/pre-metrics-scrape.registry';
import { CacheRegistryService } from '../cache/cache-registry.service';
import { RedisConnectionService } from '../cache/adapters/redis-cache/redis-connection.service';
import {
  getRedisConsumersFromConfig,
  isRedisRequiredFromConfig,
  RedisConsumer,
} from '../cache/should-include-redis-stack';
import { LoggingService } from 'src/logging/logging.service';
import { HealthReadinessResponseDto } from './dto/health-readiness-response.dto';
import type { HealthMetricsSnapshot } from '../observability/app-metrics/interfaces/app-metrics-backend.interface';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
}

export interface HealthRedisCheckResult extends HealthCheckResult {
  required: boolean;
  consumers?: RedisConsumer[];
}

@Injectable()
export class HealthService implements OnModuleInit {
  private static readonly SCRAPE_REFRESH_MS = 5_000;

  private readonly logger: LoggingService;
  private lastAggregateStatus: 'ready' | 'not_ready' | undefined;
  private lastScrapeRefreshAt = 0;
  private scrapeRefreshInFlight: Promise<void> | undefined;

  constructor(
    private readonly config: ConfigService,
    private readonly cacheRegistry: CacheRegistryService,
    @Optional()
    @Inject(RedisConnectionService)
    private readonly redisConnection: RedisConnectionService | undefined,
    private readonly appMetrics: AppMetricsService,
    private readonly preMetricsScrapeRegistry: PreMetricsScrapeRegistry,
    loggingService: LoggingService,
  ) {
    this.logger = loggingService.child({ module: 'HealthService' });
  }

  async onModuleInit(): Promise<void> {
    this.preMetricsScrapeRegistry.register(() =>
      this.refreshMetricsForScrape(),
    );
    await this.refreshMetricsForScrape();
  }

  getLiveness() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  async evaluateReadiness(): Promise<HealthReadinessResponseDto> {
    const configCheck = this.checkConfig();
    const redisRequired = isRedisRequiredFromConfig(this.config);
    const redisCheck = redisRequired ? await this.checkRedis() : undefined;
    const cacheCheck = this.checkCache(redisCheck);

    const checks: HealthReadinessResponseDto['checks'] = {
      config: configCheck,
      cache: cacheCheck,
      ...(redisCheck ? { redis: redisCheck } : {}),
    };

    const allHealthy = [
      configCheck,
      cacheCheck,
      ...(redisCheck ? [redisCheck] : []),
    ].every(
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

  async getReadiness(): Promise<HealthReadinessResponseDto> {
    const result = await this.evaluateReadiness();
    this.publishMetrics(result);
    return result;
  }

  async refreshMetricsForScrape(): Promise<void> {
    if (this.scrapeRefreshInFlight) {
      return this.scrapeRefreshInFlight;
    }

    const now = Date.now();
    if (now - this.lastScrapeRefreshAt < HealthService.SCRAPE_REFRESH_MS) {
      return;
    }

    this.scrapeRefreshInFlight = this.runScrapeRefresh().finally(() => {
      this.scrapeRefreshInFlight = undefined;
      this.lastScrapeRefreshAt = Date.now();
    });

    return this.scrapeRefreshInFlight;
  }

  publishMetrics(result: HealthReadinessResponseDto): void {
    const components: HealthMetricsSnapshot['components'] = {
      config: result.checks.config.status,
      cache: result.checks.cache.status,
    };
    if (result.checks.redis) {
      components.redis = result.checks.redis.status;
    }

    this.appMetrics.syncHealthMetrics({
      ready: result.status === 'ready',
      components,
    });
    this.appMetrics.setProcessUpTime(result.uptime);

    if (this.lastAggregateStatus !== result.status) {
      const context = {
        previous: this.lastAggregateStatus,
        current: result.status,
        checks: result.checks,
      };

      if (result.status === 'ready') {
        this.logger.info('Readiness status changed', context);
      } else {
        this.logger.error('Readiness status changed', undefined, context);
      }

      this.lastAggregateStatus = result.status;
    }
  }

  private async runScrapeRefresh(): Promise<void> {
    const result = await this.evaluateReadiness();
    this.publishMetrics(result);
  }

  private checkConfig(): HealthCheckResult {
    const hasGatewayConfig = !!getAppConfig(this.config, 'gateway');
    const hasResolvedPrompts = !!getAppConfig(
      this.config,
      'resolvedSystemPrompts',
    );

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

  private checkCache(redisCheck?: HealthRedisCheckResult): HealthCheckResult {
    const cacheConfig = getAppConfig(this.config, 'cache');

    const backendId = (cacheConfig?.backend ?? 'noop').toLowerCase();

    if (!cacheConfig?.enabled || backendId === 'noop') {
      return {
        status: 'healthy',
        message: 'Cache disabled (noop)',
      };
    }

    if (backendId === 'redis') {
      if (redisCheck?.status === 'healthy') {
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
    const consumers = getRedisConsumersFromConfig(this.config);

    if (!this.redisConnection) {
      return {
        status: 'degraded',
        message: 'Redis required but unavailable',
        required: true,
        consumers,
      };
    }

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
