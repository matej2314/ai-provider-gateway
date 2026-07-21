import { Test } from '@nestjs/testing';
import {
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  asEnvRef,
  asMaxAttempts,
  asModelAlias,
  asProviderInstanceId,
  asTimeoutMs,
} from '../common/types/branded.types';
import { ProviderRegistryService } from './provider-registry.service';
import { LoggingService } from '../logging/logging.service';
import { ApiErrorCode } from '../common/errors/api-error.code';
import { UnsupportedProviderException } from '../common/exceptions/unsupported-provider.exception';
import { RETRY_POLICY_DEFAULTS } from '../common/retry-policy-defaults';
import { createMockLoggingService } from '../common/mocks/createMockLoggingService';
import { createMockAIProvider } from '../common/mocks/createMockAIProvider';
import {
  createMockConfigService,
  type MockConfigServiceOptions,
} from '../common/mocks/createMockConfigService';
import {
  createTestGatewayConfig,
  type CreateTestGatewayConfigOptions,
} from '../common/mocks/createTestGatewayConfig';
import {
  TEST_MASTER_KEY_REF,
  TEST_MAX_ATTEMPTS,
  TEST_PROVIDER_INSTANCE,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_TIMEOUT_MS,
} from '../common/mocks/test-constants';
import type { AIProvider } from './interfaces/ai-provider.interface';

import type { GatewayConfig } from '../config/configuration';

const RESOLVE_MODEL_ALIAS = asModelAlias('test-model');

const DEFAULT_RESOLVE_MODEL: GatewayConfig['models'][string] = {
  modelId: 'claude-sonnet-4-5',
  providerInstance: TEST_PROVIDER_INSTANCE_BRANDED,
  policy: {
    timeoutMs: TEST_TIMEOUT_MS,
    retry: { maxAttempts: TEST_MAX_ATTEMPTS, onStatus: [429, 500] },
    params: {
      defaults: { temperature: 0.7 },
      allowOverrides: ['temperature'],
      bounds: {},
    },
  },
  capabilities: {
    tools: true,
  },
};

const DEFAULT_RESOLVE_PROVIDERS: GatewayConfig['providers'] = {
  [TEST_PROVIDER_INSTANCE]: {
    type: 'anthropic',
    apiKeyRef: asEnvRef('ANTHROPIC_API_KEY'),
    enabled: true,
    baseUrlRef: undefined,
  },
};

const EMPTY_MODEL_POLICY: NonNullable<
  GatewayConfig['models'][string]['policy']
> = {
  timeoutMs: undefined,
  retry: {},
  params: {
    defaults: {},
    allowOverrides: [],
    bounds: {},
  },
};

const TIMEOUT_ONLY_MODEL_POLICY = {
  timeoutMs: asTimeoutMs(5000),
  params: {
    defaults: {},
    allowOverrides: [] as string[],
    bounds: {},
  },
} as NonNullable<GatewayConfig['models'][string]['policy']>;

function buildResolveGateway(options: CreateTestGatewayConfigOptions = {}) {
  const {
    models: modelOverrides,
    providers: providerOverrides,
    replace,
    ...rest
  } = options;

  const extraModels = { ...modelOverrides };
  const resolveModelPatch = extraModels?.[RESOLVE_MODEL_ALIAS];
  delete extraModels?.[RESOLVE_MODEL_ALIAS];

  return createTestGatewayConfig({
    clients: {},
    replace: { clients: true, models: true, providers: true, ...replace },
    ...rest,
    models: {
      [RESOLVE_MODEL_ALIAS]: {
        ...DEFAULT_RESOLVE_MODEL,
        ...resolveModelPatch,
      },
      ...extraModels,
    },
    providers: replace?.providers
      ? (providerOverrides ?? {})
      : {
          ...DEFAULT_RESOLVE_PROVIDERS,
          ...providerOverrides,
        },
  });
}

describe('ProviderRegistryService', () => {
  let service: ProviderRegistryService;
  let mockConfig: Partial<ConfigService>;
  let mockLogger: Partial<LoggingService>;
  let mockProvider: Partial<AIProvider>;

  async function initService(configOptions: MockConfigServiceOptions = {}) {
    mockConfig = createMockConfigService(configOptions);
    mockLogger = createMockLoggingService();
    mockProvider = createMockAIProvider();

    const module = await Test.createTestingModule({
      providers: [
        ProviderRegistryService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: LoggingService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(ProviderRegistryService);
  }

  function registerAnthropicPrimary(
    provider: AIProvider = mockProvider as AIProvider,
  ) {
    service.registerInstance(
      TEST_PROVIDER_INSTANCE_BRANDED,
      'anthropic',
      provider,
    );
  }

  beforeEach(async () => {
    await initService();
  });

  it('should create a scoped logger on construction', () => {
    expect(mockLogger.child).toHaveBeenCalledWith({
      module: 'ProviderRegistryService',
    });
  });

  describe('registerInstance', () => {
    it('should register provider instance', () => {
      registerAnthropicPrimary();

      expect(service.list()).toEqual([TEST_PROVIDER_INSTANCE]);
    });

    it('should overwrite existing instance on re-register', async () => {
      const firstProvider = { complete: jest.fn() } as AIProvider;
      const secondProvider = { complete: jest.fn() } as AIProvider;

      await initService({
        gateway: buildResolveGateway({
          models: {
            [RESOLVE_MODEL_ALIAS]: {
              modelId: 'claude-sonnet-4-5',
              providerInstance: TEST_PROVIDER_INSTANCE_BRANDED,
            },
          },
          providers: {
            [TEST_PROVIDER_INSTANCE]: {
              type: 'anthropic',
              apiKeyRef: asEnvRef('ANTHROPIC_API_KEY'),
              enabled: true,
            },
          },
        }),
      });

      service.registerInstance(
        TEST_PROVIDER_INSTANCE_BRANDED,
        'anthropic',
        firstProvider,
      );
      service.registerInstance(
        TEST_PROVIDER_INSTANCE_BRANDED,
        'anthropic',
        secondProvider,
      );

      expect(service.resolve(RESOLVE_MODEL_ALIAS).provider).toBe(
        secondProvider,
      );
    });

    it('should register multiple instances', () => {
      service.registerInstance(
        asProviderInstanceId('anthropic-1'),
        'anthropic',
        mockProvider as AIProvider,
      );
      service.registerInstance(
        asProviderInstanceId('google-1'),
        'google',
        mockProvider as AIProvider,
      );

      expect(service.list()).toEqual(
        expect.arrayContaining(['anthropic-1', 'google-1']),
      );
    });
  });

  describe('list', () => {
    it('should return empty array when no instances registered', () => {
      expect(service.list()).toEqual([]);
    });

    it('should return registered instance ids', () => {
      registerAnthropicPrimary();

      expect(service.list()).toEqual([TEST_PROVIDER_INSTANCE]);
    });
  });

  describe('resolve', () => {
    beforeEach(async () => {
      await initService({ gateway: buildResolveGateway() });
      registerAnthropicPrimary();
    });

    it('should resolve model alias to config', () => {
      const result = service.resolve(RESOLVE_MODEL_ALIAS);

      expect(mockConfig.get).toHaveBeenCalledWith('gateway');
      expect(result.modelAlias).toBe(RESOLVE_MODEL_ALIAS);
      expect(result.modelId).toBe('claude-sonnet-4-5');
      expect(result.providerName).toBe(TEST_PROVIDER_INSTANCE);
      expect(result.providerType).toBe('anthropic');
      expect(result.provider).toBe(mockProvider);
    });

    it('should include params config', () => {
      const result = service.resolve(RESOLVE_MODEL_ALIAS);

      expect(result.params).toEqual({
        defaults: { temperature: 0.7 },
        allowOverrides: ['temperature'],
        bounds: {},
      });
    });

    it('should include policy config', () => {
      const result = service.resolve(RESOLVE_MODEL_ALIAS);

      expect(result.policy).toEqual({
        timeoutMs: 30000,
        retry: { maxAttempts: 3, onStatus: [429, 500] },
      });
    });

    it('should apply retry policy defaults when values are omitted', async () => {
      await initService({
        gateway: buildResolveGateway({
          models: {
            [RESOLVE_MODEL_ALIAS]: {
              policy: {
                timeoutMs: undefined,
                retry: {},
                params: EMPTY_MODEL_POLICY.params,
              },
            },
          },
        }),
      });
      registerAnthropicPrimary();

      const result = service.resolve(RESOLVE_MODEL_ALIAS);

      expect(result.policy).toEqual({
        timeoutMs: RETRY_POLICY_DEFAULTS.timeoutMs,
        retry: {
          maxAttempts: RETRY_POLICY_DEFAULTS.maxAttempts,
          onStatus: RETRY_POLICY_DEFAULTS.onStatus,
        },
      });
    });

    it('should include timeoutMs without retry when retry block is absent', async () => {
      await initService({
        gateway: {
          schemaVersion: 1,
          masterKeyRef: asEnvRef(TEST_MASTER_KEY_REF),
          clients: {},
          models: {
            [RESOLVE_MODEL_ALIAS]: {
              modelId: 'claude-sonnet-4-5',
              providerInstance: TEST_PROVIDER_INSTANCE_BRANDED,
              capabilities: {},
              policy: TIMEOUT_ONLY_MODEL_POLICY,
            },
          },
          providers: DEFAULT_RESOLVE_PROVIDERS,
        },
      });
      registerAnthropicPrimary();

      const result = service.resolve(RESOLVE_MODEL_ALIAS);

      expect(result.policy).toEqual({
        timeoutMs: 5000,
        retry: undefined,
      });
    });

    it('should default only omitted retry fields', async () => {
      await initService({
        gateway: buildResolveGateway({
          models: {
            [RESOLVE_MODEL_ALIAS]: {
              policy: {
                timeoutMs: asTimeoutMs(15000),
                retry: { maxAttempts: asMaxAttempts(2) },
                params: EMPTY_MODEL_POLICY.params,
              },
            },
          },
        }),
      });
      registerAnthropicPrimary();

      const result = service.resolve(RESOLVE_MODEL_ALIAS);

      expect(result.policy).toEqual({
        timeoutMs: 15000,
        retry: {
          maxAttempts: 2,
          onStatus: RETRY_POLICY_DEFAULTS.onStatus,
        },
      });
    });

    it('should include capabilities', () => {
      const result = service.resolve(RESOLVE_MODEL_ALIAS);

      expect(result.capabilities).toEqual({
        tools: true,
      });
    });

    it('should throw when model alias not found', () => {
      expect(() => service.resolve('nonexistent')).toThrow(HttpException);

      try {
        service.resolve('nonexistent');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect((e as HttpException).getResponse()).toMatchObject({
          code: ApiErrorCode.MODEL_ALIAS_NOT_FOUND,
          message: expect.stringContaining('nonexistent'),
        });
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Model alias not found in config:',
        { modelAlias: 'nonexistent' },
      );
    });

    it('should throw when provider instance missing from config', async () => {
      await initService({
        gateway: buildResolveGateway({
          models: {
            [RESOLVE_MODEL_ALIAS]: {
              modelId: 'test',
              providerInstance: asProviderInstanceId('nonexistent-provider'),
              policy: EMPTY_MODEL_POLICY,
            },
          },
          providers: {},
          replace: { providers: true },
        }),
      });
      registerAnthropicPrimary();

      expect(() => service.resolve(RESOLVE_MODEL_ALIAS)).toThrow(HttpException);

      try {
        service.resolve(RESOLVE_MODEL_ALIAS);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect((e as HttpException).getResponse()).toMatchObject({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: expect.stringContaining('nonexistent-provider'),
        });
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Provider instance not found in config:',
        { providerInstance: 'nonexistent-provider' },
      );
    });

    it('should throw when provider instance not registered', async () => {
      await initService({
        gateway: buildResolveGateway({
          models: {
            [RESOLVE_MODEL_ALIAS]: {
              modelId: 'test',
              providerInstance: asProviderInstanceId('unregistered-provider'),
              policy: EMPTY_MODEL_POLICY,
            },
          },
          providers: {
            'unregistered-provider': {
              type: 'anthropic',
              apiKeyRef: asEnvRef('ANTHROPIC_API_KEY'),
              enabled: true,
            },
          },
        }),
      });

      expect(() => service.resolve(RESOLVE_MODEL_ALIAS)).toThrow(
        UnsupportedProviderException,
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Provider instance not registered:',
        { instanceId: 'unregistered-provider', type: 'anthropic' },
      );
    });

    it('should throw when gateway config missing', async () => {
      await initService({ gateway: null });
      registerAnthropicPrimary();

      expect(() => service.resolve(RESOLVE_MODEL_ALIAS)).toThrow(
        InternalServerErrorException,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Gateway config not found.',
        expect.any(Error),
      );
    });

    it('should throw when registered provider type mismatches config', () => {
      service.registerInstance(
        TEST_PROVIDER_INSTANCE_BRANDED,
        'google',
        mockProvider as AIProvider,
      );

      expect(() => service.resolve(RESOLVE_MODEL_ALIAS)).toThrow(
        InternalServerErrorException,
      );
      expect(() => service.resolve(RESOLVE_MODEL_ALIAS)).toThrow(
        `Provider instance "${TEST_PROVIDER_INSTANCE}" type mismatch: config=anthropic, registry=google`,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Provider instance type mismatch:',
        expect.objectContaining({
          name: 'ProviderInstanceTypeMismatch',
          message: expect.stringContaining('config=anthropic'),
        }),
      );
    });

    it('should include fallbackAlias when configured', async () => {
      await initService({
        gateway: buildResolveGateway({
          models: {
            [RESOLVE_MODEL_ALIAS]: {
              fallback: 'fallback-model',
              policy: EMPTY_MODEL_POLICY,
            },
            'fallback-model': {
              modelId: 'claude-haiku',
              providerInstance: TEST_PROVIDER_INSTANCE_BRANDED,
              policy: EMPTY_MODEL_POLICY,
            },
          },
        }),
      });
      registerAnthropicPrimary();

      const result = service.resolve(RESOLVE_MODEL_ALIAS);

      expect(result.fallbackAlias).toBe('fallback-model');
    });

    it('should omit fallbackAlias when model has no fallback configured', () => {
      const result = service.resolve(RESOLVE_MODEL_ALIAS);

      expect(result.fallbackAlias).toBeUndefined();
    });

    it('should omit fallbackAlias when fallback alias is missing from config', async () => {
      await initService({
        gateway: buildResolveGateway({
          models: {
            [RESOLVE_MODEL_ALIAS]: {
              fallback: 'missing-fallback',
              policy: EMPTY_MODEL_POLICY,
            },
          },
        }),
      });
      registerAnthropicPrimary();

      const result = service.resolve(RESOLVE_MODEL_ALIAS);

      expect(result.fallbackAlias).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Fallback alias not found in config:',
        { modelAlias: RESOLVE_MODEL_ALIAS, fallback: 'missing-fallback' },
      );
    });

    it('should default capabilities when not configured', async () => {
      await initService({
        gateway: createTestGatewayConfig({
          models: {
            [RESOLVE_MODEL_ALIAS]: {
              modelId: 'test',
              providerInstance: TEST_PROVIDER_INSTANCE_BRANDED,
              policy: EMPTY_MODEL_POLICY,
            },
          },
          providers: DEFAULT_RESOLVE_PROVIDERS,
          replace: { models: true, providers: true, clients: true },
        }),
      });
      registerAnthropicPrimary();

      const result = service.resolve(RESOLVE_MODEL_ALIAS);

      expect(result.capabilities).toEqual({});
    });

    it('should omit policy when model has no policy block', async () => {
      await initService({
        gateway: createTestGatewayConfig({
          models: {
            [RESOLVE_MODEL_ALIAS]: {
              modelId: 'test',
              providerInstance: TEST_PROVIDER_INSTANCE_BRANDED,
            },
          },
          providers: DEFAULT_RESOLVE_PROVIDERS,
          replace: { models: true, providers: true },
        }),
      });
      registerAnthropicPrimary();

      const result = service.resolve(RESOLVE_MODEL_ALIAS);

      expect(result.policy).toBeUndefined();
      expect(result.params).toBeUndefined();
    });
  });

  describe('resolve — multiple model aliases sequentially', () => {
    const ALIAS_A = 'chat-default';
    const ALIAS_B = 'fast-chat';
    const PROVIDER_A = asProviderInstanceId('anthropic-primary');
    const PROVIDER_B = asProviderInstanceId('google-primary');
    const MODEL_ID_A = 'claude-sonnet-4-5';
    const MODEL_ID_B = 'gemini-2.5-flash';

    let providerA: AIProvider;
    let providerB: AIProvider;

    beforeEach(async () => {
      providerA = createMockAIProvider() as AIProvider;
      providerB = createMockAIProvider() as AIProvider;

      await initService({
        gateway: buildResolveGateway({
          replace: { clients: true, providers: true, models: true },
          providers: {
            [PROVIDER_A]: {
              type: 'anthropic',
              apiKeyRef: asEnvRef('ANTHROPIC_API_KEY'),
              enabled: true,
            },
            [PROVIDER_B]: {
              type: 'google',
              apiKeyRef: asEnvRef('GOOGLE_API_KEY'),
              enabled: true,
            },
          },
          models: {
            [ALIAS_A]: {
              modelId: MODEL_ID_A,
              providerInstance: PROVIDER_A,
              capabilities: { streaming: true, tools: true },
              policy: EMPTY_MODEL_POLICY,
            },
            [ALIAS_B]: {
              modelId: MODEL_ID_B,
              providerInstance: PROVIDER_B,
              capabilities: { streaming: true, tools: false },
              policy: EMPTY_MODEL_POLICY,
            },
          },
        }),
      });

      service.registerInstance(PROVIDER_A, 'anthropic', providerA);
      service.registerInstance(PROVIDER_B, 'google', providerB);
    });

    it('should resolve alias A then alias B with distinct modelId, provider and instance', () => {
      const first = service.resolve(ALIAS_A);
      const second = service.resolve(ALIAS_B);

      expect(first).toMatchObject({
        modelAlias: ALIAS_A,
        modelId: MODEL_ID_A,
        providerName: PROVIDER_A,
        providerType: 'anthropic',
        provider: providerA,
      });

      expect(second).toMatchObject({
        modelAlias: ALIAS_B,
        modelId: MODEL_ID_B,
        providerName: PROVIDER_B,
        providerType: 'google',
        provider: providerB,
      });

      expect(first.provider).not.toBe(second.provider);
    });

    it('should resolve alias B then alias A without cross-contamination', () => {
      const secondFirst = service.resolve(ALIAS_B);
      const firstSecond = service.resolve(ALIAS_A);

      expect(secondFirst.modelId).toBe(MODEL_ID_B);
      expect(firstSecond.modelId).toBe(MODEL_ID_A);
      expect(secondFirst.provider).toBe(providerB);
      expect(firstSecond.provider).toBe(providerA);
    });

    it('should keep independent capabilities per alias across sequential resolves', () => {
      const a = service.resolve(ALIAS_A);
      const b = service.resolve(ALIAS_B);
      const aAgain = service.resolve(ALIAS_A);

      expect(a.capabilities.tools).toBe(true);
      expect(b.capabilities.tools).toBe(false);
      expect(aAgain.capabilities.tools).toBe(true);
      expect(aAgain.provider).toBe(a.provider);
    });
  });

  describe('resolve — OpenAI apiSurface', () => {
    const OPENAI_ALIAS = 'gpt-4o-alias';
    const OLLAMA_ALIAS = 'ollama-alias';
    const OPENAI_INSTANCE = asProviderInstanceId('openai-main');
    const OLLAMA_INSTANCE = asProviderInstanceId('ollama-local');

    beforeEach(async () => {
      await initService({
        gateway: buildResolveGateway({
          replace: { clients: true, providers: true, models: true },
          providers: {
            [OPENAI_INSTANCE]: {
              type: 'openai',
              apiKeyRef: asEnvRef('OPENAI_API_KEY'),
              baseUrlRef: asEnvRef('OPENAI_BASE_URL'),
              enabled: true,
            },
            [OLLAMA_INSTANCE]: {
              type: 'openai-compatible',
              apiKeyRef: asEnvRef('OLLAMA_API_KEY'),
              baseUrlRef: asEnvRef('OLLAMA_BASE_URL'),
              enabled: true,
            },
          },
          models: {
            [OPENAI_ALIAS]: {
              modelId: 'gpt-4o',
              providerInstance: OPENAI_INSTANCE,
              policy: EMPTY_MODEL_POLICY,
            },
            [OLLAMA_ALIAS]: {
              modelId: 'llama3.2',
              providerInstance: OLLAMA_INSTANCE,
              policy: EMPTY_MODEL_POLICY,
            },
          },
        }),
      });

      service.registerInstance(
        OPENAI_INSTANCE,
        'openai',
        createMockAIProvider() as AIProvider,
      );
      service.registerInstance(
        OLLAMA_INSTANCE,
        'openai-compatible',
        createMockAIProvider() as AIProvider,
      );
    });

    it('should set openAiApiSurface to responses for type openai', () => {
      const result = service.resolve(OPENAI_ALIAS);

      expect(result).toMatchObject({
        modelAlias: OPENAI_ALIAS,
        modelId: 'gpt-4o',
        providerName: OPENAI_INSTANCE,
        providerType: 'openai',
        openAiApiSurface: 'responses',
      });
    });

    it('should set openAiApiSurface to chat-completions for type openai-compatible', () => {
      const result = service.resolve(OLLAMA_ALIAS);

      expect(result).toMatchObject({
        modelAlias: OLLAMA_ALIAS,
        modelId: 'llama3.2',
        providerName: OLLAMA_INSTANCE,
        providerType: 'openai-compatible',
        openAiApiSurface: 'chat-completions',
      });
    });

    it('should omit openAiApiSurface for non-OpenAI provider types', async () => {
      await initService({
        gateway: buildResolveGateway({
          replace: { clients: true, providers: true, models: true },
          providers: {
            [TEST_PROVIDER_INSTANCE]: {
              type: 'anthropic',
              apiKeyRef: asEnvRef('ANTHROPIC_API_KEY'),
              enabled: true,
            },
          },
          models: {
            [RESOLVE_MODEL_ALIAS]: {
              modelId: 'claude-sonnet-4-5',
              providerInstance: TEST_PROVIDER_INSTANCE_BRANDED,
              policy: EMPTY_MODEL_POLICY,
            },
          },
        }),
      });
      service.registerInstance(
        TEST_PROVIDER_INSTANCE_BRANDED,
        'anthropic',
        createMockAIProvider() as AIProvider,
      );

      const result = service.resolve(RESOLVE_MODEL_ALIAS);

      expect(result.providerType).toBe('anthropic');
      expect(result.openAiApiSurface).toBeUndefined();
    });
  });
});
