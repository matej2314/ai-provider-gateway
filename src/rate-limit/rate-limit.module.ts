import { DynamicModule, Module } from '@nestjs/common';
import { SmartRateLimiterService } from './smart-rate-limiter.service';
import { AppMetricsModule } from '../observability/app-metrics/app-metrics.module';

export interface RateLimitModuleOptions {
  smartRateLimitEnabled: boolean;
}

@Module({})
export class RateLimitModule {
  static register(_options: RateLimitModuleOptions): DynamicModule {
    return {
      module: RateLimitModule,
      imports: [AppMetricsModule],
      global: true,
      providers: [SmartRateLimiterService],
      exports: [SmartRateLimiterService],
    };
  }
}
