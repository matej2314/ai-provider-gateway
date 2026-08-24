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
