import {
  toChatResponseDto,
  toChatResponseDtoFromCache,
  type ChatResponseData,
} from './chat-response.dto';
import type { CachedChatResponse } from '../../cache/types/cached-chat-response.type';
import {
  TEST_CONVERSATION_ID,
  TEST_FALLBACK_MODEL_ALIAS,
  TEST_INPUT_TOKENS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_OUTPUT_TOKENS_SMALL,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_CACHED_RESPONSE_ID,
  TEST_PROMPT_CACHE_HIT_TOKENS,
  TEST_REQUEST_ID,
  TEST_RESPONSE_ID_PREFIX,
} from '../../common/mocks/test-constants';
import {
  asConversationId,
  asModelAlias,
  asProviderInstanceId,
  asResponseId,
  asSystemFingerprint,
} from '../../common/types/branded.types';

describe('chat-response.dto mappers', () => {
  const cached: CachedChatResponse = {
    id: TEST_CACHED_RESPONSE_ID,
    provider: TEST_PROVIDER_INSTANCE_BRANDED,
    model: TEST_MODEL_ALIAS_BRANDED,
    output: { type: 'text', text: 'Cached answer' },
    cached: true,
    cachedAt: '2026-01-01T00:00:00.000Z',
    finishReason: 'stop',
  };

  it('sets cacheSource exact on exact cache hit mapping', () => {
    const dto = toChatResponseDtoFromCache(cached, TEST_CONVERSATION_ID, {
      cacheSource: 'exact',
      requestId: TEST_REQUEST_ID,
    });

    expect(dto.cached).toBe(true);
    expect(dto.cachedAt).toBe(cached.cachedAt);
    expect(dto.cacheSource).toBe('exact');
    expect(dto.conversationId).toBe(TEST_CONVERSATION_ID);
    expect(dto.finishReason).toBe('stop');
    expect(dto.requestId).toBe(TEST_REQUEST_ID);
    expect(dto.id).toBe(cached.id);
  });

  it('sets cacheSource semantic on semantic cache hit mapping', () => {
    const dto = toChatResponseDtoFromCache(cached, TEST_CONVERSATION_ID, {
      cacheSource: 'semantic',
      requestId: TEST_REQUEST_ID,
    });

    expect(dto.cached).toBe(true);
    expect(dto.cacheSource).toBe('semantic');
  });

  it('omits cached, cachedAt and cacheSource on live provider mapping', () => {
    const live: ChatResponseData = {
      id: asResponseId(TEST_RESPONSE_ID_PREFIX),
      provider: asProviderInstanceId(TEST_PROVIDER_INSTANCE_BRANDED),
      model: asModelAlias(TEST_MODEL_ALIAS_BRANDED),
      output: { type: 'text', text: 'Live answer' },
      requestId: TEST_REQUEST_ID,
      conversationId: asConversationId(TEST_CONVERSATION_ID),
    };

    const dto = toChatResponseDto(live);

    expect(dto).not.toHaveProperty('cached');
    expect(dto).not.toHaveProperty('cachedAt');
    expect(dto).not.toHaveProperty('cacheSource');
  });

  it('maps thinkingContent, usage totalTokens and native-parity fields from cache', () => {
    const withExtras: CachedChatResponse = {
      ...cached,
      thinkingContent: 'step',
      effectiveModelAlias: TEST_FALLBACK_MODEL_ALIAS,
      usage: {
        inputTokens: TEST_INPUT_TOKENS,
        outputTokens: TEST_OUTPUT_TOKENS_SMALL,
      },
      usageDetails: { promptCacheHitTokens: TEST_PROMPT_CACHE_HIT_TOKENS },
      systemFingerprint: asSystemFingerprint('fp_cached'),
    };

    const dto = toChatResponseDtoFromCache(withExtras, TEST_CONVERSATION_ID, {
      cacheSource: 'exact',
      requestId: TEST_REQUEST_ID,
    });

    expect(dto.thinkingContent).toBe('step');
    expect(dto.effectiveModelAlias).toBe(TEST_FALLBACK_MODEL_ALIAS);
    expect(dto.usage).toEqual({
      inputTokens: TEST_INPUT_TOKENS,
      outputTokens: TEST_OUTPUT_TOKENS_SMALL,
      totalTokens: TEST_INPUT_TOKENS + TEST_OUTPUT_TOKENS_SMALL,
    });
    expect(dto.usageDetails).toEqual({
      promptCacheHitTokens: TEST_PROMPT_CACHE_HIT_TOKENS,
    });
    expect(dto.systemFingerprint).toBe('fp_cached');
    expect(dto.cached).toBe(true);
  });
});
