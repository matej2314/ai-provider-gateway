import { ApiProperty } from '@nestjs/swagger';
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

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  tool_call_id?: string;

  @IsOptional()
  @IsArray()
  tool_calls?: unknown[];

  @IsOptional()
  @IsString()
  refusal?: string;
}
