import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { ProvidersModule } from './providers/providers.module';
import { ProviderRegistryModule } from './providers/provider-registry.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { CacheModule } from './cache/cache.module';

const includeRedisCacheStack = (): boolean => {
  if (process.env.CACHE_ENABLED !== 'true') return false;
  return (process.env.CACHE_BACKEND || 'noop').toLowerCase() === 'redis';
};

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      validate,
    }),
    ProviderRegistryModule,
    CacheModule.register({
      includeRedisStack: includeRedisCacheStack(),
    }),
    ChatModule,
    ProvidersModule.register(),
    HealthModule,
  ],
})
export class AppModule {}
