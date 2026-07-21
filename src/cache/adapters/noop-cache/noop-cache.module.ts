import { Module } from '@nestjs/common';
import { NoOpCacheBackend } from './noop-cache.adapter';

@Module({
  providers: [NoOpCacheBackend],
  exports: [NoOpCacheBackend],
})
export class NoopCacheModule {}
