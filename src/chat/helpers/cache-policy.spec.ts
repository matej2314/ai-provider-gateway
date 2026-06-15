import { isCachedChatAllowedForModelAlias } from './cache-policy';
import type { GatewayConfig } from '../../config/configuration';

describe('isCachedChatAllowedForModelAlias', () => {
  it('should return true when provider enabled', () => {
    const config: GatewayConfig = {
      schemaVersion: 1,
      masterKeyRef: 'MASTER_KEY_TEST',
      clients: {},
      models: {
        'test-model': {
          modelId: 'claude-sonnet-4',
          providerInstance: 'anthropic-primary',
          capabilities: {},
          policy: {
            retry: {},
            params: {
              defaults: {},
              allowOverrides: [],
              bounds: {},
            },
          },
        },
      },
      providers: {
        'anthropic-primary': {
          type: 'anthropic',
          apiKeyRef: 'ANTHROPIC_API_KEY_TEST',
          enabled: true,
        },
      },
    };

    const result = isCachedChatAllowedForModelAlias(config, 'test-model');

    expect(result).toBe(true);
  });

  it('should return false when provider not enabled', () => {
    const config: GatewayConfig = {
      schemaVersion: 1,
      masterKeyRef: 'MASTER_KEY_TEST',
      clients: {},
      models: {
        'test-model': {
          modelId: 'claude-sonnet-4',
          providerInstance: 'anthropic-primary',
          capabilities: {},
          policy: {
            retry: {},
            params: {
              defaults: {},
              allowOverrides: [],
              bounds: {},
            },
          },
        },
      },
      providers: {
        'anthropic-primary': {
          type: 'anthropic',
          apiKeyRef: 'ANTHROPIC_API_KEY_TEST',
          enabled: false,
        },
      },
    };

    const result = isCachedChatAllowedForModelAlias(config, 'test-model');

    expect(result).toBe(false);
  });

  it('should return false when model alias not found', () => {
    const config: GatewayConfig = {
      schemaVersion: 1,
      masterKeyRef: 'MASTER_KEY_TEST',
      clients: {},
      models: {},
      providers: {},
    };

    const result = isCachedChatAllowedForModelAlias(config, 'nonexistent');

    expect(result).toBe(false);
  });

  it('should return false when provider instance not found', () => {
    const config: GatewayConfig = {
      schemaVersion: 1,
      masterKeyRef: 'MASTER_KEY_TEST',
      clients: {},
      models: {
        'test-model': {
          modelId: 'claude-sonnet-4',
          providerInstance: 'nonexistent-provider',
          capabilities: {},
          policy: {
            retry: {},
            params: {
              defaults: {},
              allowOverrides: [],
              bounds: {},
            },
          },
        },
      },
      providers: {},
    };

    const result = isCachedChatAllowedForModelAlias(config, 'test-model');

    expect(result).toBe(false);
  });

  it('should return false when gateway config undefined', () => {
    const result = isCachedChatAllowedForModelAlias(undefined, 'test-model');

    expect(result).toBe(false);
  });

  it('should return false when enabled is explicitly false', () => {
    const config: GatewayConfig = {
      schemaVersion: 1,
      masterKeyRef: 'MASTER_KEY_TEST',
      clients: {},
      models: {
        'sonne-4-model': {
          modelId: 'sonnet-4',
          providerInstance: 'openai-primary',
          capabilities: {},
          policy: {
            retry: {},
            params: {
              defaults: {},
              allowOverrides: [],
              bounds: {},
            },
          },
        },
      },
      providers: {
        'openai-primary': {
          type: 'anthropic',
          apiKeyRef: 'ANTHROPIC_API_KEY_TEST',
          enabled: false,
        },
      },
    };

    const result = isCachedChatAllowedForModelAlias(config, 'gpt-model');

    expect(result).toBe(false);
  });
});
