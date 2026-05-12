import { Module } from '@nestjs/common';
import { RedisConnectionService } from './redis-connection.service';
import { RedisCacheAdapter } from './redis-cache.adapter';

@Module({
  providers: [RedisConnectionService, RedisCacheAdapter],
  exports: [RedisConnectionService, RedisCacheAdapter],
})
export class RedisCacheModule {}
