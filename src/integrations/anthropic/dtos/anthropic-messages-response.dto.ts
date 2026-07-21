import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnthropicTextContentBlockDto {
  @ApiProperty({ enum: ['text'], example: 'text' })
  type: 'text';

  @ApiProperty({ example: 'Hello, how are you?' })
  text: string;
}

export class AnthropicThinkingContentBlockDto {
  @ApiProperty({ enum: ['thinking'], example: 'thinking' })
  type: 'thinking';

  @ApiProperty({
    example: 'Let me think about this step by step...',
    description: 'Thinking content from extended thinking mode (Anthropic).',
  })
  thinking: string;
}

export class AnthropicToolUseContentBlockDto {
  @ApiProperty({ enum: ['tool_use'], example: 'tool_use' })
  type: 'tool_use';

  @ApiProperty({ example: 'call_abc123' })
  id: string;

  @ApiProperty({ example: 'get_weather' })
  name: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { city: 'New York' },
  })
  input: Record<string, unknown>;
}

export class AnthropicContentBlockDto {
  @ApiProperty({ enum: ['text', 'tool_use', 'thinking'] })
  type: 'text' | 'tool_use' | 'thinking';

  @ApiPropertyOptional()
  text?: string;

  @ApiPropertyOptional()
  id?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  input?: Record<string, unknown>;
}

export class AnthropicMessagesUsageDto {
  @ApiProperty({ example: 12 })
  input_tokens: number;

  @ApiProperty({ example: 48 })
  output_tokens: number;

  @ApiPropertyOptional({
    description:
      'Prompt cache creation tokens (Anthropic). Number of input tokens written to cache.',
    example: 12,
  })
  cache_creation_input_tokens?: number | null;

  @ApiPropertyOptional({
    description:
      'Prompt cache read tokens (Anthropic). Number of input tokens read from cache.',
    example: 12,
  })
  cache_read_input_tokens?: number | null;
}

export class AnthropicMessagesResponseDto {
  @ApiProperty({ example: 'msg_01HZZZZZZZZZZZZZZZZZZZZZZ' })
  id: string;

  @ApiProperty({ enum: ['message'], example: 'message' })
  type: 'message';

  @ApiProperty({ enum: ['assistant'], example: 'assistant' })
  role: 'assistant';

  @ApiProperty({ type: [AnthropicContentBlockDto] })
  content: AnthropicContentBlockDto[];

  @ApiProperty({ example: 'chat-default' })
  model: string;

  @ApiProperty({
    nullable: true,
    enum: [
      'end_turn',
      'tool_use',
      'max_tokens',
      'stop_sequence',
      'pause_turn',
      'refusal',
    ],
    example: 'end_turn',
  })
  stop_reason:
    | 'end_turn'
    | 'tool_use'
    | 'max_tokens'
    | 'stop_sequence'
    | 'pause_turn'
    | 'refusal'
    | null;

  @ApiProperty({ nullable: true, example: null })
  stop_sequence: string | null;

  @ApiProperty({ type: AnthropicMessagesUsageDto })
  usage: AnthropicMessagesUsageDto;
}

export type AnthropicContentBlock =
  | AnthropicTextContentBlockDto
  | AnthropicToolUseContentBlockDto
  | AnthropicThinkingContentBlockDto;
