import type { ConfigService } from '@nestjs/config';
import { ProviderInstancesBootstrap } from './provider-instances.bootstrap';
import { createAnthropicProvider } from './factories/create-anthropic-provider';
import { createGoogleProvider } from './factories/create-google-provider';
import { createOpenAiProvider } from './factories/create-openai-provider';
import { createOpenAiCompatibleProviderInstance } from './factories/create-openai-compatible-provider-instance';
import { createMockLoggingService } from '../common/mocks/createMockLoggingService';
import { createMockProviderRegistryService } from '../common/mocks/createMockProviderRegistryService';
import type { ProviderRegistryService } from './provider-registry.service';
import type { LoggingService } from '../logging/logging.service';
import type { GatewayProviderInstanceConfig } from '../config/gateway-config.schema';
import type { ProviderInstanceRuntime } from '../config/configuration';
import type { GatewayProviderType } from '../config/provider-types';
import { asEnvRef, asProviderInstanceId } from '../common/types';

jest.mock('./factories/create-anthropic-provider');
jest.mock('./factories/create-google-provider');
jest.mock('./factories/create-openai-provider');
jest.mock('./factories/create-openai-compatible-provider-instance');

const mockCreateAnthropicProvider = createAnthropicProvider as jest.Mock;
const mockCreateGoogleProvider = createGoogleProvider as jest.Mock;
const mockCreateOpenAiProvider = createOpenAiProvider as jest.Mock;
const mockCreateOpenAiCompatibleProviderInstance =
  createOpenAiCompatibleProviderInstance as jest.Mock;

type ProvidersRow = Record<string, GatewayProviderInstanceConfig>;
type RuntimeRow = Record<string, ProviderInstanceRuntime>;

function createConfigServiceMock(
  providers: ProvidersRow,
  runtime: RuntimeRow,
): ConfigService {
  const get = jest.fn((key: string) => {
    if (key === 'gateway') return { providers };
    if (key === 'providers') return runtime;
    return undefined;
  });
  return { get } as unknown as ConfigService;
}

function providerRow(
  overrides: Partial<GatewayProviderInstanceConfig> = {},
): GatewayProviderInstanceConfig {
  return {
    type: 'anthropic',
    apiKeyRef: asEnvRef('ANTHROPIC_API_KEY_TEST'),
    enabled: true,
    ...overrides,
  } as GatewayProviderInstanceConfig;
}

function runtimeRow(
  overrides: Partial<ProviderInstanceRuntime> = {},
): ProviderInstanceRuntime {
  return {
    type: 'anthropic',
    apiKeyRef: 'ANTHROPIC_API_KEY_TEST',
    apiKey: 'sk-ant-test',
    ...overrides,
  };
}

describe('ProviderInstancesBootstrap', () => {
  let registry: Partial<ProviderRegistryService>;
  let loggingService: Partial<LoggingService>;

  beforeEach(() => {
    jest.clearAllMocks();
    registry = createMockProviderRegistryService();
    loggingService = createMockLoggingService();
    mockCreateAnthropicProvider.mockReturnValue({ provider: 'anthropic-fake' });
    mockCreateGoogleProvider.mockReturnValue({ provider: 'google-fake' });
    mockCreateOpenAiProvider.mockReturnValue({ provider: 'openai-fake' });
    mockCreateOpenAiCompatibleProviderInstance.mockReturnValue({
      provider: 'openai-compatible-fake',
    });
  });

  function createBootstrap(
    providers: ProvidersRow,
    runtime: RuntimeRow,
  ): ProviderInstancesBootstrap {
    const configService = createConfigServiceMock(providers, runtime);
    return new ProviderInstancesBootstrap(
      configService,
      registry as ProviderRegistryService,
      loggingService as LoggingService,
    );
  }

  describe('happy path registration', () => {
    it('registers an anthropic instance via createAnthropicProvider with unwrapped apiKey', () => {
      const bootstrap = createBootstrap(
        { 'anthropic-primary': providerRow() },
        { 'anthropic-primary': runtimeRow() },
      );

      bootstrap.onApplicationBootstrap();

      expect(mockCreateAnthropicProvider).toHaveBeenCalledWith(
        'sk-ant-test',
        loggingService,
      );
      expect(registry.registerInstance).toHaveBeenCalledWith(
        asProviderInstanceId('anthropic-primary'),
        'anthropic',
        { provider: 'anthropic-fake' },
      );
    });

    it('registers a google instance via createGoogleProvider with unwrapped apiKey', () => {
      const bootstrap = createBootstrap(
        {
          'google-primary': providerRow({
            type: 'google',
            apiKeyRef: asEnvRef('GOOGLE_API_KEY_TEST'),
          }),
        },
        {
          'google-primary': runtimeRow({
            type: 'google',
            apiKeyRef: 'GOOGLE_API_KEY_TEST',
            apiKey: 'gk-test',
          }),
        },
      );

      bootstrap.onApplicationBootstrap();

      expect(mockCreateGoogleProvider).toHaveBeenCalledWith(
        'gk-test',
        loggingService,
      );
      expect(registry.registerInstance).toHaveBeenCalledWith(
        asProviderInstanceId('google-primary'),
        'google',
        { provider: 'google-fake' },
      );
    });

    it('registers multiple instances of different types in one bootstrap pass', () => {
      const bootstrap = createBootstrap(
        {
          'anthropic-primary': providerRow(),
          'openai-main': providerRow({
            type: 'openai',
            apiKeyRef: asEnvRef('OPENAI_API_KEY_TEST'),
            baseUrlRef: asEnvRef('OPENAI_BASE_URL_TEST'),
          }),
        },
        {
          'anthropic-primary': runtimeRow(),
          'openai-main': runtimeRow({
            type: 'openai',
            apiKeyRef: 'OPENAI_API_KEY_TEST',
            apiKey: '',
            baseUrlRef: 'OPENAI_BASE_URL_TEST',
            baseUrl: 'https://api.openai.com/v1',
          }),
        },
      );

      bootstrap.onApplicationBootstrap();

      expect(registry.registerInstance).toHaveBeenCalledTimes(2);
      expect(registry.registerInstance).toHaveBeenCalledWith(
        asProviderInstanceId('anthropic-primary'),
        'anthropic',
        expect.anything(),
      );
      expect(registry.registerInstance).toHaveBeenCalledWith(
        asProviderInstanceId('openai-main'),
        'openai',
        expect.anything(),
      );
    });
  });

  describe('buildFactoryContext by provider type', () => {
    it('passes only base context fields (no baseUrl/apiSurface) for non-OpenAI types', () => {
      const bootstrap = createBootstrap(
        { 'anthropic-primary': providerRow() },
        { 'anthropic-primary': runtimeRow() },
      );

      bootstrap.onApplicationBootstrap();

      // adaptApiKeyProviderFactory only forwards apiKey + logger, so the
      // full context is not observable here — asserted instead via the
      // openai/openai-compatible cases below, which receive the raw context.
      expect(mockCreateAnthropicProvider).toHaveBeenCalledWith(
        'sk-ant-test',
        loggingService,
      );
    });

    it('includes baseUrlRef/baseUrl but not apiSurface for type "openai"', () => {
      const bootstrap = createBootstrap(
        {
          'openai-main': providerRow({
            type: 'openai',
            apiKeyRef: asEnvRef('OPENAI_API_KEY_TEST'),
            baseUrlRef: asEnvRef('OPENAI_BASE_URL_TEST'),
          }),
        },
        {
          'openai-main': runtimeRow({
            type: 'openai',
            apiKeyRef: 'OPENAI_API_KEY_TEST',
            apiKey: 'sk-oa-test',
            baseUrlRef: 'OPENAI_BASE_URL_TEST',
            baseUrl: 'https://api.openai.com/v1',
          }),
        },
      );

      bootstrap.onApplicationBootstrap();

      expect(mockCreateOpenAiProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          instanceId: 'openai-main',
          type: 'openai',
          apiKeyRef: asEnvRef('OPENAI_API_KEY_TEST'),
          apiKey: 'sk-oa-test',
          baseUrlRef: asEnvRef('OPENAI_BASE_URL_TEST'),
          baseUrl: 'https://api.openai.com/v1',
        }),
        loggingService,
      );
      expect(mockCreateOpenAiProvider.mock.calls[0][0]).not.toHaveProperty(
        'apiSurface',
      );
    });

    it('includes apiSurface for type "openai-compatible"', () => {
      const bootstrap = createBootstrap(
        {
          'ollama-main': providerRow({
            type: 'openai-compatible',
            apiKeyRef: asEnvRef('OLLAMA_API_KEY_TEST'),
            baseUrlRef: asEnvRef('OLLAMA_BASE_URL_TEST'),
          }),
        },
        {
          'ollama-main': runtimeRow({
            type: 'openai-compatible',
            apiKeyRef: 'OLLAMA_API_KEY_TEST',
            apiKey: '',
            baseUrlRef: 'OLLAMA_BASE_URL_TEST',
            baseUrl: 'http://localhost:11434/v1',
            apiSurface: 'chat-completions',
          }),
        },
      );

      bootstrap.onApplicationBootstrap();

      expect(mockCreateOpenAiCompatibleProviderInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          instanceId: 'ollama-main',
          type: 'openai-compatible',
          baseUrl: 'http://localhost:11434/v1',
          apiSurface: 'chat-completions',
        }),
        loggingService,
      );
    });

    it('trims whitespace from runtime apiKey before passing it to the factory', () => {
      const bootstrap = createBootstrap(
        { 'anthropic-primary': providerRow() },
        {
          'anthropic-primary': runtimeRow({ apiKey: '  sk-ant-padded  ' }),
        },
      );

      bootstrap.onApplicationBootstrap();

      expect(mockCreateAnthropicProvider).toHaveBeenCalledWith(
        'sk-ant-padded',
        loggingService,
      );
    });
  });

  describe('disabled providers', () => {
    it('skips a disabled provider entirely, without looking up runtime or calling any factory', () => {
      const bootstrap = createBootstrap(
        { 'anthropic-primary': providerRow({ enabled: false }) },
        {}, // no runtime entry at all — must not be required for a disabled row
      );

      expect(() => bootstrap.onApplicationBootstrap()).not.toThrow();
      expect(mockCreateAnthropicProvider).not.toHaveBeenCalled();
      expect(registry.registerInstance).not.toHaveBeenCalled();
    });

    it('still registers other enabled providers when one is disabled', () => {
      const bootstrap = createBootstrap(
        {
          'anthropic-disabled': providerRow({ enabled: false }),
          'anthropic-primary': providerRow(),
        },
        { 'anthropic-primary': runtimeRow() },
      );

      bootstrap.onApplicationBootstrap();

      expect(registry.registerInstance).toHaveBeenCalledTimes(1);
      expect(registry.registerInstance).toHaveBeenCalledWith(
        asProviderInstanceId('anthropic-primary'),
        'anthropic',
        expect.anything(),
      );
    });
  });

  describe('error paths', () => {
    it('throws when an enabled provider has no matching runtime config', () => {
      const bootstrap = createBootstrap(
        { 'anthropic-primary': providerRow() },
        {},
      );

      expect(() => bootstrap.onApplicationBootstrap()).toThrow(
        /Missing runtime config for instance anthropic-primary/,
      );
      expect(registry.registerInstance).not.toHaveBeenCalled();
    });

    it('throws when API key is required for the provider type but missing', () => {
      const bootstrap = createBootstrap(
        { 'anthropic-primary': providerRow() },
        { 'anthropic-primary': runtimeRow({ apiKey: '' }) },
      );

      expect(() => bootstrap.onApplicationBootstrap()).toThrow(
        /Missing API key for instance anthropic-primary/,
      );
      expect(mockCreateAnthropicProvider).not.toHaveBeenCalled();
    });

    it('throws when API key is only whitespace', () => {
      const bootstrap = createBootstrap(
        { 'anthropic-primary': providerRow() },
        { 'anthropic-primary': runtimeRow({ apiKey: '   ' }) },
      );

      expect(() => bootstrap.onApplicationBootstrap()).toThrow(
        /Missing API key for instance anthropic-primary/,
      );
    });

    it('does not require an API key for provider types where it is optional (openai)', () => {
      const bootstrap = createBootstrap(
        {
          'openai-main': providerRow({
            type: 'openai',
            apiKeyRef: asEnvRef('OPENAI_API_KEY_TEST'),
            baseUrlRef: asEnvRef('OPENAI_BASE_URL_TEST'),
          }),
        },
        {
          'openai-main': runtimeRow({
            type: 'openai',
            apiKeyRef: 'OPENAI_API_KEY_TEST',
            apiKey: '',
            baseUrlRef: 'OPENAI_BASE_URL_TEST',
            baseUrl: 'https://api.openai.com/v1',
          }),
        },
      );

      expect(() => bootstrap.onApplicationBootstrap()).not.toThrow();
      expect(mockCreateOpenAiProvider).toHaveBeenCalled();
      expect(registry.registerInstance).toHaveBeenCalledWith(
        asProviderInstanceId('openai-main'),
        'openai',
        expect.anything(),
      );
    });

    it('throws when the provider type has no registered factory', () => {
      const bootstrap = createBootstrap(
        {
          'weird-primary': providerRow({
            type: 'unsupported-type' as unknown as GatewayProviderType,
          }),
        },
        {
          'weird-primary': runtimeRow({
            type: 'unsupported-type' as unknown as GatewayProviderType,
          }),
        },
      );

      expect(() => bootstrap.onApplicationBootstrap()).toThrow(
        /Unsupported provider type: unsupported-type/,
      );
      expect(registry.registerInstance).not.toHaveBeenCalled();
    });

    it('stops registering remaining instances once an earlier one throws', () => {
      const bootstrap = createBootstrap(
        {
          'anthropic-broken': providerRow(),
          'anthropic-primary': providerRow(),
        },
        {
          // 'anthropic-broken' has no runtime entry -> throws before reaching
          // 'anthropic-primary' (Object.entries iteration order is insertion order)
          'anthropic-primary': runtimeRow(),
        },
      );

      expect(() => bootstrap.onApplicationBootstrap()).toThrow(
        /Missing runtime config for instance anthropic-broken/,
      );
      expect(registry.registerInstance).not.toHaveBeenCalled();
    });
  });
});
