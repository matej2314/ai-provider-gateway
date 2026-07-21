import {
  isChatToolMessage,
  isChatUserMessage,
  isChatAssistantMessage,
} from '../types/chat-message.types';

import { getClientConversationId } from './conversation-id';
import type { LlmCallObservation } from '../../observability/ai-metrics/interfaces/ai-metrics-backend.interface';
import type { ProviderChatResponse } from '../../providers/interfaces/ai-provider.interface';
import type { ResolvedProviderConfig } from '../../providers/provider-registry.service';
import type {
  AppProviderCallContext,
  AppRequestMethod,
  AppTokenUsage,
} from '../../observability/app-metrics/interfaces/app-metrics-backend.interface';
import type { ChatMessageDto } from '../dto/chat-message.dto';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type {
  LlmCallMessage,
  LlmCallContext,
} from '../../observability/ai-metrics/interfaces/ai-metrics-backend.interface';
import {
  asToolCallId,
  asClientId,
  asProviderInstanceId,
  asInputTokens,
  asOutputTokens,
  type RequestId,
  type ProviderInstanceId,
  type ModelAlias,
  type ModelId,
  type ClientId,
} from '../../common/types/branded.types';

const TOOL_CONTENT_METRICS_MAX = 200;

export function toMetricsMessages(
  messages: ChatMessageDto[],
): LlmCallMessage[] {
  const metricsMessages: LlmCallMessage[] = [];

  messages.forEach((message) => {
    if (isChatUserMessage(message)) {
      metricsMessages.push({ role: 'user', content: message.content });
    } else if (isChatToolMessage(message)) {
      metricsMessages.push({
        role: 'tool',
        content: message.content.slice(0, TOOL_CONTENT_METRICS_MAX),
        ...(isChatToolMessage(message) && {
          toolCallId: asToolCallId(message.toolCallId),
        }),
      });
    } else if (isChatAssistantMessage(message)) {
      metricsMessages.push({
        role: 'assistant',
        content: message.content,
        ...(message.toolCalls?.length
          ? {
              toolCallsCount: message.toolCalls.length,
            }
          : {}),
      });
    }
  });

  return metricsMessages;
}

export function buildLlmMetricsContext(
  requestBody: ChatRequestDto,
  provider: ProviderInstanceId,
  modelAlias: ModelAlias,
  modelId: ModelId,
  requestId: RequestId,
): LlmCallContext {
  return {
    provider,
    modelAlias,
    modelId,
    requestId,
    conversationId: getClientConversationId(requestBody),
    messages: toMetricsMessages(requestBody.messages),
    ...(requestBody.metadata && { metadata: requestBody.metadata }),
  };
}

export function buildAppProviderMetricsContext(
  method: AppRequestMethod,
  resolved: ResolvedProviderConfig,
  alias: ModelAlias,
  clientId: ClientId,
): AppProviderCallContext {
  return {
    method,
    provider: asProviderInstanceId(resolved.providerName),
    model: alias,
    client: asClientId(clientId),
  };
}

export function mapProviderResponseToUsage(
  response: ProviderChatResponse,
): AppTokenUsage | undefined {
  if (!response.usage) return undefined;
  return {
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
  };
}

export function mapProviderResponseToAiObservation(
  response: ProviderChatResponse,
): LlmCallObservation {
  return {
    responseModel: response.model,
    outputText: response.text || undefined,
    usage: response.usage
      ? {
          inputTokens: asInputTokens(response.usage.inputTokens),
          outputTokens: asOutputTokens(response.usage.outputTokens),
        }
      : undefined,
  };
}
