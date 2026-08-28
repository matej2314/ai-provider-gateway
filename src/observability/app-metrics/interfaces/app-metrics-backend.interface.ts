import type {
  ProviderInstanceId,
  ModelAlias,
  InputTokens,
  OutputTokens,
  ClientId,
} from '../../../common/types/branded.types';

export type AppRequestMethod = 'chat' | 'stream';
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS'
  | 'HEAD';
export interface HttpRequestLabels {
  method: HttpMethod;
  route: string;
  statusCode: number;
}
export type AppRequestStatus = 'success' | 'error' | 'rate_limited';
export type TokenDirection = 'input' | 'output';
export type RateLimitReason = 'rate' | 'burst' | 'concurrency';
export interface AppRequestLabels {
  method: AppRequestMethod;
  provider: ProviderInstanceId;
  model: ModelAlias;
  /** Gateway client identifier (API key owner). */
  client: ClientId | string;
  status: AppRequestStatus;
}
export interface AppTokenUsage {
  inputTokens: InputTokens;
  outputTokens: OutputTokens;
}

export interface AppProviderCallContext {
  method: AppRequestMethod;
  provider: ProviderInstanceId;
  model: ModelAlias;
  client: ClientId | string;
}

export interface AppProviderStreamScope {
  end(usage?: AppTokenUsage): void;
  fail(error: unknown): void;
}

export type HealthComponent =
  | 'config'
  | 'redis'
  | 'cache'
  | 'embeddings'
  | 'vectorStore';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
/**
 * Semantic cache lookup outcome (exact cache keeps recordCacheAccess).
 * `hash-hit` = Redis HASH identity match on trimmed last-user (no embed/KNN).
 * `skip` = early-return without embed/KNN I/O (disabled, multi-turn, no text, circuit open after HASH miss).
 * `error` = failed embed or KNN I/O after an attempt.
 */
export type SemanticCacheLookupResult =
  | 'hit'
  | 'hash-hit'
  | 'below-threshold'
  | 'error'
  | 'skip';

export interface HealthMetricsSnapshot {
  ready: boolean;
  /** Redis omitted when Redis is not required for this deployment. */
  components: Partial<Record<HealthComponent, HealthStatus>> &
    Pick<Record<HealthComponent, HealthStatus>, 'config' | 'cache'>;
}

export interface AppMetricsBackend {
  // --- RED: requests ---
  recordRequest(labels: AppRequestLabels): void;
  recordRequestDuration(
    provider: ProviderInstanceId,
    model: ModelAlias,
    durationSec: number,
  ): void;
  recordError(
    provider: ProviderInstanceId,
    model: ModelAlias,
    errorCode: string,
  ): void;
  // --- LLM throughput (operational, not AI observability) ---
  recordTokens(
    provider: ProviderInstanceId,
    model: ModelAlias,
    direction: TokenDirection,
    count: number,
  ): void;
  recordTokensPerRequest(
    provider: ProviderInstanceId,
    model: ModelAlias,
    totalTokens: number,
  ): void;
  /** Convenience batch — adapters may implement via recordTokens. */
  recordTokenUsage(
    provider: ProviderInstanceId,
    model: ModelAlias,
    usage: AppTokenUsage,
  ): void;
  // --- Infrastructure ---
  recordRateLimit(client: ClientId, reason: RateLimitReason): void;
  recordCacheAccess(model: ModelAlias, hit: boolean): void;
  recordSemanticCacheLookup(
    model: ModelAlias,
    result: SemanticCacheLookupResult,
  ): void;
  /**
   * Pipeline access (exact or semantic hit vs provider miss).
   * Hit-rate aggregation lives in AppMetricsService; adapters may no-op.
   */
  recordCachePipelineAccess(model: ModelAlias, hit: boolean): void;
  updateCacheHitRate(model: ModelAlias, rate: number): void;
  // --- Gauges ---
  setActiveStreams(client: ClientId, count: number): void;
  setProviderHealth(provider: ProviderInstanceId, healthy: boolean): void;
  /**
   * Export snapshot for pull-based scrapers (e.g. GET /metrics).
   * Push-based backends (DataDog agent) may return an empty string.
   */
  getMetricsSnapshot(): Promise<string>;

  observeProviderCall<T>(
    ctx: AppProviderCallContext,
    fn: () => Promise<T>,
    mapUsage?: (result: T) => AppTokenUsage | undefined,
  ): Promise<T>;

  observeProviderStream(ctx: AppProviderCallContext): AppProviderStreamScope;

  setReadiness(ready: boolean): void;
  setComponentHealth(component: HealthComponent, status: HealthStatus): void;
  setProcessUpTime(seconds: number): void;
  syncHealthMetrics(snapshot: HealthMetricsSnapshot): void;

  recordHttpRequest(labels: HttpRequestLabels): void;
  recordHttpRequestDuration(
    method: HttpMethod,
    route: string,
    durationSec: number,
  ): void;
}
