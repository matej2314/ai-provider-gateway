import {
  accumulateResponsesReasoningDelta,
  extractResponsesReasoningSummaryText,
} from './openai-responses-thinking-provider.mapper';

describe('openai-responses-thinking-provider.mapper', () => {
  describe('extractResponsesReasoningSummaryText', () => {
    it('extracts summary_text from reasoning items', () => {
      expect(
        extractResponsesReasoningSummaryText([
          {
            type: 'reasoning',
            id: 'rs_1',
            summary: [
              { type: 'summary_text', text: 'Step one. ' },
              { type: 'summary_text', text: 'Step two.' },
            ],
          },
        ] as never),
      ).toBe('Step one. Step two.');
    });

    it('returns undefined when no reasoning items', () => {
      expect(extractResponsesReasoningSummaryText([])).toBeUndefined();
    });
  });

  describe('accumulateResponsesReasoningDelta', () => {
    it('accumulates delta events', () => {
      const buffer = { text: '' };

      accumulateResponsesReasoningDelta(
        {
          type: 'response.reasoning_summary_text.delta',
          delta: 'Hello ',
        } as never,
        buffer,
      );
      accumulateResponsesReasoningDelta(
        {
          type: 'response.reasoning_summary_text.delta',
          delta: 'world',
        } as never,
        buffer,
      );

      expect(buffer.text).toBe('Hello world');
    });

    it('replaces buffer on done event', () => {
      const buffer = { text: 'partial' };

      accumulateResponsesReasoningDelta(
        {
          type: 'response.reasoning_summary_text.done',
          text: 'Final summary',
        } as never,
        buffer,
      );

      expect(buffer.text).toBe('Final summary');
    });
  });
});
