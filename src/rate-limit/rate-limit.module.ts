import { DynamicModule, Module } from '@nestjs/common';
import { SmartRateLimiterService } from './smart-rate-limiter.service';

export interface RateLimitModuleOptions {
  smartRateLimitEnabled: boolean;
}

@Module({})
export class RateLimitModule {
  static register(_options: RateLimitModuleOptions): DynamicModule {
    return {
      module: RateLimitModule,
      global: true,
      providers: [SmartRateLimiterService],
      exports: [SmartRateLimiterService],
    };
  }
}
