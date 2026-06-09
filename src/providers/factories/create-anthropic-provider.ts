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
        if (input.tools?.length) {
          const params = {
            model: modelId,
            max_tokens: options?.maxOutputTokens ?? 1024,
            temperature: options?.temperature,
            system: input.system,
            tools: mapToolsToAnthropic(input.tools),
            tool_choice: mapToolChoiceToAnthropic(input.toolChoice),
            messages: mapTurnsToAnthropicMessages(input.messages),
          };
          const response = await client.messages.create(params);
          return parseAnthropicResponseWithTools(response);
        }

        const response = await client.messages.create({
          model: modelId,
          max_tokens: options?.maxOutputTokens ?? 1024,
          temperature: options?.temperature ?? undefined,
          system: input.system,
          messages: mapTurnsToAnthropicMessages(input.messages),
        });

        let text = '';

        for (const content of response.content) {
          if (content.type === 'text') text += content.text;
        }

        return {
          text,
          model: response.model,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
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

          const streamParams = {
            model: modelId,
            max_tokens: options?.maxOutputTokens ?? 1024,
            temperature: options?.temperature ?? undefined,
            system: input.system,
            messages: mapTurnsToAnthropicMessages(input.messages),
            stream: true as const,
            ...(input.tools?.length && {
              tools: mapToolsToAnthropic(input.tools),
              tool_choice: mapToolChoiceToAnthropic(input.toolChoice),
            }),
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

      return {
        textStream: textStream(),
        getUsageMetadata: getUsageMetadata,
        getFinalToolCalls: getFinalToolCalls,
        getStopReason: getStopReason,
      };
    },
  };
}
