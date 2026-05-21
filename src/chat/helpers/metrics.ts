import type { ChatMessageDto } from '../dto/chat-message.dto';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type { LlmCallMessage, LlmCallContext } from '../../metrics/interfaces/metrics-backend.interface';
import { getClientConversationId } from './conversation-id';

export function toMetricsMessages(messages: ChatMessageDto[]): LlmCallMessage[] {
    return messages.map((m) => ({ role: m.role, content: m.content }));
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
    };
  }