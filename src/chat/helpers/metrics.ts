import {
  isChatToolMessage,
  isChatUserMessage,
  isChatAssistantMessage,
} from '../types/chat-message.types';

import { getClientConversationId } from './conversation-id';
import type { ChatMessageDto } from '../dto/chat-message.dto';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type {
  LlmCallMessage,
  LlmCallContext,
} from '../../metrics/interfaces/metrics-backend.interface';
import {
  asToolCallId,
  type RequestId,
  type ProviderInstanceId,
  type ModelAlias,
  type ModelId,
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
