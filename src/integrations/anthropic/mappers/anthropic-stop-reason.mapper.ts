import type { ChatResponseDto } from 'src/chat/dto/chat-response.dto';
import type { AnthropicMessagesResponseDto } from '../dtos/anthropic-messages-response.dto';

/**
 * Reverse map: gateway finishReason → Anthropic stop_reason.
 * Używane przez non-stream (JSON) i stream (message_delta) — muszą być 1:1.
 *
 * @see mapGatewayResponseToAnthropicFormat (anthropic-response.mapper.ts)
 * @see mapSseEventToAnthropic case 'done' (anthropic-stream.mapper.ts)
 */

export function mapGatewayFinishReasonToAnthropicStopReason(
  finishReason?: ChatResponseDto['finishReason'],
): NonNullable<AnthropicMessagesResponseDto['stop_reason']> {
  if (!finishReason) return 'end_turn';

  switch (finishReason) {
    case 'tool_calls':
      return 'tool_use';
    case 'length':
      return 'max_tokens';
    case 'stop':
      return 'end_turn';
    case 'content_filter':
      return 'refusal';
    default:
      return 'end_turn';
  }
}
