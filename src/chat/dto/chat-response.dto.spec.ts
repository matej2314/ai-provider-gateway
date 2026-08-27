import {
  toChatResponseDto,
  toChatResponseDtoFromCache,
  type ChatResponseData,
} from './chat-response.dto';
import type { CachedChatResponse } from '../../cache/types/cached-chat-response.type';
import {
  TEST_CONVERSATION_ID,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_CACHED_REQUEST_ID,
  TEST_CACHED_RESPONSE_ID,
  TEST_REQUEST_ID,
  TEST_RESPONSE_ID_PREFIX,
} from '../../common/mocks/test-constants';
import {
  asConversationId,
  asModelAlias,
  asProviderInstanceId,
  asResponseId,
} from '../../common/types/branded.types';

describe('chat-response.dto mappers', () => {
  const cached: CachedChatResponse = {
    id: TEST_CACHED_RESPONSE_ID,
    provider: TEST_PROVIDER_INSTANCE_BRANDED,
    model: TEST_MODEL_ALIAS_BRANDED,
    output: { type: 'text', text: 'Cached answer' },
    requestId: TEST_CACHED_REQUEST_ID,
    cached: true,
    cachedAt: '2026-01-01T00:00:00.000Z',
  };

  it('sets cacheSource exact on exact cache hit mapping', () => {
    const dto = toChatResponseDtoFromCache(cached, TEST_CONVERSATION_ID, {
      cacheSource: 'exact',
    });

    expect(dto.cached).toBe(true);
    expect(dto.cachedAt).toBe(cached.cachedAt);
    expect(dto.cacheSource).toBe('exact');
    expect(dto.conversationId).toBe(TEST_CONVERSATION_ID);
  });

  it('sets cacheSource semantic on semantic cache hit mapping', () => {
    const dto = toChatResponseDtoFromCache(cached, TEST_CONVERSATION_ID, {
      cacheSource: 'semantic',
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
});
