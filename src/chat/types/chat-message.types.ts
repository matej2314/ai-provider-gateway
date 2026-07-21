import type { GatewayToolCallDto } from '../../common/dtos/gateway-tool-call.dto';
import type { ChatMessageDto } from '../dto/chat-message.dto';

export type ChatUserMessage = {
  role: 'user';
  content: string;
};

export type ChatAssistantMessage = {
  role: 'assistant';
  content: string;
  toolCalls?: GatewayToolCallDto[];
};

export type ChatToolMessage = {
  role: 'tool';
  toolCallId: string;
  content: string;
};

export type ChatMessage =
  | ChatUserMessage
  | ChatAssistantMessage
  | ChatToolMessage;

export function isChatUserMessage(m: ChatMessageDto): m is ChatUserMessage {
  return m.role === 'user';
}

export function isChatAssistantMessage(
  m: ChatMessageDto,
): m is ChatAssistantMessage {
  return m.role === 'assistant';
}

export function isChatToolMessage(m: ChatMessageDto): m is ChatToolMessage {
  return m.role === 'tool' && !!m.toolCallId;
}
