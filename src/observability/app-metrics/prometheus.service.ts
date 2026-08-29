import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';
import type { PrometheusMetrics } from './prometheus.types';

@Injectable()
export class PrometheusService implements OnModuleInit {
  private readonly registry: Registry;
  public readonly metrics: PrometheusMetrics;

  constructor() {
    this.registry = new Registry();

    collectDefaultMetrics({
      register: this.registry,
      prefix: 'gateway_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });
    this.metrics = this.initializeMetrics();
  }

  onModuleInit() {}

  private initializeMetrics(): PrometheusMetrics {
    // HTTP transport layer metrics
    const httpRequestsTotal = new Counter({
      name: 'gateway_http_requests_total',
      help: 'Total HTTP requests at transport layer',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    const httpRequestDuration = new Histogram({
      name: 'gateway_http_request_duration_seconds',
      help: 'HTTP request duration at transport layer',
      labelNames: ['method', 'route'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    // LLM domain layer metrics
    const llmRequestsTotal = new Counter({
      name: 'gateway_llm_requests_total',
      help: 'Total number of LLM requests',
      labelNames: ['method', 'provider', 'model', 'client', 'status'],
      registers: [this.registry],
    });

    const llmRequestDuration = new Histogram({
      name: 'gateway_llm_request_duration_seconds',
      help: 'LLM request duration in seconds',
      labelNames: ['provider', 'model'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.registry],
    });

    const llmErrorsTotal = new Counter({
      name: 'gateway_llm_errors_total',
      help: 'Total number of LLM errors',
      labelNames: ['provider', 'model', 'error_code'],
      registers: [this.registry],
    });

    const llmTokensTotal = new Counter({
      name: 'gateway_llm_tokens_total',
      help: 'Total number of tokens processed',
      labelNames: ['provider', 'model', 'token_type'],
      registers: [this.registry],
    });

    const llmTokensPerRequest = new Histogram({
      name: 'gateway_llm_tokens_per_request',
      help: 'Number of tokens per LLM request',
      labelNames: ['provider', 'model'],
      buckets: [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000],
      registers: [this.registry],
    });

    const rateLimitsTotal = new Counter({
      name: 'gateway_rate_limits_total',
      help: 'Total number of rate limit hits',
      labelNames: ['client', 'reason'],
      registers: [this.registry],
    });

    const cacheAccessTotal = new Counter({
      name: 'gateway_cache_access_total',
      help: 'Total number of cache accesses (hit/miss)',
      labelNames: ['model', 'hit'],
      registers: [this.registry],
    });

    const semanticCacheLookupTotal = new Counter({
      name: 'gateway_semantic_cache_lookup_total',
      help: 'Semantic cache lookup outcomes (hit|hash-hit|below-threshold|error|skip)',
      labelNames: ['model', 'result'],
      registers: [this.registry],
    });

    const cacheHitRate = new Gauge({
      name: 'gateway_cache_hit_rate',
      help: 'Pipeline cache hit rate (0-1): exact or semantic hit vs provider miss',
      labelNames: ['model'],
      registers: [this.registry],
    });

    const activeStreams = new Gauge({
      name: 'gateway_active_streams',
      help: 'Number of active streaming connections',
      labelNames: ['client'],
      registers: [this.registry],
    });

    const providerHealth = new Gauge({
      name: 'gateway_provider_health',
      help: 'Provider health status (0=unhealthy, 1=healthy)',
      labelNames: ['provider'],
      registers: [this.registry],
    });

    const gatewayReadiness = new Gauge({
      name: 'gateway_readiness',
      help: 'Gateway readiness aggregate (0=not_ready, 1=ready)',
      registers: [this.registry],
    });
    gatewayReadiness.set(0);

    const gatewayHealthStatus = new Gauge({
      name: 'gateway_health_status',
      help: 'Per-component gateway health (0=unhealthy, 0.5=degraded, 1=healthy)',
      labelNames: ['component'],
      registers: [this.registry],
    });

    const processUptimeSeconds = new Gauge({
      name: 'gateway_process_uptime_seconds',
      help: 'Gateway process uptime in seconds',
      registers: [this.registry],
    });

    return {
      httpRequestsTotal,
      httpRequestDuration,
      llmRequestsTotal,
      llmRequestDuration,
      llmErrorsTotal,
      llmTokensTotal,
      llmTokensPerRequest,
      rateLimitsTotal,
      cacheAccessTotal,
      semanticCacheLookupTotal,
      cacheHitRate,
      activeStreams,
      providerHealth,
      gatewayReadiness,
      gatewayHealthStatus,
      processUptimeSeconds,
    };
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getRegistry(): Registry {
    return this.registry;
  }

  resetMetrics(): void {
    this.registry.resetMetrics();
  }
}
