import type { Counter, Gauge, Histogram } from 'prom-client';

/**
 * prom-client instrument registry for the Prometheus adapter.
 * Domain label shapes live in app-metrics-backend.interface.ts.
 */
export interface PrometheusMetrics {
  httpRequestsTotal: Counter<'method' | 'route' | 'status_code'>;
  httpRequestDuration: Histogram<'method' | 'route'>;
  llmRequestsTotal: Counter<
    'method' | 'provider' | 'model' | 'client' | 'status'
  >;
  llmRequestDuration: Histogram<'provider' | 'model'>;
  llmErrorsTotal: Counter<'provider' | 'model' | 'error_code'>;
  llmTokensTotal: Counter<'provider' | 'model' | 'token_type'>;
  llmTokensPerRequest: Histogram<'provider' | 'model'>;
  rateLimitsTotal: Counter<'client' | 'reason'>;
  cacheAccessTotal: Counter<'model' | 'hit'>;
  cacheHitRate: Gauge<'model'>;
  activeStreams: Gauge<'client'>;
  providerHealth: Gauge<'provider'>;
  /** Aggregate readiness: 0=not_ready, 1=ready (no labels). */
  gatewayReadiness: Gauge<string>;
  /** Per-component health: 0=unhealthy, 0.5=degraded, 1=healthy. */
  gatewayHealthStatus: Gauge<'component'>;
  /** Process uptime in seconds (no labels). */
  processUptimeSeconds: Gauge<string>;
}
