import {
  IsIn,
  IsString,
  MaxLength,
  ValidateNested,
  IsOptional,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { GatewayToolCallDto } from '../../common/dtos/gateway-tool-call.dto';

const CONTENT_MAX_LENGTH = 3000;
const TOOL_CONTENT_MAX_LENGTH = 32000;

export class ChatMessageDto {
  @ApiProperty({
    enum: ['user', 'assistant', 'tool'],
    description:
      'Role of the message. Must be either "user", "assistant" or "tool".',
    required: true,
    example: 'user',
  })
  @IsIn(['user', 'assistant', 'tool'])
  role: 'user' | 'assistant' | 'tool';

  @ApiPropertyOptional({
    description: 'Required when role is "tool".',
    example: 'call_abc123',
  })
  @ValidateIf((message: ChatMessageDto) => message.role === 'tool')
  @IsNotEmpty()
  @IsString()
  toolCallId?: string;

  @ApiPropertyOptional({
    type: [GatewayToolCallDto],
    description:
      'Optional when role is "assistant". Tool calls requested by the model.',
  })
  @ValidateIf((message: ChatMessageDto) => message.role === 'assistant')
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => GatewayToolCallDto)
  toolCalls?: GatewayToolCallDto[];

  @ApiProperty({
    description:
      'Content of the message. Max 3000 characters for "user" and "assistant", 32000 characters for "tool".',
    required: true,
    example: 'Hello, how are you?',
  })
  @IsString()
  @ValidateIf(
    (message: ChatMessageDto) =>
      message.role === 'user' || message.role === 'assistant',
  )
  @MaxLength(CONTENT_MAX_LENGTH)
  @ValidateIf((message: ChatMessageDto) => message.role === 'tool')
  @MaxLength(TOOL_CONTENT_MAX_LENGTH)
  content: string;
}
