import type {
  GatewayToolChoice,
  GatewayToolDefinition,
  GatewayToolCall,
} from '../types/tooling-types';
import type {
  ModelId,
  JsonSchemaName,
  ToolCallId,
  InputTokens,
  OutputTokens,
  PromptCacheHitTokens,
  PromptCacheCreationTokens,
  SystemFingerprint,
} from '../../common/types/branded.types';

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
  toolCallId: ToolCallId;
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
  metadata?: Record<string, string | number | boolean>;
}

export interface ProviderUsageDetails {
  promptCacheHitTokens?: PromptCacheHitTokens;
  promptCacheCreationTokens?: PromptCacheCreationTokens;
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
    | 'content_filter'
    | 'insufficient_system_resource';
  model?: string;
  usage?: {
    inputTokens: InputTokens;
    outputTokens: OutputTokens;
  };
  usageDetails?: ProviderUsageDetails;
  systemFingerprint?: SystemFingerprint;
  thinkingContent?: string;
}

export interface StreamResult {
  textStream: AsyncIterable<string>;
  getUsageMetadata: () => Promise<
    | {
        inputTokens: InputTokens;
        outputTokens: OutputTokens;
        model?: string;
      }
    | undefined
  >;
  getFinalToolCalls?: () => Promise<ProviderToolCall[] | undefined>;
  getStopReason?: () => Promise<ProviderChatResponse['stopReason']>;
  getSystemFingerprint?: () => Promise<SystemFingerprint | undefined>;
  getThinkingContent?: () => Promise<string | undefined>;
  getUsageDetails?: () => Promise<ProviderUsageDetails | undefined>;
}

export interface ProviderCallOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  stop?: string | string[];
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
  responseFormat?: {
    type: 'text' | 'json_object' | 'json_schema';
    jsonSchemaName?: JsonSchemaName;
    jsonSchema?: Record<string, unknown>;
  };
  thinkingEnabled?: boolean;
  thinkingBudget?:
    | 'none'
    | 'minimal'
    | 'low'
    | 'medium'
    | 'high'
    | 'xhigh'
    | 'max'
    | number;
  parallelToolCalls?: boolean;
  signal?: AbortSignal;
}

export interface AIProvider {
  complete(
    input: ProviderChatInput,
    modelId: ModelId,
    options?: ProviderCallOptions,
  ): Promise<ProviderChatResponse>;

  stream?(
    input: ProviderChatInput,
    modelId: ModelId,
    options?: ProviderCallOptions,
  ): StreamResult;
}
