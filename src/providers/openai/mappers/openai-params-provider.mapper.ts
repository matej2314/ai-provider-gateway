import { prefersMaxCompletionTokens } from '../openai-api-surface.models';
import {
  mapThinkingToChatCompletion,
  type ChatCompletionThinkingParam,
} from './openai-thinking-provider.mapper';
import type OpenAI from 'openai';
import type { ProviderCallOptions } from '../../../providers/interfaces/ai-provider.interface';

export type OpenAiSharedChatCompletionParams = Omit<
  Partial<OpenAI.Chat.Completions.ChatCompletionCreateParams>,
  'model' | 'messages' | 'stream'
> & {
  thinking?: ChatCompletionThinkingParam;
};

export type OpenAiSharedResponsesParams = Omit<
  Partial<OpenAI.Responses.ResponseCreateParamsNonStreaming>,
  'model' | 'input' | 'instructions' | 'stream'
>;

const DEFAULT_JSON_SCHEMA_NAME = 'gateway_response';

function mapResponseFormatToChatCompletion(
  responseFormat: NonNullable<ProviderCallOptions['responseFormat']>,
): OpenAiSharedChatCompletionParams['response_format'] {
  if (responseFormat.type === 'json_object') {
    return { type: 'json_object' };
  }
  if (responseFormat.type === 'json_schema' && responseFormat.jsonSchema) {
    return {
      type: 'json_schema',
      json_schema: {
        name: responseFormat.jsonSchemaName ?? DEFAULT_JSON_SCHEMA_NAME,
        schema: responseFormat.jsonSchema,
        strict: true,
      },
    };
  }
  return undefined;
}

export function mapMaxOutputTokensForChatCompletions(
  modelId: string,
  maxOutputTokens?: number,
): Pick<
  OpenAiSharedChatCompletionParams,
  'max_tokens' | 'max_completion_tokens'
> {
  if (maxOutputTokens === undefined) return {};

  if (prefersMaxCompletionTokens(modelId)) {
    return { max_completion_tokens: maxOutputTokens };
  }
  return { max_tokens: maxOutputTokens };
}

function mapResponseFormatToResponses(
  responseFormat: NonNullable<ProviderCallOptions['responseFormat']>,
): OpenAiSharedResponsesParams['text'] {
  if (responseFormat.type === 'json_object') {
    return { format: { type: 'json_object' } };
  }
  if (responseFormat.type === 'json_schema' && responseFormat.jsonSchema) {
    return {
      format: {
        type: 'json_schema',
        name: responseFormat.jsonSchemaName ?? DEFAULT_JSON_SCHEMA_NAME,
        schema: responseFormat.jsonSchema,
        strict: true,
      },
    };
  }
  return undefined;
}

export function mapStopSequences(
  stop: ProviderCallOptions['stop'],
): string[] | undefined {
  if (stop === undefined) return undefined;
  return Array.isArray(stop) ? stop : [stop];
}

export function mapCallOptionsToChatCompletionParams(
  modelId: string,
  options?: ProviderCallOptions,
): OpenAiSharedChatCompletionParams {
  if (!options) {
    return { thinking: mapThinkingToChatCompletion(undefined) };
  }

  const responseFormat = options.responseFormat
    ? mapResponseFormatToChatCompletion(options.responseFormat)
    : undefined;

  return {
    thinking: mapThinkingToChatCompletion(options),
    ...(options.temperature !== undefined && {
      temperature: options.temperature,
    }),
    ...(options.topP !== undefined && { top_p: options.topP }),
    ...(options.frequencyPenalty !== undefined && {
      frequency_penalty: options.frequencyPenalty,
    }),
    ...(options.presencePenalty !== undefined && {
      presence_penalty: options.presencePenalty,
    }),
    ...(options.seed !== undefined && { seed: options.seed }),
    ...(mapStopSequences(options.stop) && {
      stop: mapStopSequences(options.stop),
    }),
    ...(responseFormat && { response_format: responseFormat }),
    ...mapMaxOutputTokensForChatCompletions(modelId, options.maxOutputTokens),
  };
}

export function mapCallOptionsToResponsesParams(
  options?: ProviderCallOptions,
): OpenAiSharedResponsesParams {
  if (!options) return {};

  const textFormat = options.responseFormat
    ? mapResponseFormatToResponses(options.responseFormat)
    : undefined;

  return {
    ...(options.temperature !== undefined && {
      temperature: options.temperature,
    }),
    ...(options.maxOutputTokens !== undefined && {
      max_output_tokens: options.maxOutputTokens,
    }),
    ...(options.topP !== undefined && { top_p: options.topP }),
    ...(textFormat && { text: textFormat }),
    ...(options.parallelToolCalls !== undefined && {
      parallel_tool_calls: options.parallelToolCalls,
    }),
  };
}
