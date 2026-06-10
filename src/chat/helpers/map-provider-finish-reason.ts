import type { ProviderChatResponse } from 'src/providers/interfaces/ai-provider.interface';
import type { GatewayToolCall } from 'src/providers/types/tooling-types';
import type { SseDoneEvent } from '../sse/sse-event.type';

export function mapStopReasonToFinishReason(
  stopReason: ProviderChatResponse['stopReason'] | undefined,
  toolCalls?: GatewayToolCall[],
): NonNullable<SseDoneEvent['finishReason']> {
  if (stopReason === 'max_tokens') return 'length';
  if (toolCalls?.length) return 'tool_calls';

  switch (stopReason) {
    case 'tool_use':
      return 'tool_calls';
    case 'end_turn':
    case 'stop_sequence':
      return 'stop';
    default:
      return 'stop';
  }
}
