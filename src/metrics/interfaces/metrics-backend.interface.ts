export interface LlmCallMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCallsCount?: number;
}

export type LlmRequestMetadata = Record<string, string | number | boolean>;

export interface LlmCallContext {
  provider: string;
  modelAlias: string;
  modelId: string;
  requestId: string;
  conversationId?: string;
  messages?: LlmCallMessage[];
  metadata?: LlmRequestMetadata;
}

export interface LlmCallObservation {
  responseModel?: string;
  outputText?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  costUsd?: number;
}

export interface llmStreamSpanController {
  end(observation: LlmCallObservation): void;
}

export interface MetricsBackend {
  observeLlmCall<T>(
    context: LlmCallContext,
    fn: () => Promise<T>,
    mapResult?: (result: T) => LlmCallObservation,
  ): Promise<T>;

  observeLlmStream(context: LlmCallContext): llmStreamSpanController;
}
