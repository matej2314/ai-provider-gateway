export interface ProviderCli {
  apiKeyRef: string;
  apiKey: string;
}

export interface ClientCli {
  gatewayKeyRef: string;
  gatewayKey: string;
}

export interface EnvTemplateInput {
  masterKeyRef: string;
  masterKey: string;
  providers: ProviderCli[];
  clients: ClientCli[];
  port?: number;
  nodeEnv?: string;
  swaggerEnabled?: boolean;

  cacheEnabled?: boolean;
  cacheBackend?: 'redis' | 'memory' | 'noop';
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;

  rateLimitSmartEnabled?: boolean;

  metricsBackend?: 'sentry' | 'noop';
  sentryDsn?: string;
}

export function generateEnvTemplate(
  input: EnvTemplateInput,
): Record<string, string> {
  const env: Record<string, string> = {};

  env.APP_VERSION = '1.0.0';
  env.PORT = String(input.port || 3000);
  env.NODE_ENV = input.nodeEnv || 'development';
  env.CONFIG_VALIDATE_STRICT = 'true';
  env.SWAGGER_ENABLED = String(input.swaggerEnabled ?? true);

  env[input.masterKeyRef] = input.masterKey;

  input.providers.forEach((provider) => {
    env[provider.apiKeyRef] = provider.apiKey;
  });

  input.clients.forEach((client) => {
    env[client.gatewayKeyRef] = client.gatewayKey;
  });

  env.CACHE_ENABLED = String(input.cacheEnabled ?? false);
  env.CACHE_BACKEND = input.cacheBackend ?? 'noop';
  env.CACHE_TTL = '3600';
  env.CACHE_KEY_PREFIX = 'aigw:';

  if (input.cacheBackend === 'redis') {
    env.REDIS_HOST = input.redisHost ?? 'localhost';
    env.REDIS_PORT = String(input.redisPort ?? 6379);
    env.REDIS_PASSWORD = input.redisPassword ?? '';
  } else {
    env.REDIS_HOST = '';
    env.REDIS_PORT = '';
    env.REDIS_PASSWORD = '';
  }
  env.REDIS_DB = '0';
  env.REDIS_KEY_PREFIX = 'aigw:';

  if (input.cacheBackend === 'redis') {
    env.RATE_LIMIT_SMART_ENABLED = String(input.rateLimitSmartEnabled ?? true);
  } else {
    env.RATE_LIMIT_SMART_ENABLED = 'false';
  }

  env.RATE_LIMIT_RPS_PER_KEY = '10';
  env.RATE_LIMIT_BURST_PER_KEY = '20';
  env.RATE_LIMIT_STREAMS_CONCURRENT = '3';
  env.RATE_LIMIT_COOLDOWN_AFTER_429 = '60';

  env.LOG_LEVEL = input.nodeEnv === 'production' ? 'info' : 'debug';
  env.LOG_ADAPTER = 'pino';
  env.LOG_PRETTY = input.nodeEnv === 'development' ? 'true' : 'false';

  const isSentryEnabled = input.metricsBackend === 'sentry';

  env.METRICS_BACKEND = input.metricsBackend ?? 'noop';
  env.ERROR_REPORTING_ADAPTER = isSentryEnabled ? 'sentry' : 'noop';

  env.SENTRY_ENABLED = String(isSentryEnabled);
  env.SENTRY_DSN = isSentryEnabled ? (input.sentryDsn ?? '') : '';
  env.SENTRY_INCLUDE_PROMPTS = 'true';
  env.SENTRY_ENVIRONMENT = input.nodeEnv || 'development';
  env.SENTRY_TRACES_SAMPLE_RATE = '1.0';

  return env;
}
