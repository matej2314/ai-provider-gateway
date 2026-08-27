import type { ChatMessageDto } from '../../chat/dto/chat-message.dto';
import type { ChatRequestDto } from '../../chat/dto/chat-request.dto';

export function lastUserMessageText(request: ChatRequestDto): string | null {
  for (let i = request.messages.length - 1; i >= 0; i -= 1) {
    const msg = request.messages[i];
    if (msg.role === 'user' && typeof msg.content === 'string') {
      const text = msg.content.trim();
      if (text.length > 0) return text;
    }
  }
  return null;
}

/**
 * Semantic cache is only safe for single-turn requests: exactly one
 * `user` message with no `assistant` or `tool` turns. Multi-turn
 * conversations embed only the last user text, so different histories
 * sharing the same final phrase would produce false hits.
 */
export function isSingleTurnUserRequest(messages: ChatMessageDto[]): boolean {
  let userCount = 0;
  for (const msg of messages) {
    if (msg.role === 'assistant' || msg.role === 'tool') return false;
    if (msg.role === 'user') userCount++;
  }
  return userCount === 1;
}
