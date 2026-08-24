import { isRedisRequired } from '../../cache/should-include-redis-stack';
import type { GatewayProviderType } from 'src/config/provider-types';
import {
  EnvRef,
  ProviderApiKey,
  GatewayKey,
  BaseUrl,
  Port,
} from '../../common/types/branded.types';

export interface ProviderCli {
  apiKeyRef: EnvRef;
  apiKey: ProviderApiKey;
  type?: GatewayProviderType;
  baseUrlRef?: EnvRef;
  baseUrl?: BaseUrl;
}

export interface ClientCli {
  gatewayKeyRef: EnvRef;
  gatewayKey: GatewayKey;
}

export interface EnvTemplateInput {
  masterKeyRef: string;
  masterKey: GatewayKey;
  providers: ProviderCli[];
  clients: ClientCli[];
  port?: Port;
  nodeEnv?: string;
  swaggerEnabled?: boolean;

  cacheEnabled?: boolean;
  cacheBackend?: 'redis' | 'noop';
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;

  rateLimitSmartEnabled?: boolean;
  /** Present when already set in env/input; wizard questions = Phase 5. */
  semanticCacheEnabled?: boolean;

  metricsBackend?: 'sentry' | 'noop';
  sentryDsn?: string;
}

export function isEnvInputRedisRequired(input: EnvTemplateInput): boolean {
  const cacheEnabled = input.cacheEnabled === true;
  const cacheBackend = input.cacheBackend ?? 'noop';

  return isRedisRequired({
    cache: {
      enabled: cacheEnabled,
      backend: cacheEnabled ? cacheBackend : 'noop',
    },
    rateLimitSmartEnabled: input.rateLimitSmartEnabled === true,
    semanticCacheEnabled: input.semanticCacheEnabled === true,
  });
}

export function generateEnvTemplate(
  input: EnvTemplateInput,
): Record<string, string> {
  const env: Record<string, string> = {};

  env.APP_VERSION = '1.0.0';
  env.PORT = String(input.port || 3000);
  env.NODE_ENV = input.nodeEnv || 'development';
  env.SWAGGER_ENABLED = String(input.swaggerEnabled ?? true);

  env[input.masterKeyRef] = input.masterKey;

  input.providers.forEach((provider) => {
    env[provider.apiKeyRef] = provider.apiKey;
    if (provider.baseUrlRef) {
      env[provider.baseUrlRef] = provider.baseUrl ?? '';
    }
  });

  input.clients.forEach((client) => {
    env[client.gatewayKeyRef] = client.gatewayKey;
  });

  env.CACHE_ENABLED = String(input.cacheEnabled ?? false);
  env.CACHE_BACKEND = input.cacheBackend ?? 'noop';
  env.CACHE_TTL = '3600';
  env.CACHE_KEY_PREFIX = 'aigw:';

  const redisRequired = isEnvInputRedisRequired(input);

  if (redisRequired) {
    env.REDIS_HOST = input.redisHost ?? 'localhost';
    env.REDIS_PORT = String(input.redisPort ?? 6379);
    env.REDIS_PASSWORD = input.redisPassword ?? '';
    env.REDIS_DB = '0';
    env.REDIS_KEY_PREFIX = 'aigw:';
  }

  env.RATE_LIMIT_SMART_ENABLED = String(input.rateLimitSmartEnabled ?? false);

  env.RATE_LIMIT_RPS_PER_KEY = '10';
  env.RATE_LIMIT_BURST_PER_KEY = '20';
  env.RATE_LIMIT_STREAMS_CONCURRENT = '3';
  env.RATE_LIMIT_COOLDOWN_AFTER_429 = '60';

  env.LOG_LEVEL = input.nodeEnv === 'production' ? 'info' : 'debug';
  env.LOG_ADAPTER = 'pino';
  env.LOG_PRETTY = input.nodeEnv === 'development' ? 'true' : 'false';

  const aiMetricsBackend = input.metricsBackend ?? 'noop';
  const isSentryEnabled = aiMetricsBackend === 'sentry';

  env.AI_METRICS_BACKEND = aiMetricsBackend;
  env.METRICS_BACKEND = input.nodeEnv === 'production' ? 'prometheus' : 'noop';
  env.ERROR_REPORTING_ADAPTER = isSentryEnabled ? 'sentry' : 'noop';

  env.SENTRY_ENABLED = String(isSentryEnabled);
  env.SENTRY_DSN = isSentryEnabled ? (input.sentryDsn ?? '') : '';
  env.SENTRY_INCLUDE_PROMPTS = 'true';
  env.SENTRY_ENVIRONMENT = input.nodeEnv || 'development';
  env.SENTRY_TRACES_SAMPLE_RATE = '0.1';

  return env;
}
