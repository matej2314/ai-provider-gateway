import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeOpenAiContent } from '../helpers/normalize-openai-content';

const CONTENT_MAX = 128_000;

export class OpenAiChatMessageDto {
  @ApiProperty({ enum: ['system', 'user', 'assistant', 'tool'] })
  @IsIn(['system', 'user', 'assistant', 'tool'])
  role: 'system' | 'user' | 'assistant' | 'tool';

  @ApiProperty({
    description:
      'Parts of the message. Must be a string with a maximum length of 3000 characters.',
  })
  @Transform(({ value }) => normalizeOpenAiContent(value))
  @IsString()
  @MaxLength(CONTENT_MAX)
  content: string;

  @ApiPropertyOptional({ example: 'user-42' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'call_abc123',
    description: 'Required when role is "tool".',
  })
  @IsOptional()
  @IsString()
  tool_call_id?: string;

  @ApiPropertyOptional({
    type: 'array',
    description: 'Tool calls when role is assistant.',
  })
  @IsOptional()
  @IsArray()
  tool_calls?: unknown[];

  @ApiPropertyOptional({ description: 'Model refusal message (OpenAI spec).' })
  @IsOptional()
  @IsString()
  refusal?: string;
}
