import OpenAI from 'openai';
import { LoggingService } from 'src/logging/logging.service';
import {
  mapOpenAiSdkError,
  toHttpException,
} from '../../../common/errors/provider-error.mapper';
import { mapTurnsToOpenAiMessages } from '../mappers/openai-messages-provider.mapper';
import { mapCallOptionsToChatCompletionParams } from '../mappers/openai-params-provider.mapper';
import {
  mapToolChoiceToOpenAi,
  mapToolsToOpenAi,
  parseOpenAiCompletionWithTools,
} from '../mappers/openai-tools-provider.mapper';
import {
  accumulateOpenAiStreamToolCallDeltas,
  extractOpenAiStreamDeltaText,
  finalizeOpenAiStreamToolCalls,
  type OpenAiStreamToolCallAccumulator,
} from '../mappers/openai-stream-provider.mapper';
import type {
  ProviderCallOptions,
  ProviderChatInput,
  ProviderChatResponse,
  StreamResult,
} from '../../interfaces/ai-provider.interface';
import {
  asInputTokens,
  asOutputTokens,
  asSystemFingerprint,
} from '../../../common/types/branded.types';

export interface ChatCompletionsAdapterOptions {
  includeStreamUsage?: boolean;
}

export function createChatCompletionsAdapter(
  client: OpenAI,
  logger: LoggingService,
  adapterOptions: ChatCompletionsAdapterOptions = {},
) {
  const includeStreamUsage = adapterOptions.includeStreamUsage ?? false;

  return {
    async complete(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): Promise<ProviderChatResponse> {
      try {
        const messages = mapTurnsToOpenAiMessages(input.messages, input.system);
        const baseParams = {
          model: modelId,
          messages,
          ...mapCallOptionsToChatCompletionParams(modelId, options),
        };

        const params = input.tools?.length
          ? {
              ...baseParams,
              tools: mapToolsToOpenAi(input.tools),
              tool_choice: mapToolChoiceToOpenAi(input.toolChoice),
            }
          : baseParams;

        const response = options?.signal
          ? await client.chat.completions.create(params, {
              signal: options.signal,
            })
          : await client.chat.completions.create(params);
        return parseOpenAiCompletionWithTools(response);
      } catch (error) {
        logger.warn('OpenAI chat.completions error', {
          model: modelId,
          message: error instanceof Error ? error.message : String(error),
        });
        throw toHttpException(mapOpenAiSdkError(error));
      }
    },

    stream(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): StreamResult {
      let finalChunk: OpenAI.Chat.Completions.ChatCompletionChunk | undefined;
      const toolCallAccumulator: OpenAiStreamToolCallAccumulator = new Map();

      async function* textStream(): AsyncIterable<string> {
        try {
          const messages = mapTurnsToOpenAiMessages(
            input.messages,
            input.system,
          );
          const streamParams = {
            model: modelId,
            messages,
            stream: true as const,
            ...(includeStreamUsage && {
              stream_options: { include_usage: true },
            }),
            ...mapCallOptionsToChatCompletionParams(modelId, options),
            ...(input.tools?.length && {
              tools: mapToolsToOpenAi(input.tools),
              tool_choice: mapToolChoiceToOpenAi(input.toolChoice),
            }),
          };
          const stream = options?.signal
            ? await client.chat.completions.create(streamParams, {
                signal: options.signal,
              })
            : await client.chat.completions.create(streamParams);

          for await (const chunk of stream) {
            finalChunk = chunk;
            accumulateOpenAiStreamToolCallDeltas(chunk, toolCallAccumulator);
            const delta = extractOpenAiStreamDeltaText(chunk);
            if (delta) yield delta;
          }
        } catch (error) {
          logger.warn('OpenAI chat.completions stream error', {
            model: modelId,
            message: error instanceof Error ? error.message : String(error),
          });
          throw toHttpException(mapOpenAiSdkError(error));
        }
      }
      return {
        textStream: textStream(),
        getUsageMetadata: () => {
          const usage = finalChunk?.usage;
          if (!usage) return Promise.resolve(undefined);
          return Promise.resolve({
            inputTokens: asInputTokens(usage.prompt_tokens ?? 0),
            outputTokens: asOutputTokens(usage.completion_tokens ?? 0),
            model: finalChunk?.model ?? modelId,
          });
        },

        getFinalToolCalls: () => {
          const calls = finalizeOpenAiStreamToolCalls(toolCallAccumulator);
          return Promise.resolve(calls.length ? calls : undefined);
        },
        getStopReason: () => {
          const reason = finalChunk?.choices[0]?.finish_reason;
          if (reason === 'tool_calls') return Promise.resolve('tool_calls');
          if (reason === 'length') return Promise.resolve('length');
          if (reason === 'content_filter')
            return Promise.resolve('content_filter');
          return Promise.resolve('stop');
        },
        getSystemFingerprint: () =>
          Promise.resolve(
            finalChunk?.system_fingerprint
              ? asSystemFingerprint(finalChunk.system_fingerprint)
              : undefined,
          ),
      };
    },
  };
}
