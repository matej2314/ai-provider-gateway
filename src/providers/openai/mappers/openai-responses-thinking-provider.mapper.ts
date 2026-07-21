import type OpenAI from 'openai';

export function extractResponsesReasoningSummaryText(
  output: OpenAI.Responses.Response['output'] | undefined,
): string | undefined {
  if (!output?.length) return undefined;

  const chunks = output
    .filter(
      (item): item is OpenAI.Responses.ResponseReasoningItem =>
        item.type === 'reasoning',
    )
    .flatMap((item) =>
      (item.summary ?? [])
        .filter((part) => part.type === 'summary_text')
        .map((part) => (part.type === 'summary_text' ? part.text : '')),
    )
    .filter(Boolean);

  const text = chunks.join('');
  return text || undefined;
}

export function accumulateResponsesReasoningDelta(
  event: OpenAI.Responses.ResponseStreamEvent,
  buffer: { text: string },
): void {
  if (event.type === 'response.reasoning_summary_text.delta') {
    buffer.text += event.delta;
  }
  if (event.type === 'response.reasoning_summary_text.done') {
    buffer.text = event.text;
  }
}
