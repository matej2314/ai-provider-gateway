import {
  assertOpenAiProviderType,
  isOpenAiProviderType,
} from './provider-types';

describe('provider-types (OpenAI)', () => {
  it('isOpenAiProviderType', () => {
    expect(isOpenAiProviderType('openai')).toBe(true);
    expect(isOpenAiProviderType('openai-compatible')).toBe(true);
    expect(isOpenAiProviderType('anthropic')).toBe(false);
  });

  it('assertOpenAiProviderType throws for non-OpenAI types', () => {
    expect(() => assertOpenAiProviderType('anthropic')).toThrow(
      /Unsupported provider type/,
    );
  });

  it('assertOpenAiProviderType passes for OpenAI types', () => {
    expect(() => assertOpenAiProviderType('openai')).not.toThrow();
    expect(() => assertOpenAiProviderType('openai-compatible')).not.toThrow();
  });
});
