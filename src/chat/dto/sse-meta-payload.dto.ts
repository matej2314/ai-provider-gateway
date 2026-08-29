import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ChatCacheSource } from '../../cache/types/chat-cache-source.type';
import type {
  ResponseId,
  RequestId,
  ConversationId,
  ModelAlias,
  ProviderInstanceId,
} from '../../common/types/branded.types';

/**
 * Internal SSE meta event payload (domain layer — branded identifiers).
 */
export interface SseMetaPayload {
  id: ResponseId;
  provider: ProviderInstanceId;
  model: ModelAlias;
  effectiveModelAlias?: ModelAlias;
  requestId: RequestId;
  conversationId: ConversationId;
  /** Tylko cache hit na native stream — pomijane na miss / w body fasad. */
  cached?: true;
  cachedAt?: string;
  cacheSource?: ChatCacheSource;
}

/**
 * HTTP/OpenAPI representation of SSE meta event (API boundary — plain strings).
 */
export class SseMetaPayloadDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  provider: string;

  @ApiProperty({ description: 'Requested modelAlias from body' })
  model: string;

  @ApiPropertyOptional({
    description: 'Model alias actually used for provider call (after fallback)',
  })
  effectiveModelAlias?: string;

  @ApiProperty()
  requestId: string;

  @ApiProperty()
  conversationId: string;

  @ApiPropertyOptional({
    enum: [true],
    description: 'Present on cache hit',
  })
  cached?: true;

  @ApiPropertyOptional({
    format: 'date-time',
  })
  cachedAt?: string;

  @ApiPropertyOptional({
    enum: ['exact', 'semantic'],
    description:
      'Which cache layer served this stream. Present only on a cache hit; omitted on a provider miss.',
  })
  cacheSource?: ChatCacheSource;
}

/** Maps internal branded SSE meta payload to API DTO (implicit unbrand). */
export function toSseMetaPayloadDto(
  payload: SseMetaPayload,
): SseMetaPayloadDto {
  return {
    id: payload.id,
    provider: payload.provider,
    model: payload.model,
    ...(payload.effectiveModelAlias && {
      effectiveModelAlias: payload.effectiveModelAlias,
    }),
    requestId: payload.requestId,
    conversationId: payload.conversationId,
    ...(payload.cached === true && {
      cached: true,
      cachedAt: payload.cachedAt,
      cacheSource: payload.cacheSource,
    }),
  };
}
