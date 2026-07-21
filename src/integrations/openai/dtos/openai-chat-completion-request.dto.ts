import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  IsObject,
  IsIn,
} from 'class-validator';
import { OpenAiChatMessageDto } from './openai-chat-message.dto';
import { IsStringOrArrayOfStrings } from '../../../common/validators/is-string-or-array-of-strings.validator';

const MAX_MESSAGES = 15000;

export class OpenAiStreamOptionsDto {
  @ApiPropertyOptional({
    default: false,
    description: 'Include usage in the final stream chunk.',
  })
  @IsOptional()
  @IsBoolean()
  include_usage?: boolean;
}

export class OpenAiChatCompletionRequestDto {
  @ApiProperty({ example: 'chat-default' })
  @IsString()
  model: string;

  @ApiProperty({ type: [OpenAiChatMessageDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_MESSAGES)
  @ValidateNested({ each: true })
  @Type(() => OpenAiChatMessageDto)
  messages: OpenAiChatMessageDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  max_tokens?: number;

  @ApiPropertyOptional({ description: 'Include usage in non-stream respose.' })
  @IsOptional()
  include_usage?: boolean;

  @ApiPropertyOptional({
    type: 'array',
    description:
      'OpenAI tools array. Requires capabilities.tools on model alias.',
  })
  @IsOptional()
  tools?: unknown[];

  @ApiPropertyOptional({
    description:
      'Tool choice: "auto" | "none" | "required" | { type: "function"; function: { name: string } }',
  })
  @IsOptional()
  tool_choice?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => OpenAiStreamOptionsDto)
  stream_options?: OpenAiStreamOptionsDto;

  @ApiPropertyOptional()
  @IsOptional()
  user?: string;

  @ApiPropertyOptional()
  @IsOptional()
  parallel_tool_calls?: boolean;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 1,
    example: 0.95,
    description: 'Nucleus sampling parameter.',
  })
  @IsOptional()
  top_p?: number;

  @ApiPropertyOptional({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    description: 'Stop sequences where generation should stop.',
    example: ['\n\n', '###'],
  })
  @IsOptional()
  @IsStringOrArrayOfStrings()
  stop?: string | string[];

  @ApiPropertyOptional({
    minimum: -2.0,
    maximum: 2.0,
    example: 0.5,
    description: 'Penalize new tokens based on their presence',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-2.0)
  @Max(2.0)
  presence_penalty?: number;

  @ApiPropertyOptional({
    minimum: -2.0,
    maximum: 2.0,
    example: 0.85,
    description: 'Penalize new tokens based on their frequency.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-2.0)
  @Max(2.0)
  frequency_penalty?: number;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 2 ** 32 - 1,
    example: 42,
    description: 'Seed for deterministic sampling.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** 32 - 1)
  seed?: number;

  @ApiPropertyOptional({
    type: 'object',
    properties: {
      type: { enum: ['text', 'json_object'] },
    },
  })
  @IsOptional()
  @IsObject()
  response_format?: { type: 'text' | 'json_object' };

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string | number | boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_completion_tokens?: number;

  @ApiPropertyOptional({
    description:
      'Reasoning effor for OpenAI reasoning models.' +
      'Gateway not support this parameter yet.',
    enum: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
    example: 'medium',
  })
  @IsOptional()
  @IsString()
  @IsIn(['none', 'minimal', 'low', 'medium', 'high', 'xhigh'])
  reasoning_effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}
