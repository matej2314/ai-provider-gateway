import { BadRequestException } from '@nestjs/common';
import { ApiErrorCode } from 'src/common/errors/api-error.code';
import {
  mapAnthropicContentBlockToGateway,
  mapAnthropicToolChoice,
  mapAnthropicToolsToGateway,
} from './anthropic-tools.mapper';
import type { ChatRequestDto } from 'src/chat/dto/chat-request.dto';
import type { ChatMessageDto } from 'src/chat/dto/chat-message.dto';
import type { AnthropicMessagesRequestDto } from '../dtos/anthropic-messages-request.dto';

export function mapAnthropicRequestToGateway(
  body: AnthropicMessagesRequestDto,
): ChatRequestDto {
  const gatewayMessages: ChatMessageDto[] = [];

  for (const message of body.messages) {
    const mapped = mapAnthropicContentBlockToGateway(
      message.role,
      message.content,
    );
    gatewayMessages.push(...mapped);
  }

  if (gatewayMessages.length === 0) {
    throw new BadRequestException({
      code: ApiErrorCode.VALIDATION_FAILED,
      message: 'At least one message is required.',
      details: [],
    });
  }

  const dto: ChatRequestDto = {
    modelAlias: body.model,
    messages: gatewayMessages,
  };

  if (
    body.temperature !== undefined ||
    body.max_tokens !== undefined ||
    body.top_p !== undefined ||
    body.stop_sequences !== undefined
  ) {
    dto.params = {};
    if (body.temperature !== undefined) {
      dto.params.temperature = body.temperature;
    }
    if (body.max_tokens !== undefined) {
      dto.params.maxOutputTokens = body.max_tokens;
    }
    if (body.top_p !== undefined) {
      dto.params.topP = body.top_p;
    }
    if (body.stop_sequences !== undefined) {
      dto.params.stop = body.stop_sequences;
    }
  }

  const definitions = body.tools?.length
    ? mapAnthropicToolsToGateway(body.tools)
    : undefined;
  const toolChoice = mapAnthropicToolChoice(body.tool_choice);

  if (definitions?.length || toolChoice !== undefined) {
    dto.tooling = {
      ...(definitions?.length && { definitions }),
      ...(toolChoice !== undefined && { toolChoice }),
    };
  }
  return dto;
}
