import { Injectable } from '@nestjs/common';
import { PrometheusService } from '../prometheus.service';
import type {
  AppMetricsBackend,
  AppRequestLabels,
  AppTokenUsage,
  TokenDirection,
  RateLimitReason,
  AppProviderStreamScope,
  AppProviderCallContext,
  HealthComponent,
  HealthMetricsSnapshot,
  HealthStatus,
  HttpRequestLabels,
  HttpMethod,
  SemanticCacheLookupResult,
} from '../interfaces/app-metrics-backend.interface';
import type {
  ClientId,
  ModelAlias,
  ProviderInstanceId,
} from '../../../common/types/branded.types';

function healthStatusToGaugeValue(status: HealthStatus): number {
  switch (status) {
    case 'unhealthy':
      return 0;
    case 'degraded':
      return 0.5;
    case 'healthy':
      return 1;
  }
}

@Injectable()
export class PrometheusAppMetricsAdapter implements AppMetricsBackend {
  constructor(private readonly prometheus: PrometheusService) {}

  async observeProviderCall<T>(
    ctx: AppProviderCallContext,
    fn: () => Promise<T>,
    mapUsage?: (result: T) => AppTokenUsage | undefined,
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      this.recordProviderSuccess(ctx, startTime, mapUsage?.(result));
      return result;
    } catch (error) {
      this.recordProviderFailure(ctx, startTime, error);
      throw error;
    }
  }

  private recordProviderSuccess(
    ctx: AppProviderCallContext,
    start: number,
    usage?: AppTokenUsage,
  ) {
    const durationSec = (Date.now() - start) / 1000;
    this.recordRequest({ ...ctx, status: 'success' });
    this.recordRequestDuration(ctx.provider, ctx.model, durationSec);
    if (usage) {
      this.recordTokenUsage(ctx.provider, ctx.model, usage);
      this.recordTokensPerRequest(
        ctx.provider,
        ctx.model,
        usage.inputTokens + usage.outputTokens,
      );
    }
  }

  private recordProviderFailure(
    ctx: AppProviderCallContext,
    start: number,
    error: unknown,
  ) {
    const durationSec = (Date.now() - start) / 1000;
    this.recordRequest({ ...ctx, status: 'error' });
    this.recordRequestDuration(ctx.provider, ctx.model, durationSec);
    this.recordError(
      ctx.provider,
      ctx.model,
      error instanceof Error ? error.message : String(error),
    );
  }

  observeProviderStream(ctx: AppProviderCallContext): AppProviderStreamScope {
    const startTime = Date.now();
    return {
      end: (usage?: AppTokenUsage) =>
        this.recordProviderSuccess(ctx, startTime, usage),
      fail: (error: unknown) =>
        this.recordProviderFailure(ctx, startTime, error),
    };
  }

  recordHttpRequest(labels: HttpRequestLabels): void {
    this.prometheus.metrics.httpRequestsTotal.inc({
      method: labels.method,
      route: labels.route,
      status_code: labels.statusCode.toString(),
    });
  }

  recordHttpRequestDuration(
    method: HttpMethod,
    route: string,
    durationSec: number,
  ): void {
    this.prometheus.metrics.httpRequestDuration.observe(
      { method, route },
      durationSec,
    );
  }

  recordRequest(labels: AppRequestLabels): void {
    this.prometheus.metrics.llmRequestsTotal.inc({
      method: labels.method,
      provider: labels.provider,
      model: labels.model,
      client: labels.client,
      status: labels.status,
    });
  }

  recordRequestDuration(
    provider: ProviderInstanceId,
    model: ModelAlias,
    durationSec: number,
  ): void {
    this.prometheus.metrics.llmRequestDuration.observe(
      { provider, model },
      durationSec,
    );
  }

  recordError(
    provider: ProviderInstanceId,
    model: ModelAlias,
    errorCode: string,
  ): void {
    this.prometheus.metrics.llmErrorsTotal.inc({
      provider,
      model,
      error_code: errorCode,
    });
  }

  recordTokens(
    provider: ProviderInstanceId,
    model: ModelAlias,
    direction: TokenDirection,
    count: number,
  ): void {
    if (count <= 0) return;

    this.prometheus.metrics.llmTokensTotal.inc(
      { provider, model, token_type: direction },
      count,
    );
  }

  recordTokensPerRequest(
    provider: ProviderInstanceId,
    model: ModelAlias,
    totalTokens: number,
  ): void {
    if (totalTokens <= 0) return;

    this.prometheus.metrics.llmTokensPerRequest.observe(
      { provider, model },
      totalTokens,
    );
  }

  recordTokenUsage(
    provider: ProviderInstanceId,
    model: ModelAlias,
    usage: AppTokenUsage,
  ): void {
    this.recordTokens(provider, model, 'input', usage.inputTokens);
    this.recordTokens(provider, model, 'output', usage.outputTokens);
  }

  recordRateLimit(client: ClientId, reason: RateLimitReason): void {
    this.prometheus.metrics.rateLimitsTotal.inc({ client, reason });
  }

  recordCacheAccess(model: ModelAlias, hit: boolean): void {
    this.prometheus.metrics.cacheAccessTotal.inc({
      model,
      hit: hit ? 'true' : 'false',
    });
  }

  recordSemanticCacheLookup(
    model: ModelAlias,
    result: SemanticCacheLookupResult,
  ): void {
    this.prometheus.metrics.semanticCacheLookupTotal.inc({ model, result });
  }

  recordCachePipelineAccess(_model: ModelAlias, _hit: boolean): void {
    return;
  }

  updateCacheHitRate(model: ModelAlias, rate: number): void {
    this.prometheus.metrics.cacheHitRate.set({ model }, rate);
  }

  setActiveStreams(client: ClientId, count: number): void {
    this.prometheus.metrics.activeStreams.set({ client }, count);
  }

  setProviderHealth(provider: ProviderInstanceId, healthy: boolean): void {
    this.prometheus.metrics.providerHealth.set({ provider }, healthy ? 1 : 0);
  }

  setReadiness(ready: boolean): void {
    this.prometheus.metrics.gatewayReadiness.set(ready ? 1 : 0);
  }

  setComponentHealth(component: HealthComponent, status: HealthStatus): void {
    this.prometheus.metrics.gatewayHealthStatus.set(
      { component },
      healthStatusToGaugeValue(status),
    );
  }

  setProcessUpTime(seconds: number): void {
    this.prometheus.metrics.processUptimeSeconds.set(seconds);
  }

  syncHealthMetrics(snapshot: HealthMetricsSnapshot): void {
    this.setReadiness(snapshot.ready);
    for (const component of Object.keys(
      snapshot.components,
    ) as HealthComponent[]) {
      const status = snapshot.components[component];
      if (status) {
        this.setComponentHealth(component, status);
      }
    }
  }

  async getMetricsSnapshot(): Promise<string> {
    return this.prometheus.getMetrics();
  }
}
