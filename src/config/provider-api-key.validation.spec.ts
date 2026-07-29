import { createTestGatewayConfig } from '../common/mocks/createTestGatewayConfig';
import {
  collectMissingEnabledProviderApiKeyErrors,
  formatMissingProviderApiKeyError,
  isApiKeyRequiredForProviderType,
} from './provider-api-key.validation';
import { asEnvRef, asProviderInstanceId } from '../common/types/branded.types';

describe('provider-api-key.validation', () => {
  describe('collectMissingEnabledProviderApiKeyErrors', () => {
    it('returns empty when custom apiKeyRef is set in env', () => {
      const config = createTestGatewayConfig({
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: asEnvRef('ANTHROPIC_PRIMARY_API_KEY'),
            enabled: true,
          },
        },
        models: {
          'chat-default': {
            providerInstance: asProviderInstanceId('anthropic-primary'),
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
            apiKeyRef: asEnvRef('ANTHROPIC_PRIMARY_API_KEY'),
            enabled: true,
          },
        },
      });

      expect(collectMissingEnabledProviderApiKeyErrors(config, {})).toEqual([
        {
          instanceId: asProviderInstanceId('anthropic-primary'),
          apiKeyRef: asEnvRef('ANTHROPIC_PRIMARY_API_KEY'),
        },
      ]);
    });

    it('ignores disabled providers', () => {
      const config = createTestGatewayConfig({
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: asEnvRef('ANTHROPIC_PRIMARY_API_KEY'),
            enabled: false,
          },
        },
      });

      expect(collectMissingEnabledProviderApiKeyErrors(config, {})).toEqual([]);
    });

    it('does not accept a key under a different env name than apiKeyRef', () => {
      const config = createTestGatewayConfig({
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: asEnvRef('ANTHROPIC_PRIMARY_API_KEY'),
            enabled: true,
          },
        },
      });

      const env = { ANTHROPIC_API_KEY: 'sk-ant-other-name-only' };

      expect(collectMissingEnabledProviderApiKeyErrors(config, env)).toEqual([
        {
          instanceId: asProviderInstanceId('anthropic-primary'),
          apiKeyRef: asEnvRef('ANTHROPIC_PRIMARY_API_KEY'),
        },
      ]);
    });
  });

  describe('formatMissingProviderApiKeyError', () => {
    it('includes instanceId and apiKeyRef in message', () => {
      expect(
        formatMissingProviderApiKeyError({
          instanceId: asProviderInstanceId('anthropic-primary'),
          apiKeyRef: asEnvRef('ANTHROPIC_PRIMARY_API_KEY'),
        }),
      ).toContain('ANTHROPIC_PRIMARY_API_KEY');
    });
  });
});

describe('isApiKeyRequiredForProviderType', () => {
  it('requires key for anthropic and google only', () => {
    expect(isApiKeyRequiredForProviderType('anthropic')).toBe(true);
    expect(isApiKeyRequiredForProviderType('google')).toBe(true);
    expect(isApiKeyRequiredForProviderType('openai')).toBe(false);
    expect(isApiKeyRequiredForProviderType('openai-compatible')).toBe(false);
  });
});

describe('openai types with empty api key', () => {
  it('does not report missing key for enabled openai provider', () => {
    const config = createTestGatewayConfig({
      providers: {
        'anthropic-primary': { enabled: false },
        'openai-primary': {
          type: 'openai',
          apiKeyRef: asEnvRef('OPENAI_API_KEY'),
          baseUrlRef: asEnvRef('OPENAI_BASE_URL'),
          enabled: true,
        },
      },
    });
    expect(collectMissingEnabledProviderApiKeyErrors(config, {})).toEqual([]);
  });
});
