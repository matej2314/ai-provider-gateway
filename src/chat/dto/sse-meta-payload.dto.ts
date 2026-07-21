import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  };
}
