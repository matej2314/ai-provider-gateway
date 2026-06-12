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
  const turns: ProviderChatTurn[] = [];

  for (const message of messages) {
    if (message.role === 'user') {
      turns.push({ role: 'user', content: message.content });
    } else if (message.role === 'assistant') {
      turns.push({
        role: 'assistant',
        content: message.content,
        ...(message.toolCalls?.length ? { toolCalls: message.toolCalls } : {}),
      });
    } else if (message.role === 'tool' && message.toolCallId) {
      turns.push({
        role: 'tool',
        toolCallId: message.toolCallId,
        content: message.content,
      });
    }
  }
  return turns;
}

export function buildProviderInputForAlias(
  request: ChatRequestDto,
  alias: string,
  resolvedPrompts: ResolvedSystemPrompts,
): ProviderChatInput {
  const input: ProviderChatInput = {
    system: composeSystemPrompt(resolvedPrompts, alias),
    messages: toProviderTurns(request.messages),
  };

  if (request.tooling?.definitions?.length) {
    input.tools = request.tooling.definitions;
    if (request.tooling.toolChoice) {
      input.toolChoice = request.tooling.toolChoice;
    }
  }

  if (request.metadata) {
    input.metadata = request.metadata;
  }

  return input;
}
