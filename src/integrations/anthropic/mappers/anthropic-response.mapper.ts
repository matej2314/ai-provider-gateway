import type { ChatResponseDto } from 'src/chat/dto/chat-response.dto';
import type { AnthropicMessagesResponse } from '../dtos/anthropic-messages-response.dto';

export function mapGatewayResultToAnthropic(
  result: ChatResponseDto,
  requestedModel: string,
): AnthropicMessagesResponse {
  return {
    id: `msg_${result.id.replace(/^gw_/, '')}`,
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: result.output.text,
      },
    ],
    model: requestedModel,
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: result.usage?.inputTokens ?? 0,
      output_tokens: result.usage?.outputTokens ?? 0,
    },
  };
}
