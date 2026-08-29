import { parseCachedChatResponse } from './cached-chat-response.schema';
import {
  TEST_CACHED_RESPONSE_ID,
  TEST_FALLBACK_MODEL_ALIAS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_PROVIDER_INSTANCE_BRANDED,
} from '../../common/mocks/test-constants';

describe('parseCachedChatResponse', () => {
  const stored = {
    id: TEST_CACHED_RESPONSE_ID,
    provider: TEST_PROVIDER_INSTANCE_BRANDED,
    model: TEST_MODEL_ALIAS_BRANDED,
    output: { type: 'text' as const, text: 'Hello' },
    cached: true as const,
    cachedAt: '2026-01-01T00:00:00.000Z',
    finishReason: 'stop' as const,
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

  it('does not persist requestId from a stored payload', () => {
    const parsed = parseCachedChatResponse({
      ...stored,
      requestId: 'req_stale',
    });

    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty('requestId');
  });

  it('returns null for a legacy payload without finishReason', () => {
    const legacy: Record<string, unknown> = { ...stored };
    delete legacy.finishReason;
    expect(parseCachedChatResponse(legacy)).toBeNull();
  });

  it('accepts thinkingContent and effectiveModelAlias', () => {
    const parsed = parseCachedChatResponse({
      ...stored,
      thinkingContent: 'step',
      effectiveModelAlias: TEST_FALLBACK_MODEL_ALIAS,
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.thinkingContent).toBe('step');
    expect(parsed?.effectiveModelAlias).toBe(TEST_FALLBACK_MODEL_ALIAS);
  });
});
