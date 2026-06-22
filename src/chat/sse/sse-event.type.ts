import type { GatewayToolCall } from '../../providers/types/tooling-types';
import type { ChatWarningDto } from '../dto/chat-warning.dto';

export type SseMetaEvent = {
  id: string;
  provider: string;
  model: string;
  requestId: string;
  conversationId?: string;
};

export type SseDeltaEvent = {
  text: string;
};

export type SseDoneEvent = {
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens?: number;
  };
  toolCalls?: GatewayToolCall[];
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
  systemFingerprint?: string;
  thinkingContent?: string;
  warnings?: ChatWarningDto[];
};

export type SseEvent =
  | { name: 'meta'; data: SseMetaEvent }
  | { name: 'delta'; data: SseDeltaEvent }
  | { name: 'done'; data: SseDoneEvent };
