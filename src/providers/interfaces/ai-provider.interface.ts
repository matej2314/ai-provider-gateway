export type UserChatMessage = { role: 'user'; content: string };
export type AssistantChatMessage = { role: 'assistant'; content: string };

export type ProviderChatTurn = UserChatMessage | AssistantChatMessage;

export interface ProviderChatInput {
  system?: string;
  messages: ProviderChatTurn[];
}

export interface ProviderChatResponse {
  text: string;
  model?: string;
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

