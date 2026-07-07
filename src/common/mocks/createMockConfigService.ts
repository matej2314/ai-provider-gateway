import { ConfigService } from '@nestjs/config';
import {
  createTestGatewayConfig,
  type CreateTestGatewayConfigOptions,
} from './createTestGatewayConfig';
import {
  TEST_API_KEY_REF,
  TEST_GATEWAY_KEY,
  TEST_PROVIDER_INSTANCE,
} from './test-constants';
import { asGatewayKey, asProviderApiKey } from '../types';
import {
  asMaxConcurrentStreams,
  asRateLimitBurst,
  asRateLimitRps,
  asCacheTtlSeconds,
  asPort,
} from '../types/branded.types';
import type { AppConfiguration } from '../../config/app-configuration.types';
import type { ProviderInstanceRuntime } from '../../config/configuration';
import type { GatewayConfig } from '../../config/configuration';
import type { CACHE_BACKEND_TYPE } from '../../cache/interfaces/cache-backend-interface';
import type {
  GatewayKeyRuntimeConfig,
  ResolvedSystemPrompts,
} from '../../config/configuration.types';
import type {
  CacheRuntimeConfig,
  RateLimitRuntimeConfig,
} from '../../config/app-configuration.types';

type Nullable<T> = T | null | undefined;

export type TestGatewayKeyRuntimeOptions = Partial<GatewayKeyRuntimeConfig>;

export type TestResolvedSystemPromptsOptions = Partial<ResolvedSystemPrompts>;

export type TestCacheConfigOptions = {
  enabled?: boolean;
  backend?: CACHE_BACKEND_TYPE;
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
  rateLimitSmartEnabled?: boolean;
  port?: number;
  nodeEnv?: string;
  /** Extra top-level config keys returned by ConfigService.get. */
  extra?: Record<string, unknown>;
};

type ConfigRoot = Partial<AppConfiguration>;

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
    allowList: [
      asGatewayKey(TEST_GATEWAY_KEY),
      asGatewayKey('gw_valid_key_123'),
    ],
    masterKey: asGatewayKey('master-test-key'),
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

function buildDefaultConfigSnapshot(options: MockConfigServiceOptions): {
  root: ConfigRoot;
  flat: ConfigFlat;
  extra: Record<string, unknown>;
} {
  const rateLimit: RateLimitRuntimeConfig = {
    rps: asRateLimitRps(options.rateLimit?.rps ?? 10),
    burst: asRateLimitBurst(options.rateLimit?.burst ?? 20),
    maxConcurrentStreams: asMaxConcurrentStreams(
      options.rateLimit?.maxConcurrentStreams ?? 3,
    ),
    cooldownAfter429: options.rateLimit?.cooldownAfter429 ?? 60,
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
            apiKey: asProviderApiKey('sk-test-api-key'),
          },
          ...options.providers,
        };

  const cache: CacheRuntimeConfig | undefined =
    options.cache === null
      ? undefined
      : {
          enabled: options.cache?.enabled ?? true,
          backend: options.cache?.backend ?? 'noop',
          keyPrefix: options.cache?.keyPrefix ?? 'aigw:',
          ttl: asCacheTtlSeconds(options.cache?.ttl ?? 3600),
        };

  const redis =
    options.redis === null
      ? undefined
      : {
          host: options.redis?.host ?? 'localhost',
          port: asPort(options.redis?.port ?? 6379),
          password: options.redis?.password ?? '',
          db: options.redis?.db ?? 0,
          keyPrefix: options.redis?.keyPrefix ?? 'aigw:',
        };

  const root = {
    gateway,
    gatewayKey,
    resolvedSystemPrompts,
    providers,
    cache,
    redis,
    port: asPort(options.port ?? 3000),
    nodeEnv: options.nodeEnv ?? 'test',
    RATE_LIMIT_SMART_ENABLED: options.rateLimitSmartEnabled ?? false,
    rateLimit: {
      rps: rateLimit.rps,
      burst: rateLimit.burst,
      maxConcurrentStreams: rateLimit.maxConcurrentStreams,
      cooldownAfter429: rateLimit.cooldownAfter429,
    },
  } satisfies Partial<AppConfiguration>;

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
