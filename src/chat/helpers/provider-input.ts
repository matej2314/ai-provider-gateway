import type { ResolvedSystemPrompts } from '../../config/configuration.types';
import type {
  ProviderChatInput,
  ProviderChatTurn,
} from '../../providers/interfaces/ai-provider.interface';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type { ChatMessageDto } from '../dto/chat-message.dto';
import { composeSystemPrompt } from './system-prompt';

export function toProviderTurns(
  messages: ChatMessageDto[],
): ProviderChatTurn[] {
  return messages
    .filter(
      (m): m is ProviderChatTurn => m.role === 'user' || m.role === 'assistant',
    )
    .map((m) => ({ role: m.role, content: m.content }));
}

export function buildProviderInputForAlias(
  request: ChatRequestDto,
  alias: string,
  resolvedPrompts: ResolvedSystemPrompts,
): ProviderChatInput {
  return {
    system: composeSystemPrompt(resolvedPrompts, alias),
    messages: toProviderTurns(request.messages),
  };
}
