import OpenAI from 'openai';
import { LoggingService } from 'src/logging/logging.service';
import {
  mapOpenAiSdkError,
  toHttpException,
} from '../../../common/errors/provider-error.mapper';
import type {
  ProviderCallOptions,
  ProviderChatInput,
  ProviderChatResponse,
  StreamResult,
} from '../../interfaces/ai-provider.interface';
import { mapCallOptionsToResponsesParams } from '../mappers/openai-params-provider.mapper';
import { mapTurnsToResponsesInput } from '../mappers/openai-responses-input-provider.mapper';
import {
  mapResponsesStopReason,
  parseOpenAiResponse,
} from '../mappers/openai-responses-provider.mapper';
import {
  extractResponsesOutputItemToolCall,
  extractResponsesStreamToolCallDone,
  registerResponsesFunctionCallItemId,
} from '../mappers/openai-responses-stream-provider.mapper';
import {
  accumulateResponsesReasoningDelta,
  extractResponsesReasoningSummaryText,
} from '../mappers/openai-responses-thinking-provider.mapper';
import { mapThinkingToResponsesReasoning } from '../mappers/openai-thinking-provider.mapper';
import {
  asToolCallId,
  asInputTokens,
  asOutputTokens,
} from '../../../common/types/branded.types';
import {
  mapToolChoiceToResponses,
  mapToolsToResponses,
} from '../mappers/openai-tools-provider.mapper';
import { mapGatewayMetadataToOpenAi } from '../mappers/openai-map-gateway-metadata';

function buildResponsesCreateParams(
  input: ProviderChatInput,
  modelId: string,
  options?: ProviderCallOptions,
) {
  const reasoning = mapThinkingToResponsesReasoning(options);
  const baseParams = {
    model: modelId,
    instructions: input.system?.trim() || undefined,
    input: mapTurnsToResponsesInput(input.messages),
    ...mapCallOptionsToResponsesParams(options),
    ...(reasoning && { reasoning }),
    ...(input.metadata &&
      Object.keys(input.metadata).length > 0 && {
        metadata: mapGatewayMetadataToOpenAi(input.metadata),
      }),
  };

  return input.tools?.length
    ? {
        ...baseParams,
        tools: mapToolsToResponses(input.tools),
        tool_choice: mapToolChoiceToResponses(input.toolChoice),
      }
    : baseParams;
}

export function createResponsesAdapter(client: OpenAI, logger: LoggingService) {
  return {
    async complete(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): Promise<ProviderChatResponse> {
      try {
        const params = buildResponsesCreateParams(input, modelId, options);
        const response = options?.signal
          ? await client.responses.create(params, { signal: options.signal })
          : await client.responses.create(params);
        const parsed = parseOpenAiResponse(response, modelId);
        const thinkingContent = extractResponsesReasoningSummaryText(
          response.output,
        );
        return {
          ...parsed,
          ...(thinkingContent && { thinkingContent }),
        };
      } catch (error) {
        logger.warn('OpenAI responses error', {
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
      let finalResponse: OpenAI.Responses.Response | undefined;
      const reasoningBuffer = { text: '' };
      const itemIdToCallId = new Map<string, string>();
      const accumulatedToolCalls = new Map<
        string,
        { name: string; args: string }
      >();

      async function* textStream(): AsyncIterable<string> {
        try {
          const params = {
            ...buildResponsesCreateParams(input, modelId, options),
            stream: true as const,
          };
          const stream = options?.signal
            ? await client.responses.create(params, {
                signal: options.signal,
              })
            : await client.responses.create(params);

          for await (const event of stream) {
            accumulateResponsesReasoningDelta(event, reasoningBuffer);

            if (event.type === 'response.completed') {
              finalResponse = event.response;
            }
            if (event.type === 'response.output_item.added') {
              registerResponsesFunctionCallItemId(event.item, itemIdToCallId);
            }
            if (event.type === 'response.function_call_arguments.done') {
              const call = extractResponsesStreamToolCallDone(
                event,
                itemIdToCallId,
              );
              accumulatedToolCalls.set(call.id, {
                name: call.name,
                args: call.arguments,
              });
            }
            if (event.type === 'response.output_item.done') {
              registerResponsesFunctionCallItemId(event.item, itemIdToCallId);
              const call = extractResponsesOutputItemToolCall(event.item);
              if (call) {
                accumulatedToolCalls.set(call.id, {
                  name: call.name,
                  args: call.arguments,
                });
              }
            }
            if (event.type === 'response.output_text.delta') {
              yield event.delta;
            }
          }
        } catch (error) {
          logger.warn('OpenAI responses stream error', {
            model: modelId,
            message: error instanceof Error ? error.message : String(error),
          });
          throw toHttpException(mapOpenAiSdkError(error));
        }
      }

      return {
        textStream: textStream(),
        getUsageMetadata: () => {
          const usage = finalResponse?.usage;
          if (!usage) return Promise.resolve(undefined);
          return Promise.resolve({
            inputTokens: asInputTokens(usage.input_tokens ?? 0),
            outputTokens: asOutputTokens(usage.output_tokens ?? 0),
            model: finalResponse?.model ?? modelId,
          });
        },
        getFinalToolCalls: () => {
          if (accumulatedToolCalls.size === 0)
            return Promise.resolve(undefined);
          return Promise.resolve(
            [...accumulatedToolCalls.entries()].map(([id, call]) => ({
              id: asToolCallId(id),
              name: call.name,
              arguments: call.args || '{}',
            })),
          );
        },
        getStopReason: () => {
          if (accumulatedToolCalls.size > 0)
            return Promise.resolve('tool_calls');
          if (!finalResponse) return Promise.resolve('stop');
          return Promise.resolve(mapResponsesStopReason(finalResponse));
        },
        getThinkingContent: () => {
          const fromFinal = extractResponsesReasoningSummaryText(
            finalResponse?.output,
          );
          return Promise.resolve(
            fromFinal ?? (reasoningBuffer.text || undefined),
          );
        },
      };
    },
  };
}
