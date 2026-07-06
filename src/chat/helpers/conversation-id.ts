import { ChatRequestDto } from '../dto/chat-request.dto';
import { v4 as uuidv4 } from 'uuid';
import {
  asConversationId,
  type ConversationId,
} from '../../common/types/branded.types';

export function getClientConversationId(
  requestBody: ChatRequestDto,
): ConversationId | undefined {
  const id = requestBody.conversationId?.trim();
  return id ? asConversationId(id) : undefined;
}

export function getOrCreateConversationIdForResponse(
  requestBody: ChatRequestDto,
): ConversationId {
  return (
    getClientConversationId(requestBody) ?? asConversationId(`conv_${uuidv4()}`)
  );
}
