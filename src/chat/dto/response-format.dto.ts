import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional } from 'class-validator';

export class ResponseFormatDto {
  @ApiProperty({
    enum: ['text', 'json_object'],
    description:
      'Response format type. "json_object" enables JSON mode (model outputs valid JSON).',
    example: 'json_object',
  })
  @IsIn(['text', 'json_object'])
  type: 'text' | 'json_object';

  @ApiPropertyOptional({
    description: 'JSON schema for structured outputs (when type=json_object).',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  jsonSchema?: Record<string, unknown>;
}
