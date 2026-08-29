import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfig, getAppConfigOrThrow } from '../config/typed-config';
import { AppMetricsService } from '../observability/app-metrics/app-metrics.service';
import { PreMetricsScrapeRegistry } from '../observability/app-metrics/pre-metrics-scrape.registry';
import { RedisConnectionService } from '../cache/adapters/redis-cache/redis-connection.service';
import { SemanticCacheService } from '../cache/semantic/semantic-cache.service';
import { VECTOR_STORE } from '../cache/semantic/semantic-cache.tokens';
import type { VectorStore } from '../cache/semantic/vector-store.interface';
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
  private static readonly EMBEDDINGS_PROBE_REFRESH_MS = 5_000;
  private static readonly VECTOR_STORE_PROBE_REFRESH_MS = 5_000;

  private readonly logger: LoggingService;
  private lastAggregateStatus: 'ready' | 'not_ready' | undefined;
  private lastScrapeRefreshAt = 0;
  private lastEmbeddingsProbeAt = 0;
  private lastEmbeddingsCheck: HealthCheckResult | undefined;
  private embeddingsProbeInFlight: Promise<HealthCheckResult> | undefined;
  private lastVectorStoreProbeAt = 0;
  private lastVectorStoreCheck: HealthCheckResult | undefined;
  private vectorStoreProbeInFlight: Promise<HealthCheckResult> | undefined;
  private scrapeRefreshInFlight: Promise<void> | undefined;

  constructor(
    private readonly config: ConfigService,
    @Optional()
    @Inject(RedisConnectionService)
    private readonly redisConnection: RedisConnectionService | undefined,
    private readonly appMetrics: AppMetricsService,
    private readonly preMetricsScrapeRegistry: PreMetricsScrapeRegistry,
    loggingService: LoggingService,
    @Optional()
    private readonly semanticCache?: SemanticCacheService,
    @Optional()
    @Inject(VECTOR_STORE)
    private readonly vectorStore?: VectorStore,
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
    const embeddingsCheck = await this.checkEmbeddings();
    const vectorStoreCheck = await this.checkVectorStore();
    const cacheCheck = this.checkCache(
      redisCheck,
      embeddingsCheck,
      vectorStoreCheck,
    );

    const checks: HealthReadinessResponseDto['checks'] = {
      config: configCheck,
      cache: cacheCheck,
      ...(redisCheck ? { redis: redisCheck } : {}),
      ...(embeddingsCheck ? { embeddings: embeddingsCheck } : {}),
      ...(vectorStoreCheck ? { vectorStore: vectorStoreCheck } : {}),
    };

    const allHealthy = [
      configCheck,
      cacheCheck,
      ...(redisCheck ? [redisCheck] : []),
      ...(embeddingsCheck ? [embeddingsCheck] : []),
      ...(vectorStoreCheck ? [vectorStoreCheck] : []),
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
    if (result.checks.embeddings) {
      components.embeddings = result.checks.embeddings.status;
    }
    if (result.checks.vectorStore) {
      components.vectorStore = result.checks.vectorStore.status;
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

  private checkCache(
    redisCheck?: HealthRedisCheckResult,
    embeddingsCheck?: HealthCheckResult,
    vectorStoreCheck?: HealthCheckResult,
  ): HealthCheckResult {
    const cacheConfig = getAppConfig(this.config, 'cache');
    const semanticEnabled =
      getAppConfig(this.config, 'semanticCache')?.enabled === true;
    const backendId = (cacheConfig?.backend ?? 'noop').toLowerCase();
    const exactEnabled = cacheConfig?.enabled === true && backendId === 'redis';

    if (!exactEnabled && !semanticEnabled) {
      return {
        status: 'healthy',
        message: 'Cache disabled (noop)',
      };
    }

    const failed: string[] = [];

    if (exactEnabled) {
      const exactOk = redisCheck?.status === 'healthy';
      if (!exactOk) failed.push('exact-redis');
    }

    if (semanticEnabled) {
      if (embeddingsCheck?.status !== 'healthy') failed.push('embeddings');
      if (vectorStoreCheck?.status !== 'healthy') failed.push('vectorStore');
    }

    if (failed.length === 0) {
      return {
        status: 'healthy',
        message: `Cache pipeline healthy (exact=${exactEnabled}, semantic=${semanticEnabled})`,
      };
    }

    return {
      status: 'degraded',
      message: `Cache pipeline degraded (${failed.join(', ')})`,
    };
  }

  private async checkEmbeddings(): Promise<HealthCheckResult | undefined> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return undefined;
    if (!this.semanticCache) {
      return {
        status: 'degraded',
        message: 'Embedding service unavailable',
      };
    }

    const now = Date.now();
    if (
      this.lastEmbeddingsCheck &&
      now - this.lastEmbeddingsProbeAt <
        HealthService.EMBEDDINGS_PROBE_REFRESH_MS
    ) {
      return this.lastEmbeddingsCheck;
    }

    if (this.embeddingsProbeInFlight) {
      return this.embeddingsProbeInFlight;
    }

    this.embeddingsProbeInFlight = (async () => {
      const available = await this.semanticCache?.probeEmbedding();
      const result: HealthCheckResult = available
        ? { status: 'healthy', message: 'Embedding service available' }
        : { status: 'degraded', message: 'Embedding service unavailable' };
      this.lastEmbeddingsCheck = result;
      this.lastEmbeddingsProbeAt = Date.now();
      return result;
    })().finally(() => {
      this.embeddingsProbeInFlight = undefined;
    });

    return this.embeddingsProbeInFlight;
  }

  private async checkVectorStore(): Promise<HealthCheckResult | undefined> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return undefined;
    if (!this.vectorStore) {
      return {
        status: 'degraded',
        message: 'Vector store unavailable',
      };
    }

    const now = Date.now();
    if (
      this.lastVectorStoreCheck &&
      now - this.lastVectorStoreProbeAt <
        HealthService.VECTOR_STORE_PROBE_REFRESH_MS
    ) {
      return this.lastVectorStoreCheck;
    }

    if (this.vectorStoreProbeInFlight) {
      return this.vectorStoreProbeInFlight;
    }

    this.vectorStoreProbeInFlight = (async () => {
      const probe = await this.vectorStore?.probeIndex();
      const result: HealthCheckResult = probe?.available
        ? { status: 'healthy', message: probe.message }
        : {
            status: 'degraded',
            message: probe?.message ?? 'Vector store unavailable',
          };
      this.lastVectorStoreCheck = result;
      this.lastVectorStoreProbeAt = Date.now();
      return result;
    })().finally(() => {
      this.vectorStoreProbeInFlight = undefined;
    });

    return this.vectorStoreProbeInFlight;
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
