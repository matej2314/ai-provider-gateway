import { BadRequestException } from '@nestjs/common';
import { ApiErrorCode } from 'src/common/errors/api-error.code';
import type { ChatRequestDto } from 'src/chat/dto/chat-request.dto';
import type { ChatMessageDto } from 'src/chat/dto/chat-message.dto';
import type { OpenAiChatCompletionRequestDto } from '../dtos/openai-chat-completion-request.dto';

function assertStringContent(
  content: unknown,
  index: number,
): asserts content is string {
  if (typeof content !== 'string') {
    throw new BadRequestException({
      code: ApiErrorCode.VALIDATION_FAILED,
      message: `messages[${index}].content must be a string`,
      details: [],
    });
  }
}

/**
 * - `system` / `tool` — omitted (system prompt only from gateway config).
 * - only `user` / `assistant` are mapped to ChatRequestDto.
 */
export function mapOpenAiChatRequestToGateway(
  body: OpenAiChatCompletionRequestDto,
): ChatRequestDto {
  const gatewayMessages: ChatMessageDto[] = [];

  body.messages.forEach((message, index) => {
    assertStringContent(message.content, index);

    if (message.role === 'system' || message.role === 'tool') return;

    if (message.role === 'user' || message.role === 'assistant') {
      gatewayMessages.push({ role: message.role, content: message.content });
    }
  });

  if (gatewayMessages.length === 0) {
    throw new BadRequestException({
      code: ApiErrorCode.VALIDATION_FAILED,
      message:
        'At least one user or assistant message is required after filtering',
      details: [],
    });
  }

  const dto: ChatRequestDto = {
    modelAlias: body.model,
    messages: gatewayMessages,
  };

  if (body.temperature !== undefined || body.max_tokens !== undefined) {
    dto.params = {};
    if (body.temperature !== undefined) {
      dto.params.temperature = body.temperature;
    }

    if (body.max_tokens !== undefined) {
      dto.params.maxOutputTokens = body.max_tokens;
    }
  }
  return dto;
}
