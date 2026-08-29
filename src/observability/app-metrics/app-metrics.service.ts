import { Inject, Injectable } from '@nestjs/common';
import { APP_METRICS_BACKEND } from './app-metrics.tokens';
import { PreMetricsScrapeRegistry } from './pre-metrics-scrape.registry';
import type {
  AppMetricsBackend,
  AppProviderCallContext,
  AppProviderStreamScope,
  AppRequestLabels,
  AppTokenUsage,
  HealthComponent,
  HealthMetricsSnapshot,
  HealthStatus,
  RateLimitReason,
  TokenDirection,
  HttpRequestLabels,
  HttpMethod,
  SemanticCacheLookupResult,
} from './interfaces/app-metrics-backend.interface';
import type {
  ClientId,
  ModelAlias,
  ProviderInstanceId,
} from '../../common/types/branded.types';

/**
 * AppMetricsService provides a two-layer metrics architecture:
 *
 * 1. HTTP Transport Layer - monitors all HTTP requests at the transport level
 *    (GET /health, POST /api/v1/chat, etc.)
 *
 * 2. LLM Domain Layer - monitors LLM-specific operations
 *    (provider calls, token usage, model performance)
 */
@Injectable()
export class AppMetricsService {
  private readonly pipelineHits = new Map<string, number>();
  private readonly pipelineTotal = new Map<string, number>();

  constructor(
    @Inject(APP_METRICS_BACKEND)
    private readonly backend: AppMetricsBackend,
    private readonly preMetricsScrapeRegistry: PreMetricsScrapeRegistry,
  ) {}

  // ========================================
  // HTTP Transport Layer Metrics
  // ========================================

  /**
   * Records an HTTP request at the transport layer.
   * Captures: HTTP method, route, and status code.
   * Use: Called by HTTP middleware for all requests.
   */
  recordHttpRequest(labels: HttpRequestLabels): void {
    this.backend.recordHttpRequest(labels);
  }

  /**
   * Records HTTP request duration at the transport layer.
   * Captures: HTTP method, route, and duration in seconds.
   * Use: Called by HTTP middleware for all requests.
   */
  recordHttpRequestDuration(
    method: HttpMethod,
    route: string,
    durationSec: number,
  ): void {
    this.backend.recordHttpRequestDuration(method, route, durationSec);
  }

  // ========================================
  // LLM Domain Layer Metrics
  // ========================================

  /**
   * Records an LLM request at the domain layer.
   * Captures: LLM method (chat/stream), provider, model, client, and status.
   * Use: Called by observeProviderCall/observeProviderStream.
   */
  recordRequest(labels: AppRequestLabels): void {
    this.backend.recordRequest(labels);
  }

  /**
   * Records LLM request duration.
   * Captures: provider, model, and duration in seconds.
   * Use: Called by observeProviderCall/observeProviderStream.
   */
  recordRequestDuration(
    provider: ProviderInstanceId,
    model: ModelAlias,
    durationSec: number,
  ): void {
    this.backend.recordRequestDuration(provider, model, durationSec);
  }

  /**
   * Records an LLM error.
   * Captures: provider, model, and error code.
   * Use: Called when LLM provider call fails.
   */
  recordError(
    provider: ProviderInstanceId,
    model: ModelAlias,
    errorCode: string,
  ): void {
    this.backend.recordError(provider, model, errorCode);
  }

  /**
   * Records token usage by direction (input/output).
   * Captures: provider, model, direction, and token count.
   * Use: Called after LLM response with usage data.
   */
  recordTokens(
    provider: ProviderInstanceId,
    model: ModelAlias,
    direction: TokenDirection,
    count: number,
  ): void {
    this.backend.recordTokens(provider, model, direction, count);
  }

  /**
   * Records total tokens per request (histogram).
   * Captures: provider, model, and total tokens.
   * Use: Called after LLM response with usage data.
   */
  recordTokensPerRequest(
    provider: ProviderInstanceId,
    model: ModelAlias,
    totalTokens: number,
  ): void {
    this.backend.recordTokensPerRequest(provider, model, totalTokens);
  }

  /**
   * Records token usage (convenience method for both input and output).
   * Use: Called after LLM response with usage data.
   */
  recordTokenUsage(
    provider: ProviderInstanceId,
    model: ModelAlias,
    usage: AppTokenUsage,
  ): void {
    this.backend.recordTokenUsage(provider, model, usage);
  }

  // ========================================
  // Infrastructure Metrics
  // ========================================

  /**
   * Records a rate limit event.
   * Captures: client and reason (rate/burst/concurrency).
   */
  recordRateLimit(client: ClientId, reason: RateLimitReason): void {
    this.backend.recordRateLimit(client, reason);
  }

  /**
   * Records a cache access (hit or miss).
   * Captures: model and hit status.
   */
  recordCacheAccess(model: ModelAlias, hit: boolean): void {
    this.backend.recordCacheAccess(model, hit);
  }

  /**
   * Records a semantic cache lookup outcome.
   * Captures: model and result (hit / hash-hit / below-threshold / error / skip).
   */
  recordSemanticCacheLookup(
    model: ModelAlias,
    result: SemanticCacheLookupResult,
  ): void {
    this.backend.recordSemanticCacheLookup(model, result);
  }

  /**
   * Records a pipeline cache access (exact or semantic hit vs provider miss)
   * and updates `gateway_cache_hit_rate`.
   */
  recordCachePipelineAccess(model: ModelAlias, hit: boolean): void {
    const key = String(model);
    this.pipelineTotal.set(key, (this.pipelineTotal.get(key) ?? 0) + 1);
    if (hit) this.pipelineHits.set(key, (this.pipelineHits.get(key) ?? 0) + 1);
    const total = this.pipelineTotal.get(key) ?? 0;
    const hits = this.pipelineHits.get(key) ?? 0;
    this.backend.updateCacheHitRate(model, total === 0 ? 0 : hits / total);
  }

  /**
   * Updates the cache hit rate gauge.
   * Captures: model and hit rate (0-1).
   */
  updateCacheHitRate(model: ModelAlias, rate: number): void {
    this.backend.updateCacheHitRate(model, rate);
  }

  // ========================================
  // Gauge Metrics (Real-time State)
  // ========================================

  /**
   * Sets the number of active streaming connections for a client.
   */
  setActiveStreams(client: ClientId, count: number): void {
    this.backend.setActiveStreams(client, count);
  }

  /**
   * Sets the health status of a provider.
   */
  setProviderHealth(provider: ProviderInstanceId, healthy: boolean): void {
    this.backend.setProviderHealth(provider, healthy);
  }

  /**
   * Sets the gateway readiness status.
   */
  setReadiness(ready: boolean): void {
    this.backend.setReadiness(ready);
  }

  /**
   * Sets the health status of a component.
   */
  setComponentHealth(component: HealthComponent, status: HealthStatus): void {
    this.backend.setComponentHealth(component, status);
  }

  /**
   * Sets the process uptime in seconds.
   */
  setProcessUpTime(seconds: number): void {
    this.backend.setProcessUpTime(seconds);
  }

  /**
   * Syncs all health metrics from a snapshot.
   */
  syncHealthMetrics(snapshot: HealthMetricsSnapshot): void {
    this.backend.syncHealthMetrics(snapshot);
  }

  // ========================================
  // Observability Helpers
  // ========================================

  /**
   * Exports metrics snapshot for scraping (e.g., GET /metrics).
   * Runs pre-scrape hooks before exporting.
   */
  async getMetricsSnapshot(): Promise<string> {
    await this.preMetricsScrapeRegistry.runAll();
    return this.backend.getMetricsSnapshot();
  }

  /**
   * Observes an LLM provider call and automatically records metrics.
   * Records: request, duration, tokens, and errors.
   */
  observeProviderCall<T>(
    ctx: AppProviderCallContext,
    fn: () => Promise<T>,
    mapUsage?: (result: T) => AppTokenUsage | undefined,
  ): Promise<T> {
    return this.backend.observeProviderCall(ctx, fn, mapUsage);
  }

  /**
   * Observes an LLM provider stream and returns a scope for ending/failing.
   * Records: request, duration, tokens, and errors.
   */
  observeProviderStream(ctx: AppProviderCallContext): AppProviderStreamScope {
    return this.backend.observeProviderStream(ctx);
  }
}
