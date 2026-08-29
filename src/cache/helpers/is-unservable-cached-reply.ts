import type { CachedChatResponse } from '../types/cached-chat-response.type';

export function isUnservableCachedReply(parsed: CachedChatResponse): boolean {
  if (parsed.finishReason !== 'stop') return true;
  return parsed.output.text.trim().length === 0;
}
