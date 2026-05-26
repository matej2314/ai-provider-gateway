import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AnthropicMessageDto } from './anthropic-message.dto';

const MAX_MESSAGES = 15000;
const SYSTEM_MAX = 128_000;

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
}
