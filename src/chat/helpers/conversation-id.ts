import { ChatRequestDto } from '../dto/chat-request.dto';
import { v4 as uuidv4 } from 'uuid';

export function getClientConversationId(
  requestBody: ChatRequestDto,
): string | undefined {
  const id = requestBody.conversationId?.trim();
  return id || undefined;
}

export function getOrCreateConversationIdForResponse(
  requestBody: ChatRequestDto,
): string {
  return getClientConversationId(requestBody) ?? `conv_${uuidv4()}`;
}
