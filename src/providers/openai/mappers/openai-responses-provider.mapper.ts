import type OpenAI from 'openai';
import type { ProviderChatResponse } from 'src/providers/interfaces/ai-provider.interface';
import {
  asToolCallId,
  asInputTokens,
  asOutputTokens,
} from '../../../common/types/branded.types';

function extractResponsesToolCalls(
  output: OpenAI.Responses.Response['output'] | undefined,
): ProviderChatResponse['toolCalls'] | undefined {
  if (!output?.length) return undefined;

  const toolCalls = output
    .filter(
      (item): item is OpenAI.Responses.ResponseFunctionToolCall =>
        item.type === 'function_call',
    )
    .map((item) => ({
      id: asToolCallId(item.call_id),
      name: item.name,
      arguments: item.arguments || '{}',
    }));

  return toolCalls.length ? toolCalls : undefined;
}

export function mapResponsesStopReason(
  response: OpenAI.Responses.Response,
): ProviderChatResponse['stopReason'] {
  const hasToolCalls = response.output?.some(
    (item) => item.type === 'function_call',
  );
  if (hasToolCalls) return 'tool_calls';

  if (response.status === 'incomplete') {
    const reason = response.incomplete_details?.reason;
    if (reason === 'max_output_tokens') return 'length';
    if (reason === 'content_filter') return 'content_filter';
  }

  return 'stop';
}

export function parseOpenAiResponse(
  response: OpenAI.Responses.Response,
  modelId: string,
): ProviderChatResponse {
  const toolCalls = extractResponsesToolCalls(response.output);

  return {
    text: response.output_text ?? '',
    ...(toolCalls?.length && { toolCalls }),
    stopReason: mapResponsesStopReason(response),
    model: response.model ?? modelId,
    usage: response.usage
      ? {
          inputTokens: asInputTokens(response.usage.input_tokens ?? 0),
          outputTokens: asOutputTokens(response.usage.output_tokens ?? 0),
        }
      : undefined,
  };
}
