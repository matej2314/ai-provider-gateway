import type OpenAI from 'openai';
import type {
  ProviderChatResponse,
  ProviderToolDefinition,
} from 'src/providers/interfaces/ai-provider.interface';
import type { GatewayToolChoice } from '../../types/tooling-types';
import {
  asToolCallId,
  asInputTokens,
  asOutputTokens,
  asSystemFingerprint,
} from '../../../common/types/branded.types';

type ChatCompletionTool = OpenAI.Chat.Completions.ChatCompletionTool;
type ChatCompletionMessageToolCall =
  OpenAI.Chat.Completions.ChatCompletionMessageToolCall;
type ResponsesToolChoice =
  | OpenAI.Responses.ToolChoiceOptions
  | OpenAI.Responses.ToolChoiceFunction;

export function mapToolsToResponses(
  tools: ProviderToolDefinition[],
): OpenAI.Responses.FunctionTool[] {
  return tools.map((tool) => ({
    type: 'function',
    name: tool.name,
    strict: false,
    parameters: tool.parameters,
    ...(tool.description ? { description: tool.description } : {}),
  }));
}

export function mapToolChoiceToResponses(
  choice?: GatewayToolChoice,
): ResponsesToolChoice | undefined {
  if (choice === undefined) return undefined;
  if (choice === 'auto' || choice === 'none' || choice === 'required') {
    return choice;
  }
  if (typeof choice === 'object' && choice.type === 'function') {
    return {
      type: 'function',
      name: choice.function.name,
    };
  }
  return undefined;
}

export function mapToolsToOpenAi(
  tools: ProviderToolDefinition[],
): ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      ...(tool.description ? { description: tool.description } : {}),
      parameters: tool.parameters,
    },
  }));
}

function mapOpenAiFinishReason(
  reason: string | null | undefined,
): ProviderChatResponse['stopReason'] {
  switch (reason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'tool_calls':
      return 'tool_calls';
    case 'content_filter':
      return 'content_filter';
    default:
      return 'stop';
  }
}

export function mapToolChoiceToOpenAi(
  choice?: GatewayToolChoice,
): OpenAI.Chat.Completions.ChatCompletionToolChoiceOption | undefined {
  if (choice === undefined) return undefined;
  if (choice === 'auto' || choice === 'none' || choice === 'required') {
    return choice;
  }
  if (typeof choice === 'object' && choice.type === 'function') {
    return {
      type: 'function',
      function: { name: choice.function.name },
    };
  }
  return undefined;
}

export function parseOpenAiCompletionWithTools(
  response: OpenAI.Chat.Completions.ChatCompletion,
): ProviderChatResponse {
  const choice = response.choices[0];
  const message = choice?.message;
  const text = message?.content ?? '';
  const reasoningContent = readOpenAiReasoningContent(message);
  const toolCalls = message?.tool_calls?.length
    ? mapOpenAiToolCalls(message.tool_calls)
    : undefined;

  return {
    text,
    ...(toolCalls?.length && { toolCalls }),
    ...(reasoningContent && { thinkingContent: reasoningContent }),
    stopReason: mapOpenAiFinishReason(choice?.finish_reason),
    model: response.model,
    usage: response.usage
      ? {
          inputTokens: asInputTokens(response.usage.prompt_tokens ?? 0),
          outputTokens: asOutputTokens(response.usage.completion_tokens ?? 0),
        }
      : undefined,
    systemFingerprint: response.system_fingerprint
      ? asSystemFingerprint(response.system_fingerprint)
      : undefined,
  };
}

function readOpenAiReasoningContent(
  message: OpenAI.Chat.Completions.ChatCompletionMessage | undefined,
): string | undefined {
  if (!message || typeof message !== 'object') return undefined;

  const reasoning = (message as { reasoning_content?: unknown })
    .reasoning_content;
  return typeof reasoning === 'string' && reasoning.trim()
    ? reasoning
    : undefined;
}

function mapOpenAiToolCalls(
  raw: ChatCompletionMessageToolCall[],
): ProviderChatResponse['toolCalls'] {
  return raw
    .filter((call) => call.type === 'function')
    .map((call) => ({
      id: asToolCallId(call.id),
      name: call.function.name,
      arguments: call.function.arguments ?? '{}',
    }));
}
