import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { AppMetricsModule } from '../observability/app-metrics/app-metrics.module';

@Module({
  imports: [AppMetricsModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
