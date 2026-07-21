import { isCachedChatAllowedForModelAlias } from './cache-policy';
import type { GatewayConfig } from '../../config/configuration';
import {
  asEnvRef,
  asProviderInstanceId,
} from '../../common/types/branded.types';
import {
  TEST_API_KEY_REF,
  TEST_MASTER_KEY_REF,
  TEST_MODEL_ALIAS,
  TEST_PROVIDER_INSTANCE,
} from '../../common/mocks/test-constants';

describe('isCachedChatAllowedForModelAlias', () => {
  it('should return true when provider enabled', () => {
    const config: GatewayConfig = {
      schemaVersion: 1,
      masterKeyRef: asEnvRef(TEST_MASTER_KEY_REF),
      clients: {},
      models: {
        [TEST_MODEL_ALIAS]: {
          modelId: 'claude-sonnet-4',
          providerInstance: asProviderInstanceId(TEST_PROVIDER_INSTANCE),
          capabilities: {},
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
      providers: {
        [TEST_PROVIDER_INSTANCE]: {
          type: 'anthropic',
          apiKeyRef: asEnvRef(TEST_API_KEY_REF),
          enabled: true,
          baseUrlRef: undefined,
        },
      },
    };

    const result = isCachedChatAllowedForModelAlias(config, TEST_MODEL_ALIAS);

    expect(result).toBe(true);
  });

  it('should return false when provider not enabled', () => {
    const config: GatewayConfig = {
      schemaVersion: 1,
      masterKeyRef: asEnvRef(TEST_MASTER_KEY_REF),
      clients: {},
      models: {
        [TEST_MODEL_ALIAS]: {
          modelId: 'claude-sonnet-4',
          providerInstance: asProviderInstanceId(TEST_PROVIDER_INSTANCE),
          capabilities: {},
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
      providers: {
        [TEST_PROVIDER_INSTANCE]: {
          type: 'anthropic',
          apiKeyRef: asEnvRef(TEST_API_KEY_REF),
          enabled: false,
          baseUrlRef: undefined,
        },
      },
    };

    const result = isCachedChatAllowedForModelAlias(config, TEST_MODEL_ALIAS);

    expect(result).toBe(false);
  });

  it('should return false when model alias not found', () => {
    const config: GatewayConfig = {
      schemaVersion: 1,
      masterKeyRef: asEnvRef(TEST_MASTER_KEY_REF),
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
      masterKeyRef: asEnvRef(TEST_MASTER_KEY_REF),
      clients: {},
      models: {
        [TEST_MODEL_ALIAS]: {
          modelId: 'claude-sonnet-4',
          providerInstance: asProviderInstanceId('nonexistent-provider'),
          capabilities: {},
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
      providers: {},
    };

    const result = isCachedChatAllowedForModelAlias(config, TEST_MODEL_ALIAS);

    expect(result).toBe(false);
  });

  it('should return false when gateway config undefined', () => {
    const result = isCachedChatAllowedForModelAlias(
      undefined,
      TEST_MODEL_ALIAS,
    );

    expect(result).toBe(false);
  });

  it('should return false when enabled is explicitly false', () => {
    const config: GatewayConfig = {
      schemaVersion: 1,
      masterKeyRef: asEnvRef(TEST_MASTER_KEY_REF),
      clients: {},
      models: {
        'sonne-4-model': {
          modelId: 'sonnet-4',
          providerInstance: asProviderInstanceId('openai-primary'),
          capabilities: {},
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
      providers: {
        'openai-primary': {
          type: 'anthropic',
          apiKeyRef: asEnvRef(TEST_API_KEY_REF),
          enabled: false,
          baseUrlRef: undefined,
        },
      },
    };

    const result = isCachedChatAllowedForModelAlias(config, 'gpt-model');

    expect(result).toBe(false);
  });
});
