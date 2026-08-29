import type { CacheIdentityMessage } from '../types/chat-cache-identity.type';

export function lastUserMessageText(
  messages: readonly CacheIdentityMessage[],
): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg?.role === 'user' && typeof msg.content === 'string') {
      const text = msg.content.trim();
      if (text.length > 0) return text;
    }
  }
  return null;
}

export function isSingleTurnUserRequest(
  messages: readonly CacheIdentityMessage[],
): boolean {
  let userCount = 0;
  for (const msg of messages) {
    if (msg.role === 'assistant' || msg.role === 'tool') return false;
    if (msg.role === 'user') userCount++;
  }
  return userCount === 1;
}
