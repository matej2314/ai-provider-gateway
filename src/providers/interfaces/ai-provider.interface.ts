import type {
  GatewayToolChoice,
  GatewayToolDefinition,
  GatewayToolCall,
} from '../types/tooling-types';

export type UserChatMessage = { role: 'user'; content: string };
export type AssistantChatMessage = { role: 'assistant'; content: string };
export type ProviderToolDefinition = GatewayToolDefinition;
export type ProviderToolCall = GatewayToolCall;

export type ProviderAssistantTurn = {
  role: 'assistant';
  content: string;
  toolCalls?: ProviderToolCall[];
  stopReason?: ProviderChatResponse['stopReason'];
};

export type ProviderToolResultTurn = {
  role: 'tool';
  toolCallId: string;
  content: string;
};

export type ProviderChatTurn =
  | UserChatMessage
  | AssistantChatMessage
  | ProviderAssistantTurn
  | ProviderToolResultTurn;

export interface ProviderChatInput {
  system?: string;
  messages: ProviderChatTurn[];
  tools?: ProviderToolDefinition[];
  toolChoice?: GatewayToolChoice;
}

export interface ProviderUsageDetails {
  promptCacheHitTokens?: number;
  promptCacheCreationTokens?: number;
}

export interface ProviderChatResponse {
  text: string;
  toolCalls?: ProviderToolCall[];
  stopReason?:
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
  model?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  usageDetails?: ProviderUsageDetails;
  systemFingerprint?: string;
}

export interface StreamResult {
  textStream: AsyncIterable<string>;
  getUsageMetadata: () => Promise<
    | {
        inputTokens: number;
        outputTokens: number;
        model?: string;
      }
    | undefined
  >;
  getFinalToolCalls?: () => Promise<ProviderToolCall[] | undefined>;
  getStopReason?: () => Promise<ProviderChatResponse['stopReason']>;
  getSystemFingerprint?: () => Promise<string | undefined>;
}

export interface ProviderCallOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  stop?: string | string[];
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
  responseFormat?: {
    type: 'text' | 'json_object';
    jsonSchema?: Record<string, unknown>;
  };
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
  ): StreamResult;
}
