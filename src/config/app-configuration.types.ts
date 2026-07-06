import type { GatewayConfig } from './gateway-config.schema';
import type {
  GatewayKeyRuntimeConfig,
  ResolvedSystemPrompts,
} from './configuration.types';
import type { ProviderInstanceRuntime } from './configuration';
import type { CACHE_BACKEND_TYPE } from '../cache/interfaces/cache-backend-interface';
import type { ProviderInstanceId } from '../common/types/branded.types';

export type CacheRuntimeConfig = {
  enabled: boolean;
  backend: CACHE_BACKEND_TYPE;
  ttl: number;
  keyPrefix: string;
};

export type RedisRuntimeConfig = {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
};

export type RateLimitRuntimeConfig = {
  rps: number;
  burst: number;
  maxConcurrentStreams: number;
  cooldownAfter429: number;
};

export type AppConfiguration = {
  gateway: GatewayConfig;
  gatewayKey: GatewayKeyRuntimeConfig;
  port: number;
  nodeEnv: string;
  providers: Record<ProviderInstanceId, ProviderInstanceRuntime>;
  resolvedSystemPrompts: ResolvedSystemPrompts;
  cache: CacheRuntimeConfig;
  redis: RedisRuntimeConfig;
  RATE_LIMIT_SMART_ENABLED: boolean;
  rateLimit: RateLimitRuntimeConfig;
};
