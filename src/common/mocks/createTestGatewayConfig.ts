import type { GatewayConfig } from '../../config/configuration';
import { asEnvRef, asModelId, asProviderInstanceId } from '../types';
import {
  TEST_API_KEY_REF,
  TEST_MASTER_KEY_REF,
  TEST_MODEL_ALIAS,
  TEST_PROVIDER_INSTANCE,
} from './test-constants';

type GatewayModelOverrides = {
  [alias: string]: Partial<GatewayConfig['models'][string]>;
};

export type CreateTestGatewayConfigOptions = {
  schemaVersion?: number;
  masterKeyRef?: string;
  clients?: GatewayConfig['clients'];
  providers?: Record<string, Partial<GatewayConfig['providers'][string]>>;
  models?: GatewayModelOverrides;
  /** Replace entire sections instead of merging with defaults. */
  replace?: Partial<Record<'clients' | 'providers' | 'models', boolean>>;
};

function defaultGatewayConfig(): GatewayConfig {
  return {
    schemaVersion: 1,
    masterKeyRef: asEnvRef(TEST_MASTER_KEY_REF),
    clients: {},
    providers: {
      [TEST_PROVIDER_INSTANCE]: {
        type: 'anthropic',
        apiKeyRef: asEnvRef(TEST_API_KEY_REF),
        enabled: true,
        baseUrlRef: undefined,
      },
    },
    models: {
      [TEST_MODEL_ALIAS]: {
        providerInstance: asProviderInstanceId(TEST_PROVIDER_INSTANCE),
        modelId: asModelId('claude-sonnet-4-5'),
        capabilities: { tools: true, streaming: true },
        policy: {
          timeoutMs: undefined,
          retry: {},
          params: {
            defaults: {},
            allowOverrides: [],
            bounds: {},
          },
        },
      },
    },
  };
}

export function createTestGatewayConfig(
  options: CreateTestGatewayConfigOptions = {},
): GatewayConfig {
  const base = defaultGatewayConfig();
  const replace = options.replace ?? {};

  const clients = replace.clients
    ? (options.clients ?? {})
    : { ...base.clients, ...(options.clients ?? {}) };

  const providers = replace.providers
    ? ((options.providers as GatewayConfig['providers']) ?? {})
    : mergeProviders(base.providers, options.providers);

  const models = replace.models
    ? mergeModels({}, options.models)
    : mergeModels(base.models, options.models);

  return {
    schemaVersion: options.schemaVersion ?? base.schemaVersion,
    masterKeyRef: options.masterKeyRef
      ? asEnvRef(options.masterKeyRef)
      : base.masterKeyRef,
    clients,
    providers,
    models,
  };
}

export function createEmptyTestGatewayConfig(): GatewayConfig {
  return createTestGatewayConfig({
    clients: {},
    providers: {},
    models: {},
    replace: { clients: true, providers: true, models: true },
  });
}

function mergeProviders(
  base: GatewayConfig['providers'],
  overrides?: CreateTestGatewayConfigOptions['providers'],
): GatewayConfig['providers'] {
  if (!overrides) return { ...base };

  const merged = { ...base };
  for (const [instanceId, row] of Object.entries(overrides)) {
    merged[instanceId] = {
      ...base[instanceId],
      ...row,
    };
  }
  return merged;
}

function mergeModels(
  base: GatewayConfig['models'],
  overrides?: GatewayModelOverrides,
): GatewayConfig['models'] {
  if (!overrides) return { ...base };

  const merged = { ...base };
  for (const [alias, model] of Object.entries(overrides)) {
    merged[alias] = {
      ...base[alias],
      ...model,
      capabilities: {
        ...base[alias]?.capabilities,
        ...model.capabilities,
      },
      policy: model.policy
        ? {
            ...base[alias]?.policy,
            ...model.policy,
            retry: {
              ...base[alias]?.policy?.retry,
              ...model.policy.retry,
            },
            params: {
              ...base[alias]?.policy?.params,
              ...model.policy.params,
              defaults: {
                ...base[alias]?.policy?.params?.defaults,
                ...model.policy.params?.defaults,
              },
              allowOverrides:
                model.policy.params?.allowOverrides ??
                base[alias]?.policy?.params?.allowOverrides ??
                [],
              bounds: {
                ...base[alias]?.policy?.params?.bounds,
                ...model.policy.params?.bounds,
              },
            },
          }
        : base[alias]?.policy,
    };
  }
  return merged;
}
