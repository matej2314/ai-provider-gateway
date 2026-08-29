import {
  isCachedChatAllowedForModelAlias,
  shouldStoreChatResponse,
} from './cache-policy';
import type { GatewayConfig } from '../../config/configuration';
import type { ChatResponseData } from '../dto/chat-response.dto';
import {
  asConversationId,
  asEnvRef,
  asProviderInstanceId,
  asRequestId,
  asResponseId,
} from '../../common/types/branded.types';
import {
  TEST_API_KEY_REF,
  TEST_CONVERSATION_ID,
  TEST_MASTER_KEY_REF,
  TEST_MODEL_ALIAS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_PROVIDER_INSTANCE,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_TOOL_CALL_ID,
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

describe('shouldStoreChatResponse', () => {
  const base: ChatResponseData = {
    id: asResponseId('gw_store'),
    provider: TEST_PROVIDER_INSTANCE_BRANDED,
    model: TEST_MODEL_ALIAS_BRANDED,
    output: { type: 'text', text: 'Hello' },
    requestId: asRequestId('req-store'),
    conversationId: asConversationId(TEST_CONVERSATION_ID),
    finishReason: 'stop',
  };

  it('returns true for a complete text reply', () => {
    expect(shouldStoreChatResponse(base)).toBe(true);
  });

  it('returns false when finishReason is length', () => {
    expect(shouldStoreChatResponse({ ...base, finishReason: 'length' })).toBe(
      false,
    );
  });

  it('returns false when finishReason is content_filter', () => {
    expect(
      shouldStoreChatResponse({ ...base, finishReason: 'content_filter' }),
    ).toBe(false);
  });

  it('returns false when finishReason is tool_calls', () => {
    expect(
      shouldStoreChatResponse({ ...base, finishReason: 'tool_calls' }),
    ).toBe(false);
  });

  it('returns false when finishReason is missing', () => {
    expect(shouldStoreChatResponse({ ...base, finishReason: undefined })).toBe(
      false,
    );
  });

  it('returns false when output text is empty or whitespace', () => {
    expect(
      shouldStoreChatResponse({
        ...base,
        output: { type: 'text', text: '' },
      }),
    ).toBe(false);
    expect(
      shouldStoreChatResponse({
        ...base,
        output: { type: 'text', text: '   ' },
      }),
    ).toBe(false);
  });

  it('returns false when the reply contains toolCalls', () => {
    expect(
      shouldStoreChatResponse({
        ...base,
        toolCalls: [{ id: TEST_TOOL_CALL_ID, name: 'search', arguments: '{}' }],
      }),
    ).toBe(false);
  });
});
