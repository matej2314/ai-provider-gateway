export interface EnvTemplateInput {
  masterKeyRef: string;
  masterKey: string;
  providers: Array<{
    apiKeyRef: string;
    apiKey: string;
  }>;
  clients: Array<{
    gatewayKeyRef: string;
    gatewayKey: string;
  }>;
  port?: number;
  nodeEnv?: string;
}

export function generateEnvTemplate(
  input: EnvTemplateInput,
): Record<string, string> {
  const env: Record<string, string> = {
    NODE_ENV: input.nodeEnv ?? 'development',
    PORT: String(input.port || 3000),
    [input.masterKeyRef]: input.masterKey,
  };

  input.providers.forEach((provider) => {
    env[provider.apiKeyRef] = provider.apiKey;
  });

  input.clients.forEach((client) => {
    env[client.gatewayKeyRef] = client.gatewayKey;
  });

  env.CACHE_ENABLED = 'false';
  env.CACHE_BACKEND = 'noop';
  env.CACHE_TTL = '3600';
  env.CACHE_KEY_PREFIX = 'aigw:';

  // Redis config (placeholder)
  env.REDIS_HOST = 'localhost';
  env.REDIS_PORT = '6379';
  env.REDIS_PASSWORD = '';
  env.REDIS_DB = '0';
  env.REDIS_KEY_PREFIX = 'aigw:';

  return env;
}
