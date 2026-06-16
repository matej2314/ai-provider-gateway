import { BadRequestException } from '@nestjs/common';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import {
  mapAnthropicContentBlockToGateway,
  mapAnthropicToolChoice,
  mapAnthropicToolsToGateway,
} from './anthropic-tools.mapper';
import type { ChatRequestDto } from '../../../chat/dto/chat-request.dto';
import type { ChatMessageDto } from '../../../chat/dto/chat-message.dto';
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
    body.top_k !== undefined ||
    body.stop_sequences !== undefined ||
    body.output_config !== undefined ||
    body.thinking !== undefined
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

    if (body.top_k !== undefined) {
      dto.params.topK = body.top_k;
    }
    if (body.stop_sequences !== undefined) {
      dto.params.stop = body.stop_sequences;
    }

    if (body.output_config !== undefined) {
      dto.params.responseFormat = {
        type:
          body.output_config.format?.type === 'json_schema'
            ? 'json_object'
            : 'text',
        jsonSchema: body.output_config.format?.schema,
      };
    }

    if (body.thinking && body.thinking.type !== 'disabled') {
      dto.params.thinkingEnabled = true;

      if (body.thinking.type === 'enabled' && body.thinking.budget_tokens) {
        dto.params.thinkingBudget = body.thinking.budget_tokens;
      }
    }

    if (body.output_config?.effort && !body.thinking) {
      dto.params.thinkingBudget = body.output_config.effort;
    }
  }

  if (body.metadata?.user_id) {
    dto.metadata = { userId: body.metadata.user_id };
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
