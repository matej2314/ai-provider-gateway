import { ConfigService } from '@nestjs/config';
import type { ProviderInstanceRuntime } from '../../config/configuration';
import type { GatewayConfig } from '../../config/configuration';
import type {
  GatewayKeyRuntimeConfig,
  ResolvedSystemPrompts,
} from '../../config/configuration.types';
import {
  createTestGatewayConfig,
  type CreateTestGatewayConfigOptions,
} from './createTestGatewayConfig';
import {
  TEST_API_KEY_REF,
  TEST_GATEWAY_KEY,
  TEST_PROVIDER_INSTANCE,
} from './test-constants';

type Nullable<T> = T | null | undefined;

export type TestGatewayKeyRuntimeOptions = Partial<GatewayKeyRuntimeConfig>;

export type TestResolvedSystemPromptsOptions = Partial<ResolvedSystemPrompts>;

export type TestCacheConfigOptions = {
  enabled?: boolean;
  backend?: string;
  ttl?: number;
  keyPrefix?: string;
};

export type TestRedisConfigOptions = {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
};

export type TestRateLimitConfigOptions = {
  rps?: number;
  burst?: number;
  maxConcurrentStreams?: number;
  cooldownAfter429?: number;
};

export type MockConfigServiceOptions = {
  /** Full gateway config object. Takes precedence over `gatewayOptions`. */
  gateway?: Nullable<GatewayConfig>;
  /** Build gateway config via `createTestGatewayConfig` (merged with defaults). */
  gatewayOptions?: CreateTestGatewayConfigOptions;
  gatewayKey?: Nullable<TestGatewayKeyRuntimeOptions>;
  resolvedSystemPrompts?: Nullable<TestResolvedSystemPromptsOptions>;
  providers?: Nullable<Record<string, Partial<ProviderInstanceRuntime>>>;
  cache?: Nullable<TestCacheConfigOptions>;
  redis?: Nullable<TestRedisConfigOptions>;
  rateLimit?: TestRateLimitConfigOptions;
  port?: number;
  nodeEnv?: string;
  /** Extra top-level config keys returned by ConfigService.get. */
  extra?: Record<string, unknown>;
};

type ConfigRoot = {
  gateway: GatewayConfig;
  gatewayKey: GatewayKeyRuntimeConfig;
  resolvedSystemPrompts: ResolvedSystemPrompts;
  providers: Record<string, ProviderInstanceRuntime>;
  cache: Required<TestCacheConfigOptions>;
  redis: Required<TestRedisConfigOptions>;
  port: number;
  nodeEnv: string;
};

type ConfigFlat = {
  RATE_LIMIT_RPS_PER_KEY: number;
  RATE_LIMIT_BURST_PER_KEY: number;
  RATE_LIMIT_STREAMS_CONCURRENT: number;
  RATE_LIMIT_COOLDOWN_AFTER_429: number;
};

function getByPath(source: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = source;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function resolveGateway(
  options: MockConfigServiceOptions,
): GatewayConfig | undefined {
  if (options.gateway === null) {
    return undefined;
  }

  if (options.gateway !== undefined) {
    return options.gateway;
  }

  if (options.gatewayOptions) {
    return createTestGatewayConfig(options.gatewayOptions);
  }

  return createTestGatewayConfig();
}

export function createTestGatewayKeyRuntimeConfig(
  overrides: TestGatewayKeyRuntimeOptions = {},
): GatewayKeyRuntimeConfig {
  return {
    allowList: [TEST_GATEWAY_KEY, 'gw_valid_key_123'],
    masterKey: 'master-test-key',
    clients: [],
    ...overrides,
  };
}

export function createTestResolvedSystemPrompts(
  overrides: TestResolvedSystemPromptsOptions = {},
): ResolvedSystemPrompts {
  return {
    master: 'master prompt',
    main: 'main prompt',
    perModelByAlias: {},
    ...overrides,
  };
}

function buildDefaultConfigSnapshot(
  options: MockConfigServiceOptions,
): { root: ConfigRoot; flat: ConfigFlat; extra: Record<string, unknown> } {
  const rateLimit = {
    rps: 10,
    burst: 20,
    maxConcurrentStreams: 3,
    cooldownAfter429: 60,
    ...options.rateLimit,
  };

  const gateway = resolveGateway(options);

  const gatewayKey =
    options.gatewayKey === null
      ? undefined
      : createTestGatewayKeyRuntimeConfig(options.gatewayKey ?? {});

  const resolvedSystemPrompts =
    options.resolvedSystemPrompts === null
      ? undefined
      : createTestResolvedSystemPrompts(options.resolvedSystemPrompts ?? {});

  const providers =
    options.providers === null
      ? undefined
      : {
          [TEST_PROVIDER_INSTANCE]: {
            type: 'anthropic' as const,
            apiKeyRef: TEST_API_KEY_REF,
            apiKey: 'sk-test-api-key',
          },
          ...options.providers,
        };

  const cache =
    options.cache === null
      ? undefined
      : {
          enabled: true,
          backend: 'noop',
          ttl: 3600,
          keyPrefix: 'aigw:',
          ...options.cache,
        };

  const redis =
    options.redis === null
      ? undefined
      : {
          host: 'localhost',
          port: 6379,
          password: '',
          db: 0,
          keyPrefix: 'aigw:',
          ...options.redis,
        };

  const root = {
    gateway,
    gatewayKey,
    resolvedSystemPrompts,
    providers,
    cache,
    redis,
    port: options.port ?? 3000,
    nodeEnv: options.nodeEnv ?? 'test',
  } as ConfigRoot;

  return {
    root,
    flat: {
      RATE_LIMIT_RPS_PER_KEY: rateLimit.rps,
      RATE_LIMIT_BURST_PER_KEY: rateLimit.burst,
      RATE_LIMIT_STREAMS_CONCURRENT: rateLimit.maxConcurrentStreams,
      RATE_LIMIT_COOLDOWN_AFTER_429: rateLimit.cooldownAfter429,
    },
    extra: options.extra ?? {},
  };
}

export function createMockConfigService(
  options: MockConfigServiceOptions = {},
): Partial<ConfigService> {
  const snapshot = buildDefaultConfigSnapshot(options);
  const rootRecord = snapshot.root as unknown as Record<string, unknown>;

  return {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (Object.prototype.hasOwnProperty.call(snapshot.extra, key)) {
        return snapshot.extra[key];
      }

      if (Object.prototype.hasOwnProperty.call(snapshot.flat, key)) {
        return snapshot.flat[key as keyof ConfigFlat];
      }

      if (Object.prototype.hasOwnProperty.call(rootRecord, key)) {
        const value = rootRecord[key];
        return value === undefined ? defaultValue : value;
      }

      const nestedValue = getByPath(rootRecord, key);
      if (nestedValue !== undefined) {
        return nestedValue;
      }

      return defaultValue;
    }),
  };
}
