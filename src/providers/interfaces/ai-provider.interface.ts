export type SystemChatMessage = { role: 'system'; content: string };
export type UserChatMessage = { role: 'user'; content: string };
export type AssistantChatMessage = { role: 'assistant'; content: string };

export type ChatMessage =
  | SystemChatMessage
  | UserChatMessage
  | AssistantChatMessage;
export type ProviderChatTurn = UserChatMessage | AssistantChatMessage;

export interface ProviderChatInput {
  system?: string;
  messages: ProviderChatTurn[];
}

export interface ProviderChatResponse {
  text: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ProviderCallOptions {
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AIProvider {
  complete(
    input: ProviderChatInput,
    modelId: string,
    options?: ProviderCallOptions,
  ): Promise<ProviderChatResponse>;

  stream?(
    input: ProviderChatInput,
    modelId: string,
    options?: ProviderCallOptions,
  ): AsyncIterable<string>;
}

export function normalizeMessagesForProvider(
  messages: ChatMessage[],
  opts?: { systemJoiner?: string },
): ProviderChatInput {
  const systemJoiner = opts?.systemJoiner ?? '\n\n';

  const systemParts: string[] = [];
  const turns: ProviderChatTurn[] = [];

  for (const m of messages) {
    if (m.role === 'system') {
      if (m.content?.trim()) systemParts.push(m.content);
      continue;
    }

    turns.push(m);
  }

  const system = systemParts.length
    ? systemParts.join(systemJoiner)
    : undefined;

  return { system, messages: turns };
}
