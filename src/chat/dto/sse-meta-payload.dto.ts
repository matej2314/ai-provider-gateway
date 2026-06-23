import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
