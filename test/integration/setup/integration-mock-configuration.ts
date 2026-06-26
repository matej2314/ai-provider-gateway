import type { AppConfiguration } from '../../../src/config/app-configuration.types';
import type { GatewayConfig } from '../../../src/config/configuration';
import {
  INTEGRATION_ANTHROPIC_API_KEY_REF,
  INTEGRATION_GATEWAY_CLIENT_ID,
  INTEGRATION_GATEWAY_KEY_REF,
  INTEGRATION_MASTER_KEY_REF,
  INTEGRATION_MODEL_ALIAS,
  INTEGRATION_MODEL_ID,
  INTEGRATION_PROVIDER_INSTANCE,
  INTEGRATION_RESOLVED_PROMPTS,
  readIntegrationEnv,
} from '../helpers/integration-constants';
import { requireVendorApiKey } from '../helpers/require-integration-env';
import { buildIntegrationGatewayModels } from '../helpers/integration-gateway-config';

const integrationGatewayConfig: GatewayConfig = {
  schemaVersion: 1,
  masterKeyRef: INTEGRATION_MASTER_KEY_REF,
  clients: {
    [INTEGRATION_GATEWAY_CLIENT_ID]: {
      name: 'Integration IDE Client',
      type: 'ide',
      gatewayKeyRef: INTEGRATION_GATEWAY_KEY_REF,
    },
  },
  providers: {
    [INTEGRATION_PROVIDER_INSTANCE]: {
      type: 'anthropic',
      apiKeyRef: INTEGRATION_ANTHROPIC_API_KEY_REF,
      enabled: true,
    },
  },
  models: buildIntegrationGatewayModels(),
};

function buildGatewayKeyRuntime() {
  const masterKey = readIntegrationEnv(INTEGRATION_MASTER_KEY_REF);
  const gatewayKey = readIntegrationEnv(INTEGRATION_GATEWAY_KEY_REF);
  const allowList = new Set<string>();
  if (masterKey) allowList.add(masterKey);
  if (gatewayKey) allowList.add(gatewayKey);

  return {
    allowList: [...allowList],
    masterKey,
    clients: [
      {
        instanceId: INTEGRATION_GATEWAY_CLIENT_ID,
        name: 'Integration IDE Client',
        type: 'ide' as const,
        gatewayKeyRef: INTEGRATION_GATEWAY_KEY_REF,
        gatewayKey,
      },
    ],
  };
}

function buildProvidersRuntime() {
  const apiKey = requireVendorApiKey() ?? '';
  return {
    [INTEGRATION_PROVIDER_INSTANCE]: {
      type: 'anthropic' as const,
      apiKeyRef: INTEGRATION_ANTHROPIC_API_KEY_REF,
      apiKey,
    },
  };
}

function cacheFromEnv() {
  const enabled = process.env.CACHE_ENABLED === 'true';
  const backendRaw = (process.env.CACHE_BACKEND ?? 'noop').toLowerCase();
  return {
    enabled,
    backend: (enabled ? backendRaw : 'noop') as 'redis' | 'noop' | 'memory',
    ttl: Number(process.env.CACHE_TTL ?? 60),
    keyPrefix: process.env.CACHE_KEY_PREFIX ?? 'it-cache:',
  };
}

function redisFromEnv() {
  return {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6380),
    password: process.env.REDIS_PASSWORD ?? '',
    db: Number(process.env.REDIS_DB ?? 15),
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'it:',
  };
}

function defaultConfiguration(): AppConfiguration {
  return {
    gateway: integrationGatewayConfig,
    gatewayKey: buildGatewayKeyRuntime(),
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: process.env.NODE_ENV ?? 'test',
    providers: buildProvidersRuntime(),
    resolvedSystemPrompts: INTEGRATION_RESOLVED_PROMPTS,
    cache: cacheFromEnv(),
    redis: redisFromEnv(),
    RATE_LIMIT_SMART_ENABLED: process.env.RATE_LIMIT_SMART_ENABLED === 'true',
    rateLimit: {
      rps: Number(process.env.RATE_LIMIT_RPS_PER_KEY ?? 10),
      burst: Number(process.env.RATE_LIMIT_BURST_PER_KEY ?? 20),
      maxConcurrentStreams: Number(
        process.env.RATE_LIMIT_STREAMS_CONCURRENT ?? 3,
      ),
      cooldownAfter429: Number(process.env.RATE_LIMIT_COOLDOWN_AFTER_429 ?? 60),
    },
  };
}

export default defaultConfiguration;

export function loadGatewayConfigFromFile(): GatewayConfig {
  return integrationGatewayConfig;
}

export function buildEffectiveGatewayConfig(raw: GatewayConfig): GatewayConfig {
  return raw;
}

export function assertMasterKeyPresent(): void {
  if (!readIntegrationEnv(INTEGRATION_MASTER_KEY_REF)) {
    throw new Error('[GatewayKey] Missing master key.');
  }
}
