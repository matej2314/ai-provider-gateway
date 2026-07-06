import type {
  OpenAiChatCompletionResponseDto,
  OpenAiToolCallDto,
} from '../dtos/openai-chat-completion-response.dto';
import type { ChatResponseDto } from 'src/chat/dto/chat-response.dto';
import type { GatewayToolCall } from 'src/providers/types/tooling-types';
import { fromGatewayToolCallDto } from '../../../common/dtos/gateway-tool-call.dto';

function mapGatewayToolCallsToOpenAi(
  toolCalls: GatewayToolCall[],
): OpenAiToolCallDto[] {
  return toolCalls.map((toolCall) => ({
    id: toolCall.id,
    type: 'function',
    function: {
      name: toolCall.name,
      arguments: toolCall.arguments,
    },
  }));
}

export function mapSystemFingerprintToOpenAi(
  systemFingerprint?: string,
):
  | Pick<OpenAiChatCompletionResponseDto, 'system_fingerprint'>
  | Record<string, never> {
  return systemFingerprint ? { system_fingerprint: systemFingerprint } : {};
}

export function mapFinishReasontoOpenAI(
  finishReason?: ChatResponseDto['finishReason'],
): OpenAiChatCompletionResponseDto['choices'][0]['finish_reason'] {
  switch (finishReason) {
    case 'tool_calls':
      return 'tool_calls';
    case 'length':
      return 'length';
    case 'content_filter':
      return 'content_filter';
    default:
      return 'stop';
  }
}

export function toOpenAiCompletionId(gatewayId: string): string {
  if (gatewayId.startsWith('gw_')) {
    return `chatcmpl_${gatewayId.slice(3)}`;
  }
  return `chatcmpl_${gatewayId}`;
}

export function mapChatResponseToOpenAi(
  result: ChatResponseDto,
  requestedModel: string,
): OpenAiChatCompletionResponseDto {
  const input = result.usage?.inputTokens ?? 0;
  const output = result.usage?.outputTokens ?? 0;
  const hasToolCalls = (result.toolCalls?.length ?? 0) > 0;

  return {
    id: toOpenAiCompletionId(result.id),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: requestedModel,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content:
            hasToolCalls && !result.output.text ? null : result.output.text,
          ...(hasToolCalls && {
            tool_calls: mapGatewayToolCallsToOpenAi(
              result.toolCalls!.map(fromGatewayToolCallDto),
            ),
          }),
        },
        finish_reason: mapFinishReasontoOpenAI(result.finishReason),
      },
    ],
    usage: {
      prompt_tokens: input,
      completion_tokens: output,
      total_tokens: input + output,
    },
    ...mapSystemFingerprintToOpenAi(result.systemFingerprint),
  };
}
