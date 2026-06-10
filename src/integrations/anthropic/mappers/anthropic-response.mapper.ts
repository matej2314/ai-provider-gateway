import type { ChatResponseDto } from 'src/chat/dto/chat-response.dto';
import type {
  AnthropicMessagesResponseDto,
  AnthropicContentBlock,
} from '../dtos/anthropic-messages-response.dto';
import type { GatewayToolCall } from 'src/providers/types/tooling-types';

function mapGatewayToolCallsToAnthropic(
  toolCalls: GatewayToolCall[],
): AnthropicContentBlock[] {
  return toolCalls.map((toolCall) => ({
    type: 'tool_use',
    id: toolCall.id,
    name: toolCall.name,
    input: JSON.parse(toolCall.arguments || '{}'),
  }));
}

function mapStopReason(
  finishReason?: ChatResponseDto['finishReason'],
): AnthropicMessagesResponseDto['stop_reason'] {
  if (finishReason === 'tool_calls') return 'tool_use';
  return 'end_turn';
}

export function mapGatewayResultToAnthropic(
  result: ChatResponseDto,
  requestedModel: string,
): AnthropicMessagesResponseDto {
  const content: AnthropicContentBlock[] = [];

  if (result.output.text !== undefined) {
    content.push({ type: 'text', text: result.output.text });
  }

  if (result.toolCalls?.length) {
    content.push(...mapGatewayToolCallsToAnthropic(result.toolCalls));
  }

  return {
    id: `msg_${result.id.replace(/^gw_/, '')}`,
    type: 'message',
    role: 'assistant',
    content,
    model: requestedModel,
    stop_reason: mapStopReason(result.finishReason),
    stop_sequence: null,
    usage: {
      input_tokens: result.usage?.inputTokens ?? 0,
      output_tokens: result.usage?.outputTokens ?? 0,
    },
  };
}
