import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { OpenAiChatMessageDto } from './openai-chat-message.dto';

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
    minimum: -2.0,
    maximum: 2.0,
    example: 0.5,
    description: 'Penalize new tokens based on their presence',
  })
  @IsOptional()
  presence_penalty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  frequency_penalty?: number;
}
