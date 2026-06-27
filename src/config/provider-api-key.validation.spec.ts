import { createTestGatewayConfig } from '../common/mocks/createTestGatewayConfig';
import {
  collectMissingEnabledProviderApiKeyErrors,
  formatMissingProviderApiKeyError,
} from './provider-api-key.validation';

describe('provider-api-key.validation', () => {
  describe('collectMissingEnabledProviderApiKeyErrors', () => {
    it('returns empty when custom apiKeyRef is set in env', () => {
      const config = createTestGatewayConfig({
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_PRIMARY_API_KEY',
            enabled: true,
          },
        },
        models: {
          'chat-default': {
            providerInstance: 'anthropic-primary',
            modelId: 'claude-sonnet-4-5',
          },
        },
      });

      const env = { ANTHROPIC_PRIMARY_API_KEY: 'sk-ant-test' };

      expect(collectMissingEnabledProviderApiKeyErrors(config, env)).toEqual(
        [],
      );
    });

    it('reports missing key using apiKeyRef from YAML', () => {
      const config = createTestGatewayConfig({
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_PRIMARY_API_KEY',
            enabled: true,
          },
        },
      });

      expect(collectMissingEnabledProviderApiKeyErrors(config, {})).toEqual([
        {
          instanceId: 'anthropic-primary',
          apiKeyRef: 'ANTHROPIC_PRIMARY_API_KEY',
        },
      ]);
    });

    it('ignores disabled providers', () => {
      const config = createTestGatewayConfig({
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_PRIMARY_API_KEY',
            enabled: false,
          },
        },
      });

      expect(
        collectMissingEnabledProviderApiKeyErrors(config, {}),
      ).toEqual([]);
    });

    it('does not require legacy ANTHROPIC_API_KEY when custom ref is set', () => {
      const config = createTestGatewayConfig({
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_PRIMARY_API_KEY',
            enabled: true,
          },
        },
      });

      const env = { ANTHROPIC_API_KEY: 'sk-ant-legacy-only' };

      expect(collectMissingEnabledProviderApiKeyErrors(config, env)).toEqual([
        {
          instanceId: 'anthropic-primary',
          apiKeyRef: 'ANTHROPIC_PRIMARY_API_KEY',
        },
      ]);
    });
  });

  describe('formatMissingProviderApiKeyError', () => {
    it('includes instanceId and apiKeyRef in message', () => {
      expect(
        formatMissingProviderApiKeyError({
          instanceId: 'anthropic-primary',
          apiKeyRef: 'ANTHROPIC_PRIMARY_API_KEY',
        }),
      ).toContain('ANTHROPIC_PRIMARY_API_KEY');
    });
  });
});
