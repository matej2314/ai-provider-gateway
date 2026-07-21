import { Global, Module } from '@nestjs/common';
import { AiMetricsModule } from './ai-metrics/ai-metrics.module';
import { AppMetricsModule } from './app-metrics/app-metrics.module';

@Global()
@Module({
  imports: [AiMetricsModule, AppMetricsModule],
  exports: [AiMetricsModule, AppMetricsModule],
})
export class ObservabilityModule {}
