import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ChatModule } from './chat/chat.module';
import { ProvidersModule } from './providers/providers.module';
import { ProviderRegistryModule } from './providers/provider-registry.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { CacheModule } from './cache/cache.module';
import { isRedisRequiredFromEnv } from './cache/should-include-redis-stack';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggingModule } from './logging/logging.module';
import { MetricsModule } from './metrics/metrics.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ModelsModule } from './models/models.module';

@Module({
  providers: [
    RequestIdMiddleware,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      validate,
    }),
    LoggingModule,
    ProviderRegistryModule,
    CacheModule.register({
      includeRedisStack: isRedisRequiredFromEnv(),
    }),
    ChatModule,
    ModelsModule,
    ProvidersModule.register(),
    HealthModule,
    RateLimitModule.register({
      smartRateLimitEnabled: process.env.RATE_LIMIT_SMART_ENABLED === 'true',
    }),
    MetricsModule,
    IntegrationsModule,
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
