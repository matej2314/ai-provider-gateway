import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsInt,
  IsIn,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AnthropicMessageDto } from './anthropic-message.dto';

const MAX_MESSAGES = 15000;
const SYSTEM_MAX = 128_000;

export class AnthropicThinkingDto {
  @ApiPropertyOptional({
    enum: ['enabled', 'disabled', 'adaptive'],
    description: 'Thinking mode type.',
  })
  @IsOptional()
  @IsIn(['enabled', 'disabled', 'adaptive'])
  type?: 'enabled' | 'disabled' | 'adaptive';

  @ApiPropertyOptional({
    minimum: 1024,
    description: 'Token budget for thinking (minimum 1024).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1024)
  budget_tokens?: number;

  @ApiPropertyOptional({
    enum: ['summarized', 'omitted'],
    description: 'How to display thinking content.',
  })
  @IsOptional()
  @IsIn(['summarized', 'omitted'])
  display?: 'summarized' | 'omitted';
}

export class AnthropicMessagesRequestDto {
  @ApiProperty({ example: 'chat-default' })
  @IsString()
  model: string;

  @ApiProperty({ type: [AnthropicMessageDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_MESSAGES)
  @ValidateNested({ each: true })
  @Type(() => AnthropicMessageDto)
  messages: AnthropicMessageDto[];

  @ApiPropertyOptional({ maxLength: SYSTEM_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(SYSTEM_MAX)
  system?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  max_tokens?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiPropertyOptional({
    type: 'array',
    description:
      'Anthropic tools array. Requires capabilities.tools on model alias.',
  })
  @IsOptional()
  tools?: unknown[];

  @ApiPropertyOptional({
    description: 'Tool choice per Anthropic API (auto, any, tool, ...).',
  })
  @IsOptional()
  tool_choice?: unknown;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  top_p?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  top_k?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stop_sequences?: string[];

  @ApiPropertyOptional({
    description:
      'Output format configuration for structured JSON outputs (Anthropic official API shape). ' +
      'Use format.type="json_schema" with required schema field. ' +
      'Gateway maps this to unified responseFormat internally. ' +
      'Example: { "format": { "type": "json_schema", "schema": {...} } }',
    type: 'object',
    properties: {
      format: {
        type: 'object',
        properties: {
          type: { enum: ['json_schema'] },
          schema: { type: 'object', additionalProperties: true },
        },
        required: ['type', 'schema'],
      },
      effort: { enum: ['low', 'medium', 'high', 'xhigh', 'max'] },
    },
    example: { effort: 'high' },
  })
  @IsOptional()
  @IsObject()
  output_config?: {
    format?: {
      type: 'json_schema';
      schema: Record<string, unknown>;
    };
    effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  };

  @ApiPropertyOptional({
    description: 'Metadata for abuse monitoring (user_id)',
    type: 'object',
    properties: {
      user_id: { type: 'string' },
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: { user_id?: string };

  @ApiPropertyOptional({
    description:
      'Extended thinking configuration (Anthropic unified API).' +
      'Use thinking.budget_tokens (int, min 1024) for token budget or omit for adaptive thinking mode.' +
      'Requires Claude Opus 4.6+ or Sonnet 3.7+',
    type: AnthropicThinkingDto,
    example: { type: 'enabled', budget_tokens: 5000, display: 'summarized' },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AnthropicThinkingDto)
  thinking?: AnthropicThinkingDto;
}
