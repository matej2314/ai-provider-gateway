import type { ChatResponseData } from '../dto/chat-response.dto';
import type { CachedChatResponse } from '../../cache/types/cached-chat-response.type';
import {
  asProviderInstanceId,
  asInputTokens,
  asOutputTokens,
} from '../../common/types/branded.types';

/** Maps a live chat response into the shape stored by exact and semantic cache. */
export function toCachedChatResponse(
  response: ChatResponseData,
): CachedChatResponse {
  return {
    id: response.id,
    provider: asProviderInstanceId(response.provider),
    model: response.model,
    output: response.output,
    finishReason: response.finishReason ?? 'stop',
    ...(response.usage && {
      usage: {
        inputTokens: asInputTokens(response.usage.inputTokens ?? 0),
        outputTokens: asOutputTokens(response.usage.outputTokens ?? 0),
      },
    }),
    ...(response.warnings?.length && { warnings: response.warnings }),
    ...(response.thinkingContent && {
      thinkingContent: response.thinkingContent,
    }),
    ...(response.effectiveModelAlias && {
      effectiveModelAlias: response.effectiveModelAlias,
    }),
    ...(response.usageDetails && { usageDetails: response.usageDetails }),
    ...(response.systemFingerprint && {
      systemFingerprint: response.systemFingerprint,
    }),
    cached: true,
    cachedAt: new Date().toISOString(),
  };
}
