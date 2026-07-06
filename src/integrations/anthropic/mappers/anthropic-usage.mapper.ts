import type { AnthropicMessagesUsageDto } from '../dtos/anthropic-messages-response.dto';
import type { SseDoneEvent } from 'src/chat/sse/sse-event.type';

/** API-boundary usage details (plain numbers from DTOs/SSE). */
export type GatewayUsageDetails = {
  promptCacheHitTokens?: number;
  promptCacheCreationTokens?: number;
};

export function mapGatewayUsageToAnthropic(
  usage?: { inputTokens?: number; outputTokens?: number },
  usageDetails?: GatewayUsageDetails,
): AnthropicMessagesUsageDto {
  return {
    input_tokens: usage?.inputTokens ?? 0,
    output_tokens: usage?.outputTokens ?? 0,
    cache_creation_input_tokens:
      usageDetails?.promptCacheCreationTokens ?? null,
    cache_read_input_tokens: usageDetails?.promptCacheHitTokens ?? null,
  };
}

export function mapSseDoneUsageToAnthropic(
  done: SseDoneEvent,
): AnthropicMessagesUsageDto {
  return mapGatewayUsageToAnthropic(done.usage, done.usageDetails);
}
