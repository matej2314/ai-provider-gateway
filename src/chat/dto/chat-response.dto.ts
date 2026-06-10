import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { ChatOutputTextDto } from './chat-output-text.dto';
import { GatewayToolCallDto } from 'src/common/dtos/gateway-tool-call.dto';
import { ChatUsageDto } from './chat-usage.dto';

export class ChatResponseDto {
  @ApiProperty({
    example: 'gw_01HZZZZZZZZZZZZZZZZZZZZZZ',
    description: 'Gateway-generated unique response ID (prefix: gw_).',
  })
  id: string;

  @ApiProperty({
    example: 'anthropic',
    description: 'Provider that fulfilled the request.',
    enum: ['anthropic', 'google'],
  })
  provider: string;

  @ApiProperty({
    description: 'Requested modelAlias from body',
    example: 'chat-default',
  })
  model: string;

  @ApiPropertyOptional({
    description: 'Only after successful fallback in YAML',
    example: 'claude-sonnet',
  })
  effectiveModelAlias?: string;

  @ApiPropertyOptional({ type: [GatewayToolCallDto] })
  @IsOptional()
  toolCalls?: GatewayToolCallDto[];

  @ApiPropertyOptional({
    enum: ['stop', 'tool_calls', 'length', 'content_filter'],
  })
  @IsOptional()
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'content_filter';

  @ApiProperty({ type: ChatOutputTextDto })
  output: ChatOutputTextDto;

  @ApiPropertyOptional({ type: ChatUsageDto })
  usage?: ChatUsageDto;

  @ApiProperty({ example: 'req_01HZZZZZZZZZZZZZZZZZZZZZZ' })
  requestId: string;

  @ApiProperty({
    description:
      'Conversation ID returned to client (echo conversationId from body or conv_<uuid> when missing in request). Sentry grouping requires the same ID in body of subsequent requests — see conversation-tracking.md.',
    example: 'conv_01HZZZZZZZZZZZZZZZZZZZZZZ',
  })
  conversationId: string;

  @ApiPropertyOptional({
    enum: [true],
    description: 'Whether the response was returned from cache',
  })
  cached?: true;

  @ApiPropertyOptional({
    format: 'date-time',
  })
  cachedAt?: string;
}
