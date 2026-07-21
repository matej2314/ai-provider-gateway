import type OpenAI from 'openai';
import type { ProviderToolCall } from 'src/providers/interfaces/ai-provider.interface';
import { asToolCallId } from '../../../common/types/branded.types';

export function registerResponsesFunctionCallItemId(
  item: OpenAI.Responses.ResponseOutputItem,
  registry: Map<string, string>,
): void {
  if (item.type !== 'function_call') return;
  if (item.id && item.call_id) {
    registry.set(item.id, item.call_id);
  }
}

export function extractResponsesStreamToolCallDone(
  event: OpenAI.Responses.ResponseFunctionCallArgumentsDoneEvent,
  callByItemId: ReadonlyMap<string, string>,
): ProviderToolCall {
  return {
    id: asToolCallId(callByItemId.get(event.item_id) ?? event.item_id),
    name: event.name,
    arguments: event.arguments || '{}',
  };
}

export function extractResponsesOutputItemToolCall(
  item: OpenAI.Responses.ResponseOutputItem,
): ProviderToolCall | undefined {
  if (item.type !== 'function_call') return undefined;

  return {
    id: asToolCallId(item.call_id),
    name: item.name,
    arguments: item.arguments || '{}',
  };
}
