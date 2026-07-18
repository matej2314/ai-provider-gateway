import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorEnvelopeDto {
  @ApiProperty({
    example: 400,
    minimum: 400,
    maximum: 599,
  })
  statusCode: number;

  @ApiProperty({
    example: 'VALIDATION_FAILED',
    description:
      'Machine-readable error code; dictionary: docs/pl/dictionary.md',
  })
  code: string;

  @ApiProperty({ example: 'modelAlias must be a string' })
  message: string;

  @ApiProperty({ example: 'req_01H...' })
  requestId: string;

  @ApiPropertyOptional({
    type: 'array',
    description: 'Current implementation often returns []',
    example: [],
  })
  details?: unknown[];
}
