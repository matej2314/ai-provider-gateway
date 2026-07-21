import { createTestGatewayConfig } from '../../common/mocks/createTestGatewayConfig';
import {
  asEnvRef,
  asModelAlias,
  asModelId,
  asProviderInstanceId,
} from '../../common/types';
import {
  isLastModelForEnabledProvider,
  isLastModelInConfig,
  countActiveModelsAfterProviderChange,
} from './effective-config-preview.util';

describe('effective-config-preview.util', () => {
  describe('isLastModelForEnabledProvider', () => {
    it('returns true when alias is the only model for an enabled provider', () => {
      const config = createTestGatewayConfig({
        replace: { providers: true, models: true },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: asEnvRef('ANTHROPIC_API_KEY'),
            enabled: true,
          },
          'google-primary': {
            type: 'google',
            apiKeyRef: asEnvRef('GOOGLE_API_KEY'),
            enabled: true,
          },
        },
        models: {
          'anthropic-model': {
            providerInstance: asProviderInstanceId('anthropic-primary'),
            modelId: asModelId('claude-sonnet-4-5'),
            capabilities: { streaming: true, tools: true },
          },
          'google-model': {
            providerInstance: asProviderInstanceId('google-primary'),
            modelId: asModelId('gemini-pro'),
            capabilities: { streaming: true, tools: true },
          },
        },
      });

      expect(
        isLastModelForEnabledProvider(config, asModelAlias('anthropic-model')),
      ).toBe(true);
      expect(
        isLastModelForEnabledProvider(config, asModelAlias('google-model')),
      ).toBe(true);
    });

    it('returns false when provider has other models', () => {
      const config = createTestGatewayConfig({
        replace: { providers: true, models: true },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: asEnvRef('ANTHROPIC_API_KEY'),
            enabled: true,
          },
        },
        models: {
          'model-a': {
            providerInstance: asProviderInstanceId('anthropic-primary'),
            modelId: asModelId('claude-sonnet-4-5'),
            capabilities: { streaming: true, tools: true },
          },
          'model-b': {
            providerInstance: asProviderInstanceId('anthropic-primary'),
            modelId: asModelId('claude-haiku'),
            capabilities: { streaming: true, tools: true },
          },
        },
      });

      expect(
        isLastModelForEnabledProvider(config, asModelAlias('model-a')),
      ).toBe(false);
    });

    it('returns false when provider is disabled', () => {
      const config = createTestGatewayConfig({
        replace: { providers: true, models: true },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: asEnvRef('ANTHROPIC_API_KEY'),
            enabled: false,
          },
        },
        models: {
          'only-model': {
            providerInstance: asProviderInstanceId('anthropic-primary'),
            modelId: asModelId('claude-sonnet-4-5'),
            capabilities: { streaming: true, tools: true },
          },
        },
      });

      expect(
        isLastModelForEnabledProvider(config, asModelAlias('only-model')),
      ).toBe(false);
    });
  });

  describe('isLastModelInConfig', () => {
    it('returns true for the sole model alias', () => {
      const config = createTestGatewayConfig();
      expect(isLastModelInConfig(config, asModelAlias('test-model'))).toBe(
        true,
      );
    });
  });

  describe('countActiveModelsAfterProviderChange', () => {
    it('excludes models for disabled provider instances', () => {
      const config = createTestGatewayConfig({
        replace: { providers: true, models: true },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: asEnvRef('ANTHROPIC_API_KEY'),
            enabled: true,
          },
          'google-primary': {
            type: 'google',
            apiKeyRef: asEnvRef('GOOGLE_API_KEY'),
            enabled: true,
          },
        },
        models: {
          'anthropic-model': {
            providerInstance: asProviderInstanceId('anthropic-primary'),
            modelId: asModelId('claude-sonnet-4-5'),
            capabilities: { streaming: true, tools: true },
          },
          'google-model': {
            providerInstance: asProviderInstanceId('google-primary'),
            modelId: asModelId('gemini-pro'),
            capabilities: { streaming: true, tools: true },
          },
        },
      });

      expect(
        countActiveModelsAfterProviderChange(
          config,
          new Set([asProviderInstanceId('anthropic-primary')]),
        ),
      ).toBe(1);
    });
  });
});
