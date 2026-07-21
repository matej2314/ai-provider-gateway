import type { GatewayConfig } from './gateway-config.schema';
import type {
  GatewayKeyRuntimeConfig,
  ResolvedSystemPrompts,
} from './configuration.types';
import type { ProviderInstanceRuntime } from './configuration';
import type { CACHE_BACKEND_TYPE } from '../cache/interfaces/cache-backend-interface';
import type {
  CacheTtlSeconds,
  MaxConcurrentStreams,
  Port,
  ProviderInstanceId,
  RateLimitBurst,
  RateLimitRps,
} from '../common/types/branded.types';

export type CacheRuntimeConfig = {
  enabled: boolean;
  backend: CACHE_BACKEND_TYPE;
  ttl: CacheTtlSeconds;
  keyPrefix: string;
};

export type RedisRuntimeConfig = {
  host: string;
  port: Port;
  password?: string;
  db: number;
  keyPrefix: string;
};

export type RateLimitRuntimeConfig = {
  rps: RateLimitRps;
  burst: RateLimitBurst;
  maxConcurrentStreams: MaxConcurrentStreams;
  cooldownAfter429: number;
};

export type AppConfiguration = {
  gateway: GatewayConfig;
  gatewayKey: GatewayKeyRuntimeConfig;
  port: Port;
  nodeEnv: string;
  providers: Record<ProviderInstanceId, ProviderInstanceRuntime>;
  resolvedSystemPrompts: ResolvedSystemPrompts;
  cache: CacheRuntimeConfig;
  redis: RedisRuntimeConfig;
  RATE_LIMIT_SMART_ENABLED: boolean;
  rateLimit: RateLimitRuntimeConfig;
};
