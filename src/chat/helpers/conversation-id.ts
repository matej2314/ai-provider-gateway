import { ChatRequestDto } from '../dto/chat-request.dto';
import { v4 as uuidv4 } from 'uuid';
import { type ConversationId } from '../../common/types/branded.types';
import { createConversationId } from '../../common/types/branded.guards';

export function getClientConversationId(
  requestBody: ChatRequestDto,
): ConversationId | undefined {
  const id = requestBody.conversationId?.trim();
  if (!id) return undefined;
  return createConversationId(id);
}

export function getOrCreateConversationIdForResponse(
  requestBody: ChatRequestDto,
): ConversationId {
  return (
    getClientConversationId(requestBody) ??
    createConversationId(`conv_${uuidv4()}`)
  );
}
