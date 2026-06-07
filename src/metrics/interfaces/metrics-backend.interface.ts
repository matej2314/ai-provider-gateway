export interface LlmCallMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
}

export interface LlmCallContext {
  provider: string;
  modelAlias: string;
  modelId: string;
  requestId: string;
  conversationId?: string;
  messages?: LlmCallMessage[];
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
