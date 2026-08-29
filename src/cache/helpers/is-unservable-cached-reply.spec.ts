import { isUnservableCachedReply } from './is-unservable-cached-reply';
import type { CachedChatResponse } from '../types/cached-chat-response.type';
import {
  TEST_CACHED_RESPONSE_ID,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_PROVIDER_INSTANCE_BRANDED,
} from '../../common/mocks/test-constants';

describe('isUnservableCachedReply', () => {
  const parsed: CachedChatResponse = {
    id: TEST_CACHED_RESPONSE_ID,
    provider: TEST_PROVIDER_INSTANCE_BRANDED,
    model: TEST_MODEL_ALIAS_BRANDED,
    output: { type: 'text', text: 'Hello' },
    cached: true,
    cachedAt: '2026-01-01T00:00:00.000Z',
    finishReason: 'stop',
  };

  it('returns false for a complete stop reply', () => {
    expect(isUnservableCachedReply(parsed)).toBe(false);
  });

  it('returns true when finishReason is not stop', () => {
    expect(isUnservableCachedReply({ ...parsed, finishReason: 'length' })).toBe(
      true,
    );
    expect(
      isUnservableCachedReply({ ...parsed, finishReason: 'content_filter' }),
    ).toBe(true);
    expect(
      isUnservableCachedReply({ ...parsed, finishReason: 'tool_calls' }),
    ).toBe(true);
  });

  it('returns true when output text is empty or whitespace', () => {
    expect(
      isUnservableCachedReply({
        ...parsed,
        output: { type: 'text', text: '   ' },
      }),
    ).toBe(true);
    expect(
      isUnservableCachedReply({
        ...parsed,
        output: { type: 'text', text: '' },
      }),
    ).toBe(true);
  });
});
