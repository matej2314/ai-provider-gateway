import { toCachedChatResponse } from './to-cached-chat-response';
import type { ChatResponseData } from '../dto/chat-response.dto';
import {
  TEST_CACHED_CONVERSATION_ID,
  TEST_CACHED_REQUEST_ID,
  TEST_CACHED_RESPONSE_ID,
  TEST_FALLBACK_MODEL_ALIAS,
  TEST_INPUT_TOKENS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_OUTPUT_TOKENS_SMALL,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_TOOL_CALL_ID_CACHED,
} from '../../common/mocks/test-constants';

describe('toCachedChatResponse', () => {
  const response: ChatResponseData = {
    id: TEST_CACHED_RESPONSE_ID,
    provider: TEST_PROVIDER_INSTANCE_BRANDED,
    model: TEST_MODEL_ALIAS_BRANDED,
    output: { type: 'text', text: 'Hello!' },
    usage: {
      inputTokens: TEST_INPUT_TOKENS,
      outputTokens: TEST_OUTPUT_TOKENS_SMALL,
    },
    requestId: TEST_CACHED_REQUEST_ID,
    conversationId: TEST_CACHED_CONVERSATION_ID,
    finishReason: 'stop',
  };

  it('sets cached flag and cachedAt and omits request-path fields', () => {
    const parsed = toCachedChatResponse(response);

    expect(parsed.cached).toBe(true);
    expect(parsed.cachedAt).toBeDefined();
    expect(parsed).not.toHaveProperty('cacheSource');
    expect(parsed).not.toHaveProperty('requestId');
    expect(new Date(parsed.cachedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('keeps cacheable fields and drops conversationId and toolCalls', () => {
    const fullResponse: ChatResponseData = {
      ...response,
      conversationId: TEST_CACHED_CONVERSATION_ID,
      toolCalls: [
        {
          id: TEST_TOOL_CALL_ID_CACHED,
          name: 'search',
          arguments: '{}',
        },
      ],
      finishReason: 'stop',
      effectiveModelAlias: TEST_FALLBACK_MODEL_ALIAS,
    };

    const parsed = toCachedChatResponse(fullResponse);

    expect(parsed).toEqual({
      id: fullResponse.id,
      provider: fullResponse.provider,
      model: fullResponse.model,
      output: fullResponse.output,
      usage: fullResponse.usage,
      finishReason: 'stop',
      effectiveModelAlias: TEST_FALLBACK_MODEL_ALIAS,
      cached: true,
      cachedAt: expect.any(String),
    });
    expect(parsed).not.toHaveProperty('conversationId');
    expect(parsed).not.toHaveProperty('toolCalls');
  });

  it('persists thinkingContent', () => {
    const parsed = toCachedChatResponse({
      ...response,
      thinkingContent: 'step',
    });

    expect(parsed.thinkingContent).toBe('step');
    expect(parsed.finishReason).toBe('stop');
  });
});
