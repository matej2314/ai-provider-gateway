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
                thinkingLevel: 'HIGH' as any,
              }
            : typeof options.thinkingBudget === 'string'
              ? {
                  thinkingLevel: mapThinkingBudgetToGeminiLevel(
                    options.thinkingBudget,
                  ) as any,
                }
              : {
                  thinkingLevel: 'HIGH' as any,
                }),
        },
      }),
  };
}

function mapThinkingBudgetToGeminiLevel(
  budget: string,
): 'THINKING_LEVEL_UNSPECIFIED' | 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' {
  const map: Record<string, 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH'> = {
    none: 'MINIMAL',
    minimal: 'MINIMAL',
    low: 'LOW',
    medium: 'MEDIUM',
    high: 'HIGH',
    xhigh: 'HIGH',
    max: 'HIGH',
  };
  return map[budget] ?? 'HIGH';
}

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
          const parsedResponse = parseGeminiResponseWithTools(response, modelId);

          // Extract thinking content from response (if includeThoughts=true)
          let thinkingContent: string | undefined = undefined;
          if (options?.thinkingEnabled && modelId.startsWith('gemini-3')) {
            const thoughts =
              (response as any).thoughts || (response as any).thinkingContent;
            if (thoughts) {
              thinkingContent = Array.isArray(thoughts)
                ? thoughts.join('\n')
                : String(thoughts);
            }
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
          const thoughts =
            (response as any).thoughts || (response as any).thinkingContent;
          if (thoughts) {
            thinkingContent = Array.isArray(thoughts)
              ? thoughts.join('\n')
              : String(thoughts);
          }
        }

        return {
          text: response.text ?? '',
          model: response.modelVersion ?? modelId,
          usage: response.usageMetadata
            ? {
                inputTokens: response.usageMetadata.promptTokenCount ?? 0,
                outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
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
      let accumulatedThinkingContent: string[] = [];

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

            // Collect thinking content during streaming
            if (options?.thinkingEnabled && modelId.startsWith('gemini-3')) {
              const thoughts =
                (event as any).thoughts || (event as any).thinkingContent;
              if (thoughts) {
                const thoughtText = Array.isArray(thoughts)
                  ? thoughts.join('\n')
                  : String(thoughts);
                if (thoughtText) {
                  accumulatedThinkingContent.push(thoughtText);
                }
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

      async function getThinkingContent() {
        if (!options?.thinkingEnabled || !modelId.startsWith('gemini-3')) {
          return undefined;
        }
        return accumulatedThinkingContent.length > 0
          ? accumulatedThinkingContent.join('\n')
          : undefined;
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
