import {
  isOpenAiReasoningRequested,
  mapThinkingToChatCompletion,
  mapThinkingToResponsesReasoning,
  openAiNumericThinkingBudgetIgnored,
} from './openai-thinking-provider.mapper';

describe('isOpenAiReasoningRequested', () => {
  it.each([
    [{ thinkingEnabled: false, thinkingBudget: 2048 }, false],
    [{ thinkingEnabled: false, thinkingBudget: 'high' as const }, false],
    [{ thinkingEnabled: true }, true],
    [{ thinkingBudget: 'high' as const }, true],
    [{ thinkingBudget: 2048 }, false],
    [{ thinkingEnabled: true, thinkingBudget: 2048 }, true],
  ])('%j → %s', (options, expected) => {
    expect(isOpenAiReasoningRequested(options)).toBe(expected);
  });
});

describe('openAiNumericThinkingBudgetIgnored', () => {
  it('is true only for enabled numeric budget', () => {
    expect(
      openAiNumericThinkingBudgetIgnored({
        thinkingEnabled: true,
        thinkingBudget: 1024,
      }),
    ).toBe(true);
    expect(
      openAiNumericThinkingBudgetIgnored({
        thinkingEnabled: false,
        thinkingBudget: 1024,
      }),
    ).toBe(false);
  });
});

describe('mapThinkingToResponsesReasoning', () => {
  it.each([
    [
      'xhigh',
      { thinkingEnabled: true, thinkingBudget: 'xhigh' as const },
      'xhigh',
    ],
    [
      'minimal',
      { thinkingEnabled: true, thinkingBudget: 'minimal' as const },
      'minimal',
    ],
    [
      'none',
      { thinkingEnabled: true, thinkingBudget: 'none' as const },
      'none',
    ],
    [
      'max alias',
      { thinkingEnabled: true, thinkingBudget: 'max' as const },
      'xhigh',
    ],
    ['budget only', { thinkingBudget: 'high' as const }, 'high'],
    ['enabled only', { thinkingEnabled: true }, 'medium'],
  ])('%s', (_label, options, expected) => {
    expect(mapThinkingToResponsesReasoning(options)).toEqual({
      effort: expected,
      summary: 'auto',
    });
  });

  it('returns undefined when reasoning not requested', () => {
    expect(mapThinkingToResponsesReasoning({})).toBeUndefined();
  });

  it('returns undefined when thinking explicitly disabled', () => {
    expect(
      mapThinkingToResponsesReasoning({
        thinkingEnabled: false,
        thinkingBudget: 'high',
      }),
    ).toBeUndefined();
  });

  it('falls back to medium for numeric thinkingBudget', () => {
    expect(
      mapThinkingToResponsesReasoning({
        thinkingEnabled: true,
        thinkingBudget: 1024,
      }),
    ).toEqual({ effort: 'medium', summary: 'auto' });
  });
});

describe('mapThinkingToChatCompletion', () => {
  it('disables thinking by default', () => {
    expect(mapThinkingToChatCompletion()).toEqual({ type: 'disabled' });
  });

  it('enables thinking when requested', () => {
    expect(mapThinkingToChatCompletion({ thinkingEnabled: true })).toEqual({
      type: 'enabled',
    });
  });
});
