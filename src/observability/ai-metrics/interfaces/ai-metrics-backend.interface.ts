import type {
  RequestId,
  ProviderInstanceId,
  ConversationId,
  ToolCallId,
  ModelAlias,
  ModelId,
  InputTokens,
  OutputTokens,
  CostUsd,
} from '../../../common/types/branded.types';

export interface LlmCallMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: ToolCallId;
  toolCallsCount?: number;
}

export type LlmRequestMetadata = Record<string, string | number | boolean>;

export interface LlmCallContext {
  provider: ProviderInstanceId;
  modelAlias: ModelAlias;
  modelId: ModelId;
  requestId: RequestId;
  conversationId?: ConversationId;
  messages?: LlmCallMessage[];
  metadata?: LlmRequestMetadata;
}

export interface LlmCallObservation {
  responseModel?: string;
  outputText?: string;
  usage?: {
    inputTokens?: InputTokens;
    outputTokens?: OutputTokens;
  };
  costUsd?: CostUsd;
}

export interface LlmStreamSpanController {
  withActiveSpan<T>(fn: () => T): T;
  end(observation: LlmCallObservation): void;
  fail(observation?: LlmCallObservation): void;
}

export interface AiMetricsBackend {
  observeLlmCall<T>(
    context: LlmCallContext,
    fn: () => Promise<T>,
    mapResult?: (result: T) => LlmCallObservation,
  ): Promise<T>;

  observeLlmStream(context: LlmCallContext): LlmStreamSpanController;
}
