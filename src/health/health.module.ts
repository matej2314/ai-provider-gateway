import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RedisCacheAdapter } from 'src/cache/adapters/redis-cache/redis-cache.adapter';

@Module({
  controllers: [HealthController],
  providers: [HealthService, RedisCacheAdapter],
})
export class HealthModule {}
