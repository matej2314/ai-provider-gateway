import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiMetricsService } from './ai-metrics.service';
import { AI_METRICS_BACKEND } from './ai-metrics.tokens';
import type { AiMetricsBackend } from './interfaces/ai-metrics-backend.interface';
import { SentryAiMetricsAdapter } from './adapters/sentry-ai-metrics.adapter';
import { NoopAiMetricsAdapter } from './adapters/noop-ai-metrics.adapter';

function resolveAiMetricsBackend(nodeEnv: string): AiMetricsBackend {
  const override = process.env.AI_METRICS_BACKEND?.toLowerCase();
  if (override === 'noop') return new NoopAiMetricsAdapter();
  if (override === 'sentry') {
    if (!process.env.SENTRY_DSN?.trim()) {
      throw new Error(
        'AI_METRICS_BACKEND=sentry requires SENTRY_DSN to be set',
      );
    }
    return new SentryAiMetricsAdapter();
  }

  if (nodeEnv === 'production') {
    if (!process.env.SENTRY_DSN?.trim()) {
      console.warn(
        'AI Metrics: Sentry DSN not set in production. Using noop adapter.',
      );
      return new NoopAiMetricsAdapter();
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
      provide: AI_METRICS_BACKEND,
      useFactory: (config: ConfigService): AiMetricsBackend => {
        const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
        return resolveAiMetricsBackend(nodeEnv);
      },
      inject: [ConfigService],
    },
    AiMetricsService,
  ],
  exports: [AiMetricsService, AI_METRICS_BACKEND],
})
export class AiMetricsModule {}
