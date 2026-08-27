import type { ConfigService } from '@nestjs/config';
import { getAppConfig } from '../config/typed-config';
import { parseCacheBackend } from '../config/env.validation';

export type RedisConsumer = 'cache' | 'rate-limit' | 'semantic-cache';

import type { CACHE_BACKEND_TYPE } from './interfaces/cache-backend-interface';

export type RedisRequirementSnapshot = {
  cache?: {
    enabled?: boolean;
    backend?: CACHE_BACKEND_TYPE;
  };
  rateLimitSmartEnabled?: boolean;
  semanticCacheEnabled?: boolean;
};

function resolveCacheForRequirement(input: RedisRequirementSnapshot): {
  enabled: boolean;
  backend: CACHE_BACKEND_TYPE;
} {
  const cache = input.cache ?? {};
  const enabled = cache.enabled === true;
  const backendRaw = (cache.backend ?? 'noop').toLowerCase();

  return {
    enabled,
    backend: enabled ? parseCacheBackend(backendRaw, true) : 'noop',
  };
}

export function getRedisConsumers(
  input: RedisRequirementSnapshot,
): RedisConsumer[] {
  const cache = resolveCacheForRequirement(input);
  const consumers: RedisConsumer[] = [];
  if (cache.enabled && cache.backend === 'redis') consumers.push('cache');
  if (input.rateLimitSmartEnabled === true) consumers.push('rate-limit');
  if (input.semanticCacheEnabled === true) consumers.push('semantic-cache');
  return consumers;
}

export function isRedisRequired(input: RedisRequirementSnapshot): boolean {
  return getRedisConsumers(input).length > 0;
}

export function isRedisRequiredFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const cacheEnabled = env.CACHE_ENABLED === 'true';
  return isRedisRequired({
    cache: {
      enabled: cacheEnabled,
      backend: parseCacheBackend(env.CACHE_BACKEND, cacheEnabled),
    },
    rateLimitSmartEnabled: env.RATE_LIMIT_SMART_ENABLED === 'true',
    semanticCacheEnabled: isSemanticCacheEnabledFromEnv(env),
  });
}

/** Same predicate as Redis consumer `semantic-cache` and CacheModule semantic import. */
export function isSemanticCacheEnabledFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.SEMANTIC_CACHE_ENABLED === 'true';
}

export function isRedisRequiredFromConfig(
  configService: ConfigService,
): boolean {
  const cache = getAppConfig(configService, 'cache');
  const rateLimitSmartEnabled =
    getAppConfig(configService, 'RATE_LIMIT_SMART_ENABLED') === true;
  const semanticCacheEnabled =
    getAppConfig(configService, 'semanticCache')?.enabled === true;

  return isRedisRequired({
    cache,
    rateLimitSmartEnabled,
    semanticCacheEnabled,
  });
}

export function getRedisConsumersFromConfig(
  configService: ConfigService,
): RedisConsumer[] {
  const cache = getAppConfig(configService, 'cache');
  const rateLimitSmartEnabled =
    getAppConfig(configService, 'RATE_LIMIT_SMART_ENABLED') === true;
  const semanticCacheEnabled =
    getAppConfig(configService, 'semanticCache')?.enabled === true;

  return getRedisConsumers({
    cache,
    rateLimitSmartEnabled,
    semanticCacheEnabled,
  });
}

export function shouldIncludeRedisStack(): boolean {
  return isRedisRequiredFromEnv();
}

export function shouldConnectRedis(): boolean {
  return shouldIncludeRedisStack();
}
