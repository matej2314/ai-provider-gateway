import { BadRequestException } from '@nestjs/common';
import { ApiErrorCode } from 'src/common/errors/api-error.code';
import type { ChatRequestDto } from 'src/chat/dto/chat-request.dto';
import type { ChatMessageDto } from 'src/chat/dto/chat-message.dto';
import type { AnthropicMessagesRequestDto } from '../dtos/anthropic-messages-request.dto';

export function mapAnthropicRequestToGateway(
  body: AnthropicMessagesRequestDto,
): ChatRequestDto {
  const gatewayMessages: ChatMessageDto[] = [];

  for (const msg of body.messages) {
    const textBlock = msg.content.find(
      (block) => block.type === 'text' && block.text,
    );
    if (!textBlock?.text) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Each message must have at least one text content block.',
        details: [],
      });
    }

    if (msg.content.some((block) => block.type === 'image')) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Image content blocks are not supported.',
        details: [],
      });
    }

    gatewayMessages.push({
      role: msg.role,
      content: textBlock.text,
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
