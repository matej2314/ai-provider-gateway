import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  IsObject,
} from 'class-validator';

const TEXT_MAX = 128_000;

export class AnthropicContentBlockDto {
  @ApiPropertyOptional({ enum: ['text', 'image', 'tool_use', 'tool_result'] })
  @IsIn(['text', 'image', 'tool_use', 'tool_result'])
  type: 'text' | 'image' | 'tool_use' | 'tool_result';

  @ApiPropertyOptional({ maxLength: TEXT_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tool_use_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  content?: string;
}
