import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { ProvidersModule } from './providers/providers.module';
import { ProviderRegistryModule } from './providers/provider-registry.module';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { CacheModule } from './cache/cache.module';
import { RedisConnectionService } from './cache/adapters/redis-cache/redis-connection.service';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggingModule } from './logging/logging.module';
import { MetricsModule } from './metrics/metrics.module';

const includeRedisCacheStack = (): boolean => {
  if (process.env.CACHE_ENABLED !== 'true') return false;
  return (process.env.CACHE_BACKEND || 'noop').toLowerCase() === 'redis';
};

@Module({
  providers: [RequestIdMiddleware],
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      validate,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [
        ConfigService,
        { token: RedisConnectionService, optional: true },
      ],
      useFactory: (
        config: ConfigService,
        redis: RedisConnectionService | undefined,
      ): {
        throttlers: Array<{ ttl: number; limit: number }>;
        storage?: ThrottlerStorage;
      } => {
        const rateEnabled = config.get<boolean>('RATE_LIMIT_ENABLED', true);
        const ttl = config.get<number>('RATE_LIMIT_TTL', 60000);
        const limit = config.get<number>('RATE_LIMIT_MAX', 100);

        if (!rateEnabled) {
          return {
            throttlers: [{ ttl: 60000, limit: 999999999999 }],
          };
        }

        const cache = config.get<{ enabled?: boolean; backend?: string }>(
          'cache',
        );

        const useRedis =
          cache?.enabled === true &&
          (cache?.backend ?? 'noop').toLowerCase() === 'redis';

        let storage: ThrottlerStorage | undefined;

        if (useRedis && redis?.isReady()) {
          const client = redis.getClient();
          if (client) {
            storage = new ThrottlerStorageRedisService(client);
          }
        }
        return {
          throttlers: [{ ttl, limit }],
          storage,
        };
      },
    }),
    ProviderRegistryModule,
    CacheModule.register({
      includeRedisStack: includeRedisCacheStack(),
    }),
    ChatModule,
    ProvidersModule.register(),
    HealthModule,
    RateLimitModule,
    LoggingModule,
    MetricsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes({
      path: '{*splat}',
      method: RequestMethod.ALL,
    });
  }
}
