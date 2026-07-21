import { GoogleGenAI, ThinkingLevel } from '@google/genai';
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
  extractGeminiThinkingContent,
} from '../google/google-tools.mapper';
import {
  asInputTokens,
  asOutputTokens,
  type ProviderApiKey,
} from 'src/common/types/branded.types';

function mapStopSequences(
  stop: ProviderCallOptions['stop'],
): string[] | undefined {
  if (stop === undefined) return undefined;
  return Array.isArray(stop) ? stop : [stop];
}

function buildGenerationConfig(
  options?: ProviderCallOptions,
  modelId?: string,
) {
  return {
    temperature: options?.temperature ?? undefined,
    maxOutputTokens: options?.maxOutputTokens ?? 1024,
    topP: options?.topP,
    topK: options?.topK,
    stopSequences: mapStopSequences(options?.stop),
    seed: options?.seed,
    response_format:
      options?.responseFormat?.type === 'json_object'
        ? 'application/json'
        : undefined,
    response_schema: options?.responseFormat?.jsonSchema,

    ...(options?.thinkingEnabled &&
      modelId?.startsWith('gemini-3') && {
        thinkingConfig: {
          includeThoughts: true,
          ...(typeof options.thinkingBudget === 'number'
            ? {
                thinkingBudget: options.thinkingBudget,
                thinkingLevel: ThinkingLevel.HIGH,
              }
            : typeof options.thinkingBudget === 'string'
              ? {
                  thinkingLevel: mapThinkingBudgetToGeminiLevel(
                    options.thinkingBudget,
                  ),
                }
              : {
                  thinkingLevel: ThinkingLevel.HIGH,
                }),
        },
      }),
    ...(options?.signal ? { abortSignal: options.signal } : {}),
  };
}

function mapThinkingBudgetToGeminiLevel(budget: string): ThinkingLevel {
  const map: Record<string, ThinkingLevel> = {
    none: ThinkingLevel.MINIMAL,
    minimal: ThinkingLevel.MINIMAL,
    low: ThinkingLevel.LOW,
    medium: ThinkingLevel.MEDIUM,
    high: ThinkingLevel.HIGH,
    xhigh: ThinkingLevel.HIGH,
    max: ThinkingLevel.HIGH,
  };
  return map[budget] ?? ThinkingLevel.HIGH;
}

export function createGoogleProvider(
  apiKey: ProviderApiKey,
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

      if (options?.thinkingEnabled && !modelId.startsWith('gemini-3')) {
        logger.warn('ThinkingConfig requested but model does not support it.', {
          model: modelId,
          note: 'ThinkingConfig requires Gemini 3.0+ model.',
        });
      }

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
              ...buildGenerationConfig(options, modelId),
              tools: [{ functionDeclarations: mapToolsToGemini(input.tools) }],
              ...(toolChoiceConfig && {
                toolConfig: { functionCallingConfig: toolChoiceConfig },
              }),
            },
          });
          const parsedResponse = parseGeminiResponseWithTools(
            response,
            modelId,
          );

          // Extract thinking content from response (if includeThoughts=true)
          let thinkingContent: string | undefined = undefined;
          if (options?.thinkingEnabled && modelId.startsWith('gemini-3')) {
            thinkingContent = extractGeminiThinkingContent(response);
          }

          return {
            ...parsedResponse,
            ...(thinkingContent && { thinkingContent }),
          };
        }

        const response = await client.models.generateContent({
          model: modelId,
          contents: mapTurnsToGeminiContents(input.messages),
          config: {
            ...(input.system?.trim()
              ? { systemInstruction: input.system }
              : {}),
            ...buildGenerationConfig(options, modelId),
          },
        });

        // Extract thinking content from response (non-tool path)
        let thinkingContent: string | undefined = undefined;
        if (options?.thinkingEnabled && modelId.startsWith('gemini-3')) {
          thinkingContent = extractGeminiThinkingContent(response);
        }

        return {
          text: response.text ?? '',
          model: response.modelVersion ?? modelId,
          usage: response.usageMetadata
            ? {
                inputTokens: asInputTokens(
                  response.usageMetadata.promptTokenCount ?? 0,
                ),
                outputTokens: asOutputTokens(
                  response.usageMetadata.candidatesTokenCount ?? 0,
                ),
              }
            : undefined,
          ...(thinkingContent && { thinkingContent }),
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

      // Accumulate thinking content during streaming
      const accumulatedThinkingContent: string[] = [];

      async function* textStream(): AsyncIterable<string> {
        try {
          logger.debug('Streaming', {
            model: modelId,
            messagesCount: input.messages.length,
          });

          if (options?.thinkingEnabled && !modelId.startsWith('gemini-3')) {
            logger.warn(
              'ThinkingConfig requested but model does not support it.',
              {
                model: modelId,
                note: 'ThinkingConfig requires Gemini 3.0+ model.',
              },
            );
          }

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
              ...buildGenerationConfig(options, modelId),
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

            if (options?.thinkingEnabled && modelId.startsWith('gemini-3')) {
              const thoughtText = extractGeminiThinkingContent(event);
              if (thoughtText) {
                accumulatedThinkingContent.push(thoughtText);
              }
            }

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
      function getUsageMetadata() {
        if (!lastChunk) return Promise.resolve(undefined);

        const metadata = lastChunk.usageMetadata;
        if (!metadata) return Promise.resolve(undefined);

        return Promise.resolve({
          inputTokens: asInputTokens(metadata.promptTokenCount ?? 0),
          outputTokens: asOutputTokens(metadata.candidatesTokenCount ?? 0),
          model: lastChunk.modelVersion ?? modelId,
        });
      }

      function getFinalToolCalls() {
        if (!lastChunk) return Promise.resolve(undefined);
        const parsed = parseGeminiResponseWithTools(lastChunk, modelId);
        return Promise.resolve(parsed.toolCalls);
      }

      function getStopReason() {
        if (!lastChunk) return Promise.resolve(undefined);
        const parsed = parseGeminiResponseWithTools(lastChunk, modelId);
        return Promise.resolve(parsed.stopReason);
      }

      function getThinkingContent() {
        if (!options?.thinkingEnabled || !modelId.startsWith('gemini-3')) {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(
          accumulatedThinkingContent.length > 0
            ? accumulatedThinkingContent.join('\n')
            : undefined,
        );
      }

      return {
        textStream: textStream(),
        getUsageMetadata,
        getFinalToolCalls,
        getStopReason,
        getThinkingContent,
      };
    },
  };
}
