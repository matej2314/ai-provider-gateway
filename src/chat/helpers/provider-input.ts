import { BadRequestException } from '@nestjs/common';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import {
  isChatToolMessage,
  isChatUserMessage,
  isChatAssistantMessage,
} from '../types/chat-message.types';
import { composeSystemPrompt } from './system-prompt';
import type { ResolvedSystemPrompts } from '../../config/configuration.types';
import type {
  ProviderChatInput,
  ProviderChatTurn,
} from '../../providers/interfaces/ai-provider.interface';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type { ChatMessageDto } from '../dto/chat-message.dto';
import { asToolCallId } from '../../common/types/branded.types';

export function toProviderTurns(
  messages: ChatMessageDto[],
): ProviderChatTurn[] {
  const turns: ProviderChatTurn[] = [];

  for (const message of messages) {
    if (isChatUserMessage(message)) {
      turns.push({ role: 'user', content: message.content });
    } else if (isChatAssistantMessage(message)) {
      turns.push({
        role: 'assistant',
        content: message.content,
        ...(message.toolCalls?.length ? { toolCalls: message.toolCalls } : {}),
      });
    } else if (isChatToolMessage(message)) {
      turns.push({
        role: 'tool',
        toolCallId: asToolCallId(message.toolCallId),
        content: message.content,
      });
    } else if (message.role === 'tool' && !message.toolCallId) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Tool messages must include toolCallId',
        details: [{ field: 'messages[].toolCallId' }],
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
