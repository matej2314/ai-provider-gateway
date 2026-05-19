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
};

export type SseEvent =
  | { name: 'meta'; data: SseMetaEvent }
  | { name: 'delta'; data: SseDeltaEvent }
  | { name: 'done'; data: SseDoneEvent };
