import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenAiToolCallFunctionDto {
  @ApiProperty({ example: 'get_weather' })
  name: string;

  @ApiProperty({ example: '{ "city": "New York" }' })
  arguments: string;
}

export class OpenAiToolCallDto {
  @ApiProperty({ example: 'call_abc123' })
  id: string;

  @ApiProperty({ enum: ['function'], example: 'function' })
  type: 'function';

  @ApiProperty({ type: OpenAiToolCallFunctionDto })
  function: OpenAiToolCallFunctionDto;
}

export class OpenAiChatCompletionMessageDto {
  @ApiProperty({ enum: ['assistant'], example: 'assistant' })
  role: 'assistant';

  @ApiPropertyOptional({
    nullable: true,
    example: 'Hello, how are you?',
    description: 'null when response contains tool_calls only.',
  })
  content: string | null;

  @ApiPropertyOptional({ type: [OpenAiToolCallDto] })
  tool_calls?: OpenAiToolCallDto[];
}

export class OpenAiChatCompletionChoiceDto {
  @ApiProperty({ example: 0 })
  index: number;

  @ApiProperty({ type: OpenAiChatCompletionMessageDto })
  message: OpenAiChatCompletionMessageDto;

  @ApiProperty({
    nullable: true,
    enum: ['stop', 'tool_calls', 'length', 'content_filter'],
    example: 'stop',
  })
  finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter' | null;
}

export class OpenAiChatCompletionUsageDto {
  @ApiProperty({ example: 12 })
  prompt_tokens: number;

  @ApiProperty({ example: 48 })
  completion_tokens: number;

  @ApiProperty({ example: 60 })
  total_tokens: number;
}

export class OpenAiChatCompletionResponseDto {
  @ApiProperty({ example: 'cmpl_01HZZZZZZZZZZZZZZZZZZZZZZ' })
  id: string;

  @ApiProperty({ enum: ['chat.completion'], example: 'chat.completion' })
  object: 'chat.completion';

  @ApiProperty({ example: 1717862400 })
  created: number;

  @ApiProperty({ example: 'chat-default' })
  model: string;

  @ApiProperty({ type: [OpenAiChatCompletionChoiceDto] })
  choices: OpenAiChatCompletionChoiceDto[];

  @ApiPropertyOptional({ type: OpenAiChatCompletionUsageDto })
  usage?: OpenAiChatCompletionUsageDto;

  @ApiPropertyOptional({
    description:
      'System fingerprinting (OpenAI). Identifier for backend configuration snapshot.',
    example: 'fp_01HZZZZZZZZZZZZZZZZZZZZZZ',
  })
  system_fingerprint?: string;
}
