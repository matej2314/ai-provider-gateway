import Anthropic from '@anthropic-ai/sdk';
import { LoggingService } from 'src/logging/logging.service';
import {
  mapAnthropicSdkError,
  toHttpException,
} from '../../common/errors/provider-error.mapper';
import {
  AIProvider,
  ProviderCallOptions,
  ProviderChatInput,
  ProviderChatResponse,
  StreamResult,
} from '../interfaces/ai-provider.interface';
import {
  mapToolChoiceToAnthropic,
  mapToolsToAnthropic,
  mapTurnsToAnthropicMessages,
  parseAnthropicResponseWithTools,
} from '../anthropic/anthropic-tools.mapper';
import {
  extractAnthropicThinkingContent,
  mapThinkingToAnthropic,
  resolveAnthropicOutputConfig,
} from '../anthropic/anthropic-thinking.mapper';

function mapStopSequences(
  stop: ProviderCallOptions['stop'],
): string[] | undefined {
  if (stop === undefined) return undefined;
  return Array.isArray(stop) ? stop : [stop];
}

function resolveAnthropicSamplingParams(options?: ProviderCallOptions): {
  temperature?: number;
  top_p?: number;
  top_k?: number;
} {
  if (options?.topK !== undefined) {
    return { top_k: options.topK };
  }
  if (options?.topP !== undefined) {
    return { top_p: options.topP };
  }
  if (options?.temperature !== undefined) {
    return { temperature: options.temperature };
  }

  return {};
}

export function createAnthropicProvider(
  apiKey: string,
  loggingService: LoggingService,
): AIProvider {
  if (!apiKey) {
    throw new Error('[createAnthropicProvider] API key is required.');
  }

  const client = new Anthropic({ apiKey });
  const logger = loggingService.child({ module: 'AnthropicProvider' });

  logger.info('Anthropic provider instance created.');

  return {
    async complete(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): Promise<ProviderChatResponse> {
      logger.debug('Calling model', {
        model: modelId,
      });

      try {
        const outputConfig = resolveAnthropicOutputConfig(options);
        const thinking = mapThinkingToAnthropic(options);
        const baseParams = {
          model: modelId,
          max_tokens: options?.maxOutputTokens ?? 1024,
          ...resolveAnthropicSamplingParams(options),
          stop_sequences: mapStopSequences(options?.stop),
          system: input.system,
          messages: mapTurnsToAnthropicMessages(input.messages),
          ...(outputConfig ? { output_config: outputConfig } : {}),
          ...(thinking ? { thinking } : {}),
          metadata:
            input.metadata?.userId !== undefined
              ? {
                  user_id: String(input.metadata.userId),
                }
              : undefined,
        };
        if (input.tools?.length) {
          const params = {
            ...baseParams,
            tools: mapToolsToAnthropic(input.tools),
            tool_choice: mapToolChoiceToAnthropic(input.toolChoice),
          };
          const response = await client.messages.create(params);
          return parseAnthropicResponseWithTools(response);
        }

        const response = await client.messages.create(baseParams);

        let text = '';

        for (const content of response.content) {
          if (content.type === 'text') text += content.text;
        }

        const responseThinkingContent = extractAnthropicThinkingContent(
          response.content,
        );

        return {
          text,
          model: response.model,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
          ...(responseThinkingContent
            ? { thinkingContent: responseThinkingContent }
            : {}),
        };
      } catch (error) {
        logger.warn('Error completing', {
          message: error instanceof Error ? error.message : String(error),
          model: modelId,
        });
        throw toHttpException(mapAnthropicSdkError(error));
      }
    },

    stream(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): StreamResult {
      let streamObject: ReturnType<typeof client.messages.stream> | undefined;

      async function* textStream(): AsyncIterable<string> {
        try {
          logger.debug('Streaming', { model: modelId });

          const outputConfig = resolveAnthropicOutputConfig(options);
          const thinking = mapThinkingToAnthropic(options);

          const streamParams = {
            model: modelId,
            max_tokens: options?.maxOutputTokens ?? 1024,
            ...resolveAnthropicSamplingParams(options),
            stop_sequences: mapStopSequences(options?.stop),
            system: input.system,
            messages: mapTurnsToAnthropicMessages(input.messages),
            stream: true,
            ...(input.tools?.length && {
              tools: mapToolsToAnthropic(input.tools),
              tool_choice: mapToolChoiceToAnthropic(input.toolChoice),
            }),
            ...(outputConfig ? { output_config: outputConfig } : {}),
            ...(thinking ? { thinking } : {}),
            metadata:
              input.metadata?.userId !== undefined
                ? {
                    user_id: String(input.metadata.userId),
                  }
                : undefined,
          };

          streamObject = client.messages.stream(streamParams);

          for await (const event of streamObject) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              yield event.delta.text;
            }
          }
        } catch (error) {
          logger.warn('Error streaming', {
            message: error instanceof Error ? error.message : String(error),
            model: modelId,
          });
          throw toHttpException(mapAnthropicSdkError(error));
        }
      }

      async function getUsageMetadata() {
        if (!streamObject) return undefined;

        try {
          const finalMessage = await streamObject.finalMessage();
          return {
            inputTokens: finalMessage.usage.input_tokens,
            outputTokens: finalMessage.usage.output_tokens,
            model: finalMessage.model,
          };
        } catch (error) {
          logger.warn('Error getting stream usage metadata', {
            message: error instanceof Error ? error.message : String(error),
          });
          return undefined;
        }
      }
      async function getUsageDetails() {
        if (!streamObject) return undefined;
        try {
          const finalMessage = await streamObject.finalMessage();
          return parseAnthropicResponseWithTools(finalMessage).usageDetails;
        } catch (error) {
          logger.warn('Error getting stream usage details', {
            message: error instanceof Error ? error.message : String(error),
          });
          return undefined;
        }
      }

      async function getFinalToolCalls() {
        if (!streamObject) return undefined;
        const finalMessage = await streamObject.finalMessage();
        return parseAnthropicResponseWithTools(finalMessage).toolCalls;
      }

      async function getStopReason() {
        if (!streamObject) return undefined;
        const finalMessage = await streamObject.finalMessage();
        const mapped = parseAnthropicResponseWithTools(finalMessage);
        return mapped.stopReason;
      }

      async function getThinkingContent() {
        if (!streamObject) return undefined;
        const finalMessage = await streamObject.finalMessage();
        return extractAnthropicThinkingContent(finalMessage.content);
      }

      return {
        textStream: textStream(),
        getUsageMetadata: getUsageMetadata,
        getUsageDetails: getUsageDetails,
        getFinalToolCalls: getFinalToolCalls,
        getStopReason: getStopReason,
        getThinkingContent: getThinkingContent,
      };
    },
  };
}
