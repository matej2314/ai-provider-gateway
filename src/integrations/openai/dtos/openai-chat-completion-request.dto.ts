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

const MAX_MESSAGES = 150;

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
}
