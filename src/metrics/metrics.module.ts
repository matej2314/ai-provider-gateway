import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MetricsService } from './metrics.service';
import { METRICS_BACKEND } from './metrics.tokens';
import type { MetricsBackend } from './interfaces/metrics-backend.interface';
import { SentryAiMetricsAdapter } from './adapters/sentry-metrics.adapter';
import { NoopAiMetricsAdapter } from './adapters/noop-metrics.adapter';

function resolveMetricsBackend(nodeEnv: string): MetricsBackend {
  const override = process.env.METRICS_BACKEND?.toLowerCase();
  if (override === 'noop') return new NoopAiMetricsAdapter();
  if (override === 'sentry') {
    if (!process.env.SENTRY_DSN?.trim()) {
      throw new Error('SENTRY_DSN is not set');
    }
    return new SentryAiMetricsAdapter();
  }

  if (nodeEnv === 'production') {
    if (!process.env.SENTRY_DSN?.trim()) {
      throw new Error('SENTRY_DSN is not set');
    }
    return new SentryAiMetricsAdapter();
  }
  return new NoopAiMetricsAdapter();
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: METRICS_BACKEND,
      useFactory: (config: ConfigService): MetricsBackend => {
        const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
        return resolveMetricsBackend(nodeEnv);
      },
      inject: [ConfigService],
    },
    MetricsService,
  ],
  exports: [MetricsService, METRICS_BACKEND],
})
export class MetricsModule {}
