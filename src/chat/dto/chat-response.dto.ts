import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ChatOutputTextDto } from './chat-output-text.dto';
import {
  GatewayToolCallDto,
  toGatewayToolCallDto,
} from '../../common/dtos/gateway-tool-call.dto';
import { ChatUsageDto } from './chat-usage.dto';
import { ChatWarningDto } from './chat-warning.dto';
import type { GatewayToolCall } from '../../providers/types/tooling-types';
import type { ProviderUsageDetails } from '../../providers/interfaces/ai-provider.interface';
import type { GatewayFinishReason } from '../types/gateway-finish-reason.type';
import type { CachedChatResponse } from '../../cache/types/cached-chat-response.type';
import type {
  ResponseId,
  RequestId,
  ConversationId,
  ModelAlias,
  ProviderInstanceId,
  InputTokens,
  OutputTokens,
  SystemFingerprint,
} from '../../common/types/branded.types';

export class ChatUsageDetailsDto {
  @ApiPropertyOptional({
    description:
      'Prompt cache hit tokens (Anthropic). Number of input tokens read from cache.',
  })
  promptCacheHitTokens?: number;

  @ApiPropertyOptional({
    description:
      'Promp cache creation tokens (Anthropic). Number of input tokens written to cache.',
  })
  promptCacheCreationTokens?: number;
}

/**
 * Internal chat response (domain layer — branded identifiers).
 */
export interface ChatResponseData {
  id: ResponseId;
  provider: ProviderInstanceId;
  model: ModelAlias;
  effectiveModelAlias?: ModelAlias;
  output: {
    type: 'text';
    text: string;
  };
  usage?: {
    inputTokens?: InputTokens;
    outputTokens?: OutputTokens;
    totalTokens?: number;
  };
  requestId: RequestId;
  conversationId: ConversationId;
  toolCalls?: GatewayToolCall[];
  finishReason?: GatewayFinishReason;
  usageDetails?: ProviderUsageDetails;
  systemFingerprint?: SystemFingerprint;
  thinkingContent?: string;
  warnings?: ChatWarningDto[];
}

/**
 * HTTP/OpenAPI representation of chat response (API boundary — plain strings).
 */
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
    enum: [
      'end_turn',
      'tool_use',
      'max_tokens',
      'stop_sequence',
      'pause_turn',
      'refusal',
      'tool_calls',
      'stop',
      'length',
      'content_filter',
    ],
  })
  @IsOptional()
  finishReason?:
    | 'end_turn'
    | 'tool_use'
    | 'max_tokens'
    | 'stop_sequence'
    | 'pause_turn'
    | 'refusal'
    | 'tool_calls'
    | 'stop'
    | 'length'
    | 'content_filter';

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

  @ApiPropertyOptional({
    type: ChatUsageDetailsDto,
    description:
      'Extended usage details (cache tokens, reasoning tokens). Populated when provider supports extended usage details.',
  })
  usageDetails?: ChatUsageDetailsDto;

  @ApiPropertyOptional({
    description:
      'System fingerprinting (OpenAI). Identifier for backend configuration snapshot.',
    example: 'fp_01HZZZZZZZZZZZZZZZZZZZZZZ',
  })
  systemFingerprint?: string;

  @ApiPropertyOptional({
    description:
      'Extended thinking/reasoning content from model. Not streamed in real-time.',
    example: 'Let me think about this step by step...',
  })
  @IsOptional()
  @IsString()
  thinkingContent?: string;

  @ApiPropertyOptional({
    type: [ChatWarningDto],
    description:
      'Optional warnings about parameters that were accepted but ignored or modified by the provider.',
  })
  @IsOptional()
  warnings?: ChatWarningDto[];
}

/** Cached response enriched with conversation context for API mapping. */
export type CachedChatResponseWithConversation = CachedChatResponse & {
  conversationId: ConversationId;
};

export function toChatResponseDto(data: ChatResponseData): ChatResponseDto {
  return {
    id: data.id,
    provider: data.provider,
    model: data.model,
    ...(data.effectiveModelAlias && {
      effectiveModelAlias: data.effectiveModelAlias,
    }),
    ...(data.toolCalls?.length && {
      toolCalls: data.toolCalls.map(toGatewayToolCallDto),
    }),
    ...(data.finishReason && { finishReason: data.finishReason }),
    output: data.output,
    ...(data.usage && { usage: data.usage }),
    requestId: data.requestId,
    conversationId: data.conversationId,
    ...(data.usageDetails && { usageDetails: data.usageDetails }),
    ...(data.systemFingerprint && {
      systemFingerprint: data.systemFingerprint,
    }),
    ...(data.thinkingContent && { thinkingContent: data.thinkingContent }),
    ...(data.warnings?.length && { warnings: data.warnings }),
  };
}

/** Maps cached internal response to API DTO (implicit unbrand). */
export function toChatResponseDtoFromCache(
  data: CachedChatResponse,
  conversationId: ConversationId,
): ChatResponseDto {
  return {
    id: data.id,
    provider: data.provider,
    model: data.model,
    output: data.output,
    ...(data.usage && { usage: data.usage }),
    requestId: data.requestId,
    conversationId,
    cached: true,
    cachedAt: data.cachedAt,
    ...(data.warnings?.length && { warnings: data.warnings }),
  };
}
