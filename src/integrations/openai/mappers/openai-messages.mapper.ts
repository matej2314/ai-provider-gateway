import { BadRequestException } from '@nestjs/common';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import type { ChatMessageDto } from '../../../chat/dto/chat-message.dto';
import type { GatewayToolCall } from '../../../providers/types/tooling-types';
import type { OpenAiChatMessageDto } from '../dtos/openai-chat-message.dto';
import { asToolCallId } from '../../../common/types/branded.types';

export function mapOpenAiToolCalls(raw: unknown[]): GatewayToolCall[] {
  const toolCalls: GatewayToolCall[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;

    const call = item as {
      id?: string;
      type?: string;
      function?: { name?: string; arguments?: string };
    };
    if (call.type !== 'function' || !call.id || !call.function?.name) continue;

    toolCalls.push({
      id: asToolCallId(call.id),
      name: call.function.name,
      arguments: call.function.arguments ?? '{}',
    });
  }
  return toolCalls;
}

export function mapOpenAiMessagesToGateway(
  messages: OpenAiChatMessageDto[],
): ChatMessageDto[] {
  const gatewayMessages: ChatMessageDto[] = [];

  for (const message of messages) {
    switch (message.role) {
      case 'system':
        continue;
      case 'user':
        gatewayMessages.push({ role: 'user', content: message.content });
        break;
      case 'assistant': {
        const toolCalls = message.tool_calls?.length
          ? mapOpenAiToolCalls(message.tool_calls)
          : undefined;
        gatewayMessages.push({
          role: 'assistant',
          content: message.content,
          ...(toolCalls?.length && { toolCalls }),
        });
        break;
      }
      case 'tool':
        if (!message.tool_call_id) {
          throw new BadRequestException({
            code: ApiErrorCode.VALIDATION_FAILED,
            message: 'Tool messages must include tool_call_id',
            details: [],
          });
        }
        gatewayMessages.push({
          role: 'tool',
          toolCallId: message.tool_call_id,
          content: message.content,
        });
        break;
    }
  }

  if (gatewayMessages.length === 0) {
    throw new BadRequestException({
      code: ApiErrorCode.VALIDATION_FAILED,
      message:
        'At least one user, assistant or tool message is required after filtering.',
      details: [],
    });
  }
  return gatewayMessages;
}
