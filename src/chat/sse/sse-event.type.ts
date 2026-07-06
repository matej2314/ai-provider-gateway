import type { GatewayToolCall } from '../../providers/types/tooling-types';
import type { ChatWarningDto } from '../dto/chat-warning.dto';
import type { ProviderUsageDetails } from '../../providers/interfaces/ai-provider.interface';
import type { RequestId, ConversationId } from '../../common/types/branded.types';

export type SseMetaEvent = {
  id: string;
  provider: string;
  model: string;
  requestId: RequestId;
  conversationId?: ConversationId;
};

export type SseDeltaEvent = {
  text: string;
};

export type SseFinishReason =
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

export type SseDoneEvent = {
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens?: number;
  };
  toolCalls?: GatewayToolCall[];
  finishReason?: SseFinishReason;
  usageDetails?: ProviderUsageDetails;
  effectiveModelAlias?: string;
  systemFingerprint?: string;
  thinkingContent?: string;
  warnings?: ChatWarningDto[];
};

export type SseEvent =
  | { name: 'meta'; data: SseMetaEvent }
  | { name: 'delta'; data: SseDeltaEvent }
  | { name: 'done'; data: SseDoneEvent };
