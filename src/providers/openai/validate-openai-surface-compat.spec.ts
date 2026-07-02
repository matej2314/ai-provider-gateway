import {
  formatOpenAiSurfaceCompatMessage,
  isOpenAiChatCompletionsIncompatible,
} from './validate-openai-surface-compat';

describe('validate-openai-surface-compat', () => {
  describe('isOpenAiChatCompletionsIncompatible', () => {
    it('returns true for responses-only model with forced chat-completions', () => {
      expect(isOpenAiChatCompletionsIncompatible('o3-mini', 'chat-completions')).toBe(
        true,
      );
    });

    it('returns false for responses-only model with auto surface', () => {
      expect(isOpenAiChatCompletionsIncompatible('o3-mini', 'auto')).toBe(false);
    });

    it('returns false for gpt-4o on chat-completions', () => {
      expect(isOpenAiChatCompletionsIncompatible('gpt-4o', 'chat-completions')).toBe(
        false,
      );
    });

    it('returns false when apiSurface is undefined', () => {
      expect(isOpenAiChatCompletionsIncompatible('o3-mini', undefined)).toBe(false);
    });
  });

  describe('formatOpenAiSurfaceCompatMessage', () => {
    it('includes model id and remediation hint', () => {
      expect(formatOpenAiSurfaceCompatMessage('o3-mini')).toMatch(/o3-mini/);
      expect(formatOpenAiSurfaceCompatMessage('o3-mini')).toMatch(/Responses API/);
    });
  });
});
