import type { ConfigService } from '@nestjs/config';

export type RedisConsumer = 'cache' | 'rate-limit';

export type RedisRequirementSnapshot = {
  cache?: {
    enabled?: boolean;
    backend?: string;
  };
  rateLimitSmartEnabled?: boolean;
};

function resolveCacheForRequirement(input: RedisRequirementSnapshot): {
  enabled: boolean;
  backend: string;
} {
  const cache = input.cache ?? {};
  const enabled = cache.enabled === true;
  const backendRaw = (cache.backend ?? 'noop').toLowerCase();

  return {
    enabled,
    backend: enabled ? backendRaw : 'noop',
  };
}

export function getRedisConsumers(
  input: RedisRequirementSnapshot,
): RedisConsumer[] {
  const cache = resolveCacheForRequirement(input);
  const consumers: RedisConsumer[] = [];

  if (cache.enabled && cache.backend === 'redis') {
    consumers.push('cache');
  }

  if (input.rateLimitSmartEnabled === true) {
    consumers.push('rate-limit');
  }
  return consumers;
}

export function isRedisRequired(input: RedisRequirementSnapshot): boolean {
  return getRedisConsumers(input).length > 0;
}

export function isRedisRequiredFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const cacheEnabled = env.CACHE_ENABLED === 'true';
  const cacheBackendRaw = (env.CACHE_BACKEND || 'noop').toLowerCase();

  return isRedisRequired({
    cache: {
      enabled: cacheEnabled,
      backend: cacheEnabled ? cacheBackendRaw : 'noop',
    },
    rateLimitSmartEnabled: env.RATE_LIMIT_SMART_ENABLED === 'true',
  });
}

export function isRedisRequiredFromConfig(
  configService: Pick<ConfigService, 'get'>,
): boolean {
  const cache = configService.get<{
    enabled?: boolean;
    backend?: string;
  }>('cache');

  const rateLimitSmartEnabled =
    configService.get<boolean>('RATE_LIMIT_SMART_ENABLED') === true;

  return isRedisRequired({
    cache,
    rateLimitSmartEnabled,
  });
}

export function getRedisConsumersFromConfig(
  configService: Pick<ConfigService, 'get'>,
): RedisConsumer[] {
  const cache = configService.get<{
    enabled?: boolean;
    backend?: string;
  }>('cache');

  const rateLimitSmartEnabled =
    configService.get<boolean>('RATE_LIMIT_SMART_ENABLED') === true;

  return getRedisConsumers({
    cache,
    rateLimitSmartEnabled,
  });
}

export function shouldIncludeRedisStack(): boolean {
  return isRedisRequiredFromEnv();
}

export function shouldConnectRedis(): boolean {
  return shouldIncludeRedisStack();
}
