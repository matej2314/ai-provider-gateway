import { createTestGatewayConfig } from '../../common/mocks/createTestGatewayConfig';
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
            apiKeyRef: 'ANTHROPIC_API_KEY',
            enabled: true,
          },
          'google-primary': {
            type: 'google',
            apiKeyRef: 'GOOGLE_API_KEY',
            enabled: true,
          },
        },
        models: {
          'anthropic-model': {
            providerInstance: 'anthropic-primary',
            modelId: 'claude-sonnet-4-5',
            capabilities: { streaming: true, tools: true },
          },
          'google-model': {
            providerInstance: 'google-primary',
            modelId: 'gemini-pro',
            capabilities: { streaming: true, tools: true },
          },
        },
      });

      expect(isLastModelForEnabledProvider(config, 'anthropic-model')).toBe(
        true,
      );
      expect(isLastModelForEnabledProvider(config, 'google-model')).toBe(true);
    });

    it('returns false when provider has other models', () => {
      const config = createTestGatewayConfig({
        replace: { providers: true, models: true },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
            enabled: true,
          },
        },
        models: {
          'model-a': {
            providerInstance: 'anthropic-primary',
            modelId: 'claude-sonnet-4-5',
            capabilities: { streaming: true, tools: true },
          },
          'model-b': {
            providerInstance: 'anthropic-primary',
            modelId: 'claude-haiku',
            capabilities: { streaming: true, tools: true },
          },
        },
      });

      expect(isLastModelForEnabledProvider(config, 'model-a')).toBe(false);
    });

    it('returns false when provider is disabled', () => {
      const config = createTestGatewayConfig({
        replace: { providers: true, models: true },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
            enabled: false,
          },
        },
        models: {
          'only-model': {
            providerInstance: 'anthropic-primary',
            modelId: 'claude-sonnet-4-5',
            capabilities: { streaming: true, tools: true },
          },
        },
      });

      expect(isLastModelForEnabledProvider(config, 'only-model')).toBe(false);
    });
  });

  describe('isLastModelInConfig', () => {
    it('returns true for the sole model alias', () => {
      const config = createTestGatewayConfig();
      expect(isLastModelInConfig(config, 'test-model')).toBe(true);
    });
  });

  describe('countActiveModelsAfterProviderChange', () => {
    it('excludes models for disabled provider instances', () => {
      const config = createTestGatewayConfig({
        replace: { providers: true, models: true },
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
            enabled: true,
          },
          'google-primary': {
            type: 'google',
            apiKeyRef: 'GOOGLE_API_KEY',
            enabled: true,
          },
        },
        models: {
          'anthropic-model': {
            providerInstance: 'anthropic-primary',
            modelId: 'claude-sonnet-4-5',
            capabilities: { streaming: true, tools: true },
          },
          'google-model': {
            providerInstance: 'google-primary',
            modelId: 'gemini-pro',
            capabilities: { streaming: true, tools: true },
          },
        },
      });

      expect(
        countActiveModelsAfterProviderChange(
          config,
          new Set(['anthropic-primary']),
        ),
      ).toBe(1);
    });
  });
});
