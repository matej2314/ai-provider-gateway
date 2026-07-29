import { DynamicModule, Module } from '@nestjs/common';
import { SmartRateLimiterService } from './smart-rate-limiter.service';
import { AppMetricsModule } from '../observability/app-metrics/app-metrics.module';

export const RATE_LIMIT_MODULE_OPTIONS = Symbol('RATE_LIMIT_MODULE_OPTIONS');

export interface RateLimitModuleOptions {
  smartRateLimitEnabled: boolean;
}

@Module({})
export class RateLimitModule {
  /**
   * Redis is provided by CacheModule only when a consumer needs it
   * (`includeRedisStack` / `isRedisRequiredFromEnv`). When
   * `smartRateLimitEnabled` is false and cache is not redis, Redis is absent
   * from DI — `SmartRateLimiterService` must treat it as optional.
   */
  static register(options: RateLimitModuleOptions): DynamicModule {
    return {
      module: RateLimitModule,
      imports: [AppMetricsModule],
      global: true,
      providers: [
        {
          provide: RATE_LIMIT_MODULE_OPTIONS,
          useValue: options,
        },
        SmartRateLimiterService,
      ],
      exports: [SmartRateLimiterService],
    };
  }
}
