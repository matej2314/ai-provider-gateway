import type OpenAI from 'openai';
import type { ProviderToolCall } from '../../../providers/interfaces/ai-provider.interface';
import { asToolCallId } from '../../../common/types/branded.types';

export type OpenAiStreamToolCallAccumulator = Map<
  number,
  { id?: string; name: string; arguments: string }
>;

export function extractOpenAiStreamDeltaText(
  chunk: OpenAI.Chat.Completions.ChatCompletionChunk,
): string {
  return chunk.choices[0]?.delta?.content ?? '';
}

export function accumulateOpenAiStreamToolCallDeltas(
  chunk: OpenAI.Chat.Completions.ChatCompletionChunk,
  accumulator: OpenAiStreamToolCallAccumulator,
): void {
  const deltas = chunk.choices[0]?.delta?.tool_calls;
  if (!deltas?.length) return;

  for (const delta of deltas) {
    const existing = accumulator.get(delta.index) ?? {
      name: '',
      arguments: '',
    };
    accumulator.set(delta.index, {
      id: delta.id ?? existing.id,
      name: delta.function?.name ?? existing.name,
      arguments: existing.arguments + (delta.function?.arguments ?? ''),
    });
  }
}

export function finalizeOpenAiStreamToolCalls(
  accumulator: OpenAiStreamToolCallAccumulator,
): ProviderToolCall[] {
  return [...accumulator.values()]
    .filter((call) => call.id && call.name)
    .map((call) => ({
      id: asToolCallId(call.id!),
      name: call.name,
      arguments: call.arguments || '{}',
    }));
}
