import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import type {
  ResolvedSystemPrompts,
  ResolvedGatewayClient,
  GatewayKeyRuntimeConfig,
} from './configuration.types';
import {
  readRequiredPrompt,
  tryReadOptionalPrompts,
} from './configuration.helpers';

import {
  GatewayConfigSchema,
  GatewayConfig,
  GatewayModelConfig,
} from './gateway-config.schema';

export type {
  GatewayConfig,
  GatewayClientConfig,
  GatewayModelConfig,
  GatewayProviderInstanceConfig,
  GatewayCapabilitiesConfig,
  GatewayPolicyConfig,
  GatewayRetryConfig,
  GatewayParamsConfig,
  GatewayParamsBoundConfig,
} from './gateway-config.schema';
import { GatewayProviderType } from './provider-types';

export { EXPECTED_SCHEMA_VERSION } from './gateway-config.schema';

export interface ProviderInstanceRuntime {
  type: GatewayProviderType;
  apiKeyRef: string;
  apiKey: string;
}

const MASTER_PROMPT = 'src/config/system-prompt/MASTER_SYSTEM_PROMPT.md';
const MAIN_PROMPT = 'src/config/system-prompt/MAIN_SYSTEM_PROMPT.md';
const MODEL_PROMPTS = 'src/config/system-prompt/models/';

export function assertMasterKeyPresent(
  config: Pick<GatewayConfig, 'masterKeyRef'>,
  env: NodeJS.ProcessEnv = process.env,
) {
  const masterRaw = (env[config.masterKeyRef] ?? '').trim();
  if (!masterRaw) {
    throw new Error('[GatewayKey] Missing master key.');
  }
}

function buildGatewayKeyRuntime(
  config: GatewayConfig,
  env: NodeJS.ProcessEnv = process.env,
): GatewayKeyRuntimeConfig {
  assertMasterKeyPresent(config, env);

  const masterRaw = (env[config.masterKeyRef] ?? '').trim();

  const clients: ResolvedGatewayClient[] = [];
  for (const [instanceId, row] of Object.entries(config.clients)) {
    const gatewayKey = (env[row.gatewayKeyRef] ?? '').trim();
    clients.push({
      instanceId,
      name: row.name,
      type: row.type,
      gatewayKeyRef: row.gatewayKeyRef,
      gatewayKey,
      rateLimit: row.rateLimit,
    });
  }

  const allow = new Set<string>();
  allow.add(masterRaw);
  for (const client of clients) {
    if (client.gatewayKey) allow.add(client.gatewayKey);
  }
  console.error(
    'Registered clients:',
    clients.map((c) => ({ name: c.name, type: c.type })),
  );
  return {
    allowList: [...allow],
    masterKey: masterRaw,
    clients,
  };
}

export function buildEffectiveGatewayConfig(
  raw: z.infer<typeof GatewayConfigSchema>,
  env: NodeJS.ProcessEnv = process.env,
): GatewayConfig {
  const effectiveProviderEntries = Object.entries(raw.providers).filter(
    ([, row]) => row.enabled !== false,
  );
  const effectiveProviders = Object.fromEntries(effectiveProviderEntries);

  const effectiveModels: Record<string, GatewayModelConfig> = {};
  for (const [alias, model] of Object.entries(raw.models)) {
    const row = raw.providers[model.providerInstance];
    if (!row) continue;

    if (row.enabled === false) {
      console.warn(
        `[GatewayConfig] Skipping model "${alias}": provider instance "${model.providerInstance}" has enabled: false`,
      );
      continue;
    }
    effectiveModels[alias] = model;
  }

  if (Object.keys(effectiveModels).length === 0) {
    throw new Error(
      '[GatewayConfig] No active models after applying enabled flags; enable a provider used by your models or add models for an enabled provider.',
    );
  }

  for (const instanceId of Object.keys(effectiveProviders)) {
    const hasActiveModel = Object.values(effectiveModels).some(
      (model) => model.providerInstance === instanceId,
    );
    if (!hasActiveModel) {
      throw new Error(
        `[GatewayConfig] Enabled provider instance "${instanceId}" has no active model aliases. ` +
          `Add a model with providerInstance: ${instanceId} or set enabled: false on the provider.`,
      );
    }
  }

  for (const [instanceId, row] of Object.entries(effectiveProviders)) {
    const apiKey = (env[row.apiKeyRef] ?? '').trim();
    if (!apiKey) {
      throw new Error(
        `[GatewayConfig] Missing API key for enabled provider instance "${instanceId}" (expected non-empty env ${row.apiKeyRef})`,
      );
    }
  }

  return {
    ...raw,
    providers: effectiveProviders,
    models: effectiveModels,
  };
}

let gatewayConfigCache: GatewayConfig | undefined;

export function loadGatewayConfigFromFile(): GatewayConfig {
  if (gatewayConfigCache) return gatewayConfigCache;

  const configPath = join(process.cwd(), 'gateway.config.yaml');

  try {
    const fileContent = readFileSync(configPath, 'utf-8');
    const parsedYaml = yaml.load(fileContent);

    const validationResult = GatewayConfigSchema.safeParse(parsedYaml);

    if (!validationResult.success) {
      console.error(
        'Config validation failed:',
        validationResult.error.flatten().fieldErrors,
      );
      throw new Error('Invalid configuration file');
    }

    gatewayConfigCache = buildEffectiveGatewayConfig(validationResult.data);
    return gatewayConfigCache;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      console.error('Config file not found:', configPath);
      throw new Error('Configuration file not found.');
    }
    throw error;
  }
}

export default () => {
  const gatewayConfig = loadGatewayConfigFromFile();
  const gatewayKey = buildGatewayKeyRuntime(gatewayConfig);

  const cwd = process.cwd();
  const master = readRequiredPrompt(
    'MASTER_SYSTEM_PROMPT',
    join(cwd, MASTER_PROMPT),
  );
  const main = tryReadOptionalPrompts(join(cwd, MAIN_PROMPT));

  const perModelByAlias: Record<string, string> = {};

  for (const alias of Object.keys(gatewayConfig.models)) {
    const perModelPath = join(cwd, MODEL_PROMPTS, `${alias}.md`);
    const content = tryReadOptionalPrompts(perModelPath);

    if (content) perModelByAlias[alias] = content;
  }

  const systemPromptsResolved: ResolvedSystemPrompts = {
    master,
    main,
    perModelByAlias,
  };

  const providersByInstance: Record<string, ProviderInstanceRuntime> = {};

  for (const [instanceId, row] of Object.entries(gatewayConfig.providers)) {
    providersByInstance[instanceId] = {
      type: row.type,
      apiKeyRef: row.apiKeyRef,
      apiKey: (process.env[row.apiKeyRef] ?? '').trim(),
    };
  }

  const cacheEnabled = process.env.CACHE_ENABLED === 'true';
  const cacheBackendRaw = (process.env.CACHE_BACKEND || 'noop').toLowerCase();
  const cacheConfig = {
    enabled: cacheEnabled,
    backend: cacheEnabled ? cacheBackendRaw : 'noop',
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10),
    keyPrefix: process.env.CACHE_KEY_PREFIX || 'aigw:',
  };

  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'aigw:',
  };

  const rateLimitSmartEnabled = process.env.RATE_LIMIT_SMART_ENABLED === 'true';

  return {
    gateway: gatewayConfig,
    gatewayKey,
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    providers: providersByInstance,
    resolvedSystemPrompts: systemPromptsResolved,
    cache: cacheConfig,
    redis: redisConfig,
    RATE_LIMIT_SMART_ENABLED: rateLimitSmartEnabled,
  };
};
