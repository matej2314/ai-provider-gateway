import type { GatewayFinishReason } from '../types/gateway-finish-reason.type';
import type { ProviderChatResponse } from 'src/providers/interfaces/ai-provider.interface';
import type { GatewayToolCall } from 'src/providers/types/tooling-types';

/**
 * Maps provider stopReason (+ optional toolCalls) to gateway-normalized finishReason.
 *
 * Runtime mapping (pełna macierz po 4.8):
 * - max_tokens | length → 'length'          (priorytet 1: max_tokens w if; length w switch)
 * - toolCalls?.length | tool_use | tool_calls → 'tool_calls'
 * - refusal | content_filter → 'content_filter'
 * - end_turn | stop_sequence | pause_turn | stop → 'stop'
 * - insufficient_system_resource (DeepSeek) → 'stop' (brak osobnej wartości gateway)
 * - undefined | unknown → 'stop'
 *
 * Integracje (OpenAI/Anthropic) mają własne reverse mappery dla fasad IDE.
 *
 * @see ProviderChatResponse['stopReason'] in ai-provider.interface.ts
 * @see GatewayFinishReason in chat/types/gateway-finish-reason.type.ts
 * @see dokumentacja_api.md, OpenAI API spec, Anthropic API spec
 */
export function mapStopReasonToFinishReason(
  stopReason: ProviderChatResponse['stopReason'] | undefined,
  toolCalls?: GatewayToolCall[],
): GatewayFinishReason {
  if (stopReason === 'max_tokens' || stopReason === 'length') return 'length';
  if (toolCalls?.length) return 'tool_calls';

  switch (stopReason) {
    case 'tool_use':
    case 'tool_calls':
      return 'tool_calls';
    case 'content_filter':
    case 'refusal':
      return 'content_filter';
    case 'end_turn':
    case 'stop_sequence':
    case 'pause_turn':
    case 'stop':
      return 'stop';
    case 'insufficient_system_resource':
      return 'stop';
    default:
      return 'stop';
  }
}
