import { Module } from '@nestjs/common';
import { SmartRateLimiterService } from './smart-rate-limiter.service';
import { RedisCacheModule } from 'src/cache/adapters/redis-cache/redis-cache.module';

@Module({
  imports: [RedisCacheModule],
  providers: [SmartRateLimiterService],
  exports: [SmartRateLimiterService],
})
export class RateLimitModule {}
