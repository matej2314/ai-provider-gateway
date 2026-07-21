import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrometheusAppMetricsAdapter } from './adapters/prometheus-app-metrics.adapter';
import { NoopAppMetricsAdapter } from './adapters/noop-app-metrics.adapter';
import { MetricsController } from './metrics.controller';
import { AppMetricsService } from './app-metrics.service';
import { APP_METRICS_BACKEND } from './app-metrics.tokens';
import { PrometheusService } from './prometheus.service';
import { ActiveStreamsTracker } from './active-streams.tracker';
import { PreMetricsScrapeRegistry } from './pre-metrics-scrape.registry';
import type { AppMetricsBackend } from './interfaces/app-metrics-backend.interface';

function resolveAppMetricsBackend(
  nodeEnv: string,
  prometheus: PrometheusService,
): AppMetricsBackend {
  const override = process.env.METRICS_BACKEND?.toLowerCase();
  if (override === 'noop') return new NoopAppMetricsAdapter();
  if (override === 'prometheus') {
    return new PrometheusAppMetricsAdapter(prometheus);
  }

  if (nodeEnv === 'production') {
    return new PrometheusAppMetricsAdapter(prometheus);
  }
  return new NoopAppMetricsAdapter();
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PrometheusService,
    {
      provide: APP_METRICS_BACKEND,
      useFactory: (
        config: ConfigService,
        prometheus: PrometheusService,
      ): AppMetricsBackend => {
        const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
        return resolveAppMetricsBackend(nodeEnv, prometheus);
      },
      inject: [ConfigService, PrometheusService],
    },
    AppMetricsService,
    ActiveStreamsTracker,
    PreMetricsScrapeRegistry,
  ],
  controllers: [MetricsController],
  exports: [
    AppMetricsService,
    APP_METRICS_BACKEND,
    PrometheusService,
    ActiveStreamsTracker,
    PreMetricsScrapeRegistry,
  ],
})
export class AppMetricsModule {}
