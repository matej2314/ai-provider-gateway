import { parseCachedChatResponse } from './cached-chat-response.schema';
import {
  TEST_CACHED_REQUEST_ID,
  TEST_CACHED_RESPONSE_ID,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_PROVIDER_INSTANCE_BRANDED,
} from '../../common/mocks/test-constants';

describe('parseCachedChatResponse', () => {
  const stored = {
    id: TEST_CACHED_RESPONSE_ID,
    provider: TEST_PROVIDER_INSTANCE_BRANDED,
    model: TEST_MODEL_ALIAS_BRANDED,
    output: { type: 'text' as const, text: 'Hello' },
    requestId: TEST_CACHED_REQUEST_ID,
    cached: true as const,
    cachedAt: '2026-01-01T00:00:00.000Z',
  };

  it('does not persist cacheSource from a stored payload', () => {
    const parsed = parseCachedChatResponse({
      ...stored,
      cacheSource: 'semantic',
    });

    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty('cacheSource');
    expect(parsed).toMatchObject(stored);
  });
});
