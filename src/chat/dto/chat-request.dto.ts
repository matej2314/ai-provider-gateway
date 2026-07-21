import {
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
  Matches,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsPrimitiveMetadataRecord } from '../validation/is-primitive-metadata-record.validator';
import { CHAT_MESSAGE_LIMITS } from '../validation/chat-ingress.constants';

import { ChatMessageDto } from './chat-message.dto';
import { ChatParamsDto } from './chat-params.dto';
import { ChatToolingDto } from './chat-tooling.dto';

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
    type: [ChatMessageDto],
    minItems: 1,
    maxItems: CHAT_MESSAGE_LIMITS.NATIVE_MAX,
    description:
      'Array of messages to send in the request. Each message must have a role and content. Maximum 150 messages.',
    required: true,
    example: [{ role: 'user', content: 'Hello, how are you?' }],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(CHAT_MESSAGE_LIMITS.NATIVE_MAX)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiPropertyOptional({
    description:
      'Optional generation overrides. Only fields listed in allowOverrides for this modelAlias are accepted.',
    type: ChatParamsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatParamsDto)
  params?: ChatParamsDto;

  @ApiPropertyOptional({
    description:
      'Optional conversation ID to group multiple requests into a single conversation for metrics tracking. Generate unique ID on the client side and reuse it for all requests in the same conversation.',
    required: false,
    example: 'conv_123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  @Matches(
    /^conv_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    {
      message: 'conversationId must be conv_<uuid>',
    },
  )
  conversationId?: string;

  @ApiPropertyOptional({ type: ChatToolingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatToolingDto)
  tooling?: ChatToolingDto;

  @ApiPropertyOptional({
    description:
      'User-defined metadata for tracking and analytics. Propagated to providers when supported (OpenAI, Anthropic).',
    type: 'object',
    additionalProperties: true,
    example: { userId: '123', sessionId: 'abc' },
  })
  @IsOptional()
  @IsObject()
  @IsPrimitiveMetadataRecord()
  metadata?: Record<string, string | number | boolean>;
}
