import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import {
  readRequiredPrompt,
  tryReadOptionalPrompts,
} from './configuration.helpers';

import {
  GatewayConfigSchema,
  GatewayConfig,
  GatewayModelConfig,
} from './gateway-config.schema';

import { isOpenAiProviderType } from './provider-types';
import {
  assertEnabledProviderBaseUrlPresent,
  resolveBaseUrlFromEnv,
} from './provider-base-url.validation';

import type {
  ResolvedSystemPrompts,
  ResolvedGatewayClient,
  GatewayKeyRuntimeConfig,
} from './configuration.types';
import type { AppConfiguration } from './app-configuration.types';

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
import {
  parseCacheBackend,
  validate,
  type ValidatedEnvironment,
} from './env.validation';
import { assertEnabledProviderApiKeysPresent } from './provider-api-key.validation';

export { EXPECTED_SCHEMA_VERSION } from './gateway-config.schema';

export interface ProviderInstanceRuntime {
  type: GatewayProviderType;
  apiKeyRef: string;
  apiKey: string;
  baseUrlRef?: string;
  baseUrl?: string;
  apiSurface?: 'chat-completions';
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

  assertEnabledProviderApiKeysPresent(raw, env);
  assertEnabledProviderBaseUrlPresent(raw, env);

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

export function buildAppConfiguration(
  rawEnv: NodeJS.ProcessEnv = process.env,
): AppConfiguration {
  const env: ValidatedEnvironment = validate(rawEnv);
  const gatewayConfig = loadGatewayConfigFromFile();
  const gatewayKey = buildGatewayKeyRuntime(gatewayConfig, rawEnv);

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
    const base: ProviderInstanceRuntime = {
      type: row.type,
      apiKeyRef: row.apiKeyRef,
      apiKey: (rawEnv[row.apiKeyRef] ?? '').trim(),
    };

    if (isOpenAiProviderType(row.type)) {
      providersByInstance[instanceId] = {
        ...base,
        baseUrlRef: row.baseUrlRef,
        baseUrl: resolveBaseUrlFromEnv(row.baseUrlRef, rawEnv),
        ...(row.type === 'openai-compatible' && {
          apiSurface: row.apiSurface ?? 'chat-completions',
        }),
      };
    } else {
      providersByInstance[instanceId] = base;
    }
  }

  const cacheEnabled = env.CACHE_ENABLED ?? false;

  const cacheConfig = {
    enabled: cacheEnabled,
    backend: parseCacheBackend(env.CACHE_BACKEND, cacheEnabled),
    ttl: env.CACHE_TTL ?? 3600,
    keyPrefix: env.CACHE_KEY_PREFIX ?? 'aigw:',
  };

  const redisConfig = {
    host: env.REDIS_HOST ?? 'localhost',
    port: env.REDIS_PORT ?? 6379,
    password: env.REDIS_PASSWORD ?? '',
    db: env.REDIS_DB ?? 0,
    keyPrefix: env.REDIS_KEY_PREFIX ?? 'aigw:',
  };

  const rateLimitSmartEnabled = env.RATE_LIMIT_SMART_ENABLED ?? false;

  return {
    gateway: gatewayConfig,
    gatewayKey,
    port: parseInt(rawEnv.PORT || '3000', 10),
    nodeEnv: rawEnv.NODE_ENV || 'development',
    providers: providersByInstance,
    resolvedSystemPrompts: systemPromptsResolved,
    cache: cacheConfig,
    redis: redisConfig,
    RATE_LIMIT_SMART_ENABLED: rateLimitSmartEnabled,
    rateLimit: {
      rps: env.RATE_LIMIT_RPS_PER_KEY ?? 10,
      burst: env.RATE_LIMIT_BURST_PER_KEY ?? 20,
      maxConcurrentStreams: env.RATE_LIMIT_STREAMS_CONCURRENT ?? 3,
      cooldownAfter429: env.RATE_LIMIT_COOLDOWN_AFTER_429 ?? 60,
    },
  };
}

export default () => buildAppConfiguration();
