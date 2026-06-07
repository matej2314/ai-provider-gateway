import type { ChatRequestDto } from '../dto/chat-request.dto';

export function isToolingRequest(request: ChatRequestDto): boolean {
  if ((request.tooling?.definitions?.length ?? 0) > 0) return true;
  return request.messages.some(
    (message) =>
      message.role === 'tool' || (message.toolCalls?.length ?? 0) > 0,
  );
}
