import { prefersMaxCompletionTokens } from './openai-api-surface.models';

describe('openai-api-surface-models', () => {
  it('prefersMaxCompletionTokens', () => {
    expect(prefersMaxCompletionTokens('o3-mini')).toBe(true);
  });
});
