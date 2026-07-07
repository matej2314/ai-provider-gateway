import { Module, DynamicModule } from '@nestjs/common';
import { CacheRegistryService } from './cache-registry.service';
import { NoopCacheModule } from './adapters/noop-cache/noop-cache.module';
import { RedisCacheModule } from './adapters/redis-cache/redis-cache.module';
import { RedisConnectionService } from './adapters/redis-cache/redis-connection.service';
import { CACHE_BACKEND } from './cache.tokens';
import { ResponseCacheService } from './response-cache.service';
import type { CacheBackend } from './interfaces/cache-backend-interface';
import type { CacheKey, CacheTtlSeconds } from '../common/types/branded.types';

export interface CacheModuleOptions {
  includeRedisStack: boolean;
}

@Module({})
export class CacheModule {
  static register(options: CacheModuleOptions): DynamicModule {
    const imports = [
      NoopCacheModule,
      ...(options.includeRedisStack ? [RedisCacheModule] : []),
    ];

    const exports: Array<
      | typeof CACHE_BACKEND
      | typeof CacheRegistryService
      | typeof RedisCacheModule
      | typeof RedisConnectionService
      | typeof ResponseCacheService
    > = [CACHE_BACKEND, CacheRegistryService, ResponseCacheService];

    if (options.includeRedisStack) {
      exports.push(RedisCacheModule);
    } else {
      exports.push(RedisConnectionService);
    }

    return {
      module: CacheModule,
      global: true,
      imports,
      providers: [
        CacheRegistryService,
        ResponseCacheService,
        ...(options.includeRedisStack ? [] : [RedisConnectionService]),
        {
          provide: CACHE_BACKEND,
          useFactory: (reg: CacheRegistryService): CacheBackend => ({
            isAvailable: () => reg.resolve().isAvailable(),
            get: (key: CacheKey) => reg.resolve().get(key),
            set: (key: CacheKey, value: string, ttl: CacheTtlSeconds) =>
              reg.resolve().set(key, value, ttl),
            delete: (key: CacheKey) => reg.resolve().delete(key),
          }),
          inject: [CacheRegistryService],
        },
      ],
      exports,
    };
  }
}
