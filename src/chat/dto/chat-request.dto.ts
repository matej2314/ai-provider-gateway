import {
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { ChatMessageDto } from './chat-message.dto';

const MAX_MESSAGES = 150;

export class ChatRequestDto {
  @ApiProperty({
    description:
      'Model alias to use for the request. Must be defined in the configuration.',
    required: true,
    example: 'claude-sonnet-4-5',
  })
  @IsString()
  modelAlias: string;

  @ApiProperty({
    description:
      'Array of messages to send in the request. Each message must have a role and content. Maximum 150 messages.',
    required: true,
    example: [{ role: 'user', content: 'Hello, how are you?' }],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_MESSAGES)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiProperty({
    description:
      'Optional conversation ID to group multiple requests into a single conversation for metrics tracking. Generate unique ID on the client side and reuse it for all requests in the same conversation.',
    required: false,
    example: 'conv_123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  conversationId?: string;
}
