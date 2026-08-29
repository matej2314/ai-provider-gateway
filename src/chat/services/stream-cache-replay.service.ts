import { Injectable } from '@nestjs/common';
import { LoggingService } from '../../logging/logging.service';
import type { CachedChatResponse } from '../../cache/types/cached-chat-response.type';
import type { ChatCacheSource } from '../../cache/types/chat-cache-source.type';
import type { SseEvent } from '../sse/sse-event.type';
import type {
  ConversationId,
  RequestId,
} from '../../common/types/branded.types';

/** Stała brief D8 / Q3 — nie konfigurowalna w YAML v1. */
export const STREAM_CACHE_REPLAY_CHUNK_SIZE = 64;

export type StreamCacheReplayInput = {
  cached: CachedChatResponse;
  cacheSource: ChatCacheSource;
  requestId: RequestId;
  conversationId: ConversationId;
  emit: (event: SseEvent) => void;
  /** Gdy true — przerwij emit (abort / writableEnded). */
  shouldAbort?: () => boolean;
};

@Injectable()
export class StreamCacheReplayService {
  private readonly logger: LoggingService;

  constructor(loggingService: LoggingService) {
    this.logger = loggingService.child({ module: 'StreamCacheReplayService' });
  }

  replay(input: StreamCacheReplayInput): void {
    const {
      cached,
      cacheSource,
      requestId,
      conversationId,
      emit,
      shouldAbort,
    } = input;

    if (shouldAbort?.()) return;

    emit({
      name: 'meta',
      data: {
        id: cached.id,
        provider: cached.provider,
        model: cached.model,
        ...(cached.effectiveModelAlias && {
          effectiveModelAlias: cached.effectiveModelAlias,
        }),
        requestId,
        conversationId,
        cached: true,
        cachedAt: cached.cachedAt,
        cacheSource,
      },
    });

    const text = cached.output.text ?? '';
    for (let i = 0; i < text.length; i += STREAM_CACHE_REPLAY_CHUNK_SIZE) {
      if (shouldAbort?.()) return;
      emit({
        name: 'delta',
        data: { text: text.slice(i, i + STREAM_CACHE_REPLAY_CHUNK_SIZE) },
      });
      // delay = 0 — brak sleep (brief D8)
    }

    if (shouldAbort?.()) return;

    emit({
      name: 'done',
      data: {
        ...(cached.usage && {
          usage: {
            inputTokens: cached.usage.inputTokens,
            outputTokens: cached.usage.outputTokens,
            totalTokens: cached.usage.inputTokens + cached.usage.outputTokens,
          },
        }),
        finishReason: cached.finishReason,
        ...(cached.usageDetails && { usageDetails: cached.usageDetails }),
        ...(cached.systemFingerprint && {
          systemFingerprint: cached.systemFingerprint,
        }),
        ...(cached.thinkingContent && {
          thinkingContent: cached.thinkingContent,
        }),
        ...(cached.effectiveModelAlias && {
          effectiveModelAlias: cached.effectiveModelAlias,
        }),
        ...(cached.warnings?.length && { warnings: cached.warnings }),
      },
    });

    this.logger.info('Stream cache replay completed', { cacheSource });
  }
}
