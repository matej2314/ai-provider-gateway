import type Anthropic from '@anthropic-ai/sdk';
import type {
  ProviderAssistantTurn,
  ProviderChatResponse,
  ProviderChatTurn,
  ProviderToolDefinition,
  ProviderToolResultTurn,
  ProviderUsageDetails,
} from '../interfaces/ai-provider.interface';
import { extractAnthropicThinkingContent } from './anthropic-thinking.mapper';
import { parseJsonObject } from '../helpers/parse-json-object';
import type { GatewayToolChoice } from '../types/tooling-types';
import type { ProviderToolCall } from '../interfaces/ai-provider.interface';
import {
  asToolCallId,
  asInputTokens,
  asOutputTokens,
  asPromptCacheCreationTokens,
  asPromptCacheHitTokens,
} from '../../common/types/branded.types';

type Message = Anthropic.Message;
type MessageParam = Anthropic.MessageParam;
type Tool = Anthropic.Tool;
type ToolChoice = Anthropic.ToolChoice;
type ToolInputSchema = Anthropic.Tool.InputSchema;
type ContentBlockParam = Anthropic.ContentBlockParam;
type ToolResultBlockParam = Anthropic.ToolResultBlockParam;
type StopReason = Anthropic.StopReason;

const STOP_REASON_MAP: Partial<
  Record<StopReason, ProviderChatResponse['stopReason']>
> = {
  end_turn: 'end_turn',
  tool_use: 'tool_use',
  max_tokens: 'max_tokens',
  stop_sequence: 'stop_sequence',
  pause_turn: 'pause_turn',
  refusal: 'refusal',
};

export function mapToolsToAnthropic(tools: ProviderToolDefinition[]): Tool[] {
  return tools.map((tool) => ({
    name: tool.name,
    ...(tool.description ? { description: tool.description } : {}),
    input_schema: toInputSchema(tool.parameters),
  }));
}

export function mapToolChoiceToAnthropic(
  choice?: GatewayToolChoice,
): ToolChoice | undefined {
  if (choice === undefined) return undefined;

  switch (choice) {
    case 'auto':
      return { type: 'auto' };
    case 'none':
      return { type: 'none' };
    case 'required':
      return { type: 'any' };
  }

  if (typeof choice === 'object' && choice.type === 'function') {
    return { type: 'tool', name: choice.function.name };
  }
  return undefined;
}

export function mapTurnsToAnthropicMessages(
  turns: ProviderChatTurn[],
): MessageParam[] {
  const messages: MessageParam[] = [];

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];

    switch (turn.role) {
      case 'user':
        messages.push({ role: 'user', content: turn.content });
        continue;
      case 'assistant':
        messages.push(mapAssistantTurn(turn));
        continue;
      case 'tool': {
        const toolResults: ToolResultBlockParam[] = [
          {
            type: 'tool_result',
            tool_use_id: turn.toolCallId,
            content: turn.content,
          },
        ];

        while (i + 1 < turns.length && turns[i + 1].role === 'tool') {
          i++;
          const next = turns[i];
          toolResults.push({
            type: 'tool_result',
            tool_use_id: (next as ProviderToolResultTurn).toolCallId,
            content: next.content,
          });
        }

        messages.push({ role: 'user', content: toolResults });
        break;
      }
    }
  }
  return messages;
}

export function parseAnthropicResponseWithTools(
  response: Message,
): ProviderChatResponse {
  let text = '';
  const toolCalls: ProviderToolCall[] = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      text += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: asToolCallId(block.id),
        name: block.name,
        arguments: stringifyToolInput(block.input),
      });
    }
  }

  const stopReason = response.stop_reason
    ? STOP_REASON_MAP[response.stop_reason]
    : undefined;

  let usageDetails: ProviderUsageDetails | undefined;

  if (response.usage.cache_read_input_tokens != null) {
    usageDetails = {
      ...usageDetails,
      promptCacheHitTokens: asPromptCacheHitTokens(
        response.usage.cache_read_input_tokens,
      ),
    };
  }

  if (response.usage.cache_creation_input_tokens != null) {
    usageDetails = {
      ...usageDetails,
      promptCacheCreationTokens: asPromptCacheCreationTokens(
        response.usage.cache_creation_input_tokens,
      ),
    };
  }

  const thinkingContent = extractAnthropicThinkingContent(response.content);

  return {
    text,
    ...(toolCalls.length ? { toolCalls } : {}),
    ...(stopReason ? { stopReason } : {}),
    model: response.model,
    usage: {
      inputTokens: asInputTokens(response.usage.input_tokens),
      outputTokens: asOutputTokens(response.usage.output_tokens),
    },
    ...(usageDetails ? { usageDetails } : {}),
    ...(thinkingContent ? { thinkingContent } : {}),
  };
}

function mapAssistantTurn(turn: ProviderAssistantTurn): MessageParam {
  const hasToolCalls = (turn.toolCalls?.length ?? 0) > 0;

  if (!hasToolCalls) {
    return { role: 'assistant', content: turn.content };
  }

  const blocks: ContentBlockParam[] = [];

  if (turn.content) {
    blocks.push({ type: 'text', text: turn.content });
  }

  for (const toolCall of turn.toolCalls!) {
    blocks.push({
      type: 'tool_use',
      id: toolCall.id,
      name: toolCall.name,
      input: parseToolCallArguments(toolCall.arguments),
    });
  }

  return { role: 'assistant', content: blocks };
}

function toInputSchema(parameters: Record<string, unknown>): ToolInputSchema {
  if (
    typeof parameters === 'object' &&
    parameters !== null &&
    parameters.type === 'object'
  ) {
    return parameters as ToolInputSchema;
  }
  return {
    type: 'object',
    properties: parameters,
  };
}

function parseToolCallArguments(argumentsJson: string): unknown {
  try {
    return parseJsonObject(argumentsJson);
  } catch {
    return {};
  }
}

function stringifyToolInput(input: unknown): string {
  if (typeof input === 'string') return input;
  return JSON.stringify(input ?? {});
}
