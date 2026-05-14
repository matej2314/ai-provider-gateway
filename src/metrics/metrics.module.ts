import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import {RedisCacheModule} from 'src/cache/adapters/redis-cache/redis-cache.module';

@Module({
  imports: [RedisCacheModule],
  providers: [MetricsService],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule {}
