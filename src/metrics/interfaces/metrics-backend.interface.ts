export interface LlmCallContext {
  provider: string;
  modelAlias: string;
  modelId: string;
  requestId: string;
  conversationId?: string;
}

export interface LlmCallObservation {
  responseModel?: string;
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
