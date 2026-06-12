import type { ChatMessageDto } from '../dto/chat-message.dto';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type {
  LlmCallMessage,
  LlmCallContext,
} from '../../metrics/interfaces/metrics-backend.interface';
import { getClientConversationId } from './conversation-id';

const TOOL_CONTENT_METRICS_MAX = 200;

export function toMetricsMessages(
  messages: ChatMessageDto[],
): LlmCallMessage[] {
  const metricsMessages: LlmCallMessage[] = [];

  messages.forEach((message) => {
    if (message.role === 'user') {
      metricsMessages.push({ role: 'user', content: message.content });
    } else if (message.role === 'tool') {
      metricsMessages.push({
        role: 'tool',
        content: message.content.slice(0, TOOL_CONTENT_METRICS_MAX),
        ...(message.toolCallId && { toolCallId: message.toolCallId }),
      });
    } else if (message.role === 'assistant') {
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
  provider: string,
  modelAlias: string,
  modelId: string,
  requestId: string,
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
