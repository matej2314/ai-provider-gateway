import type { ChatRequestDto } from '../dto/chat-request.dto';
import type {
  CacheIdentityMessage,
  ChatCacheIdentity,
} from '../../cache/types/chat-cache-identity.type';
import type { ProviderCallOptions } from '../../providers/interfaces/ai-provider.interface';
import { asModelAlias, type ClientId } from '../../common/types/branded.types';

export function toChatCacheIdentity(
  request: ChatRequestDto,
  clientId: ClientId,
  callParams?: ProviderCallOptions,
): ChatCacheIdentity {
  const messages: CacheIdentityMessage[] = request.messages.map((message) => {
    const mapped: CacheIdentityMessage = {
      role: message.role,
      content: message.content,
    };
    if (message.toolCallId !== undefined) {
      mapped.toolCallId = message.toolCallId;
    }
    if (message.toolCalls !== undefined) {
      mapped.toolCalls = message.toolCalls.map((call) => ({
        id: call.id,
        name: call.name,
        arguments: call.arguments,
      }));
    }
    return mapped;
  });

  return {
    modelAlias: asModelAlias(request.modelAlias),
    clientId,
    messages,
    ...(callParams !== undefined && { callParams }),
  };
}
