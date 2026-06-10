import { GoogleGenAI } from '@google/genai';
import { LoggingService } from 'src/logging/logging.service';
import {
  mapGoogleGenAiError,
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
  mapToolsToGemini,
  mapToolChoiceToGemini,
  mapTurnsToGeminiContents,
  parseGeminiResponseWithTools,
} from '../google/google-tools.mapper';

export function createGoogleProvider(
  apiKey: string,
  loggingService: LoggingService,
): AIProvider {
  if (!apiKey) {
    throw new Error('[createGoogleProvider] API key is required.');
  }

  const client = new GoogleGenAI({ apiKey });
  const logger = loggingService.child({ module: 'GoogleProvider' });

  logger.info('Google provider instance created.');

  return {
    async complete(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): Promise<ProviderChatResponse> {
      logger.debug('Calling model', {
        model: modelId,
        messagesCount: input.messages.length,
      });

      try {
        if (input.tools?.length) {
          const toolChoiceConfig = mapToolChoiceToGemini(input.toolChoice);
          const response = await client.models.generateContent({
            model: modelId,
            contents: mapTurnsToGeminiContents(input.messages),
            config: {
              ...(input.system?.trim()
                ? { systemInstruction: input.system }
                : {}),
              temperature: options?.temperature ?? undefined,
              maxOutputTokens: options?.maxOutputTokens ?? 1024,
              tools: [{ functionDeclarations: mapToolsToGemini(input.tools) }],
              ...(toolChoiceConfig && {
                toolConfig: { functionCallingConfig: toolChoiceConfig },
              }),
            },
          });
          return parseGeminiResponseWithTools(response, modelId);
        }

        const response = await client.models.generateContent({
          model: modelId,
          contents: mapTurnsToGeminiContents(input.messages),
          config: {
            ...(input.system?.trim()
              ? { systemInstruction: input.system }
              : {}),
            temperature: options?.temperature ?? undefined,
            maxOutputTokens: options?.maxOutputTokens ?? 1024,
          },
        });

        return {
          text: response.text ?? '',
          model: response.modelVersion ?? modelId,
          usage: response.usageMetadata
            ? {
                inputTokens: response.usageMetadata.promptTokenCount ?? 0,
                outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
              }
            : undefined,
        };
      } catch (error) {
        logger.warn('Error completing', {
          message: error instanceof Error ? error.message : String(error),
          model: modelId,
        });
        throw toHttpException(mapGoogleGenAiError(error));
      }
    },

    stream(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): StreamResult {
      let lastChunk: Awaited<
        ReturnType<typeof client.models.generateContentStream>
      > extends AsyncIterable<infer T>
        ? T
        : never;

      async function* textStream(): AsyncIterable<string> {
        try {
          logger.debug('Streaming', {
            model: modelId,
            messagesCount: input.messages.length,
          });

          const toolChoiceConfig = input.tools?.length
            ? mapToolChoiceToGemini(input.toolChoice)
            : undefined;

          const stream = await client.models.generateContentStream({
            model: modelId,
            contents: mapTurnsToGeminiContents(input.messages),
            config: {
              ...(input.system?.trim()
                ? { systemInstruction: input.system }
                : {}),
              temperature: options?.temperature ?? undefined,
              maxOutputTokens: options?.maxOutputTokens ?? 1024,
              ...(input.tools?.length && {
                tools: [
                  { functionDeclarations: mapToolsToGemini(input.tools) },
                ],
                ...(toolChoiceConfig && {
                  toolConfig: { functionCallingConfig: toolChoiceConfig },
                }),
              }),
            },
          });

          for await (const event of stream) {
            lastChunk = event;
            if (event.text) {
              yield event.text;
            }
          }
        } catch (error) {
          logger.warn('Error streaming', {
            message: error instanceof Error ? error.message : String(error),
            model: modelId,
          });
          throw toHttpException(mapGoogleGenAiError(error));
        }
      }
      async function getUsageMetadata() {
        if (!lastChunk) return undefined;

        const metadata = lastChunk.usageMetadata;
        if (!metadata) return undefined;

        return {
          inputTokens: metadata.promptTokenCount ?? 0,
          outputTokens: metadata.candidatesTokenCount ?? 0,
          model: lastChunk.modelVersion ?? modelId,
        };
      }

      async function getFinalToolCalls() {
        if (!lastChunk) return undefined;
        const parsed = parseGeminiResponseWithTools(lastChunk, modelId);
        return parsed.toolCalls;
      }

      async function getStopReason() {
        if (!lastChunk) return undefined;
        const parsed = parseGeminiResponseWithTools(lastChunk, modelId);
        return parsed.stopReason;
      }

      return {
        textStream: textStream(),
        getUsageMetadata,
        getFinalToolCalls,
        getStopReason,
      };
    },
  };
}
