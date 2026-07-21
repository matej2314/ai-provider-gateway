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
import { validateEnvironment } from './config/configuration-validation.service';
import { HealthModule } from './health/health.module';
import { CacheModule } from './cache/cache.module';
import { isRedisRequiredFromEnv } from './cache/should-include-redis-stack';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { HttpMetricsMiddleware } from './common/middleware/http-metrics.middleware';
import { LoggingModule } from './logging/logging.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ModelsModule } from './models/models.module';
import { ObservabilityModule } from './observability/observability.module';

@Module({
  providers: [
    RequestIdMiddleware,
    HttpMetricsMiddleware,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      validate: validateEnvironment,
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
    ObservabilityModule,
    IntegrationsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes({
      path: '{*splat}',
      method: RequestMethod.ALL,
    });

    consumer.apply(HttpMetricsMiddleware).forRoutes({
      path: '{*splat}',
      method: RequestMethod.ALL,
    });
  }
}
