import { mapOpenAiMessagesToGateway } from './openai-messages.mapper';
import {
  mapOpenAiToolChoice,
  mapOpenAiToolsToGateway,
} from './openai-tools.mapper';
import type { ChatRequestDto } from 'src/chat/dto/chat-request.dto';
import type { OpenAiChatCompletionRequestDto } from '../dtos/openai-chat-completion-request.dto';

export function mapOpenAiChatRequestToGateway(
  body: OpenAiChatCompletionRequestDto,
): ChatRequestDto {
  const messages = mapOpenAiMessagesToGateway(body.messages);

  const dto: ChatRequestDto = {
    modelAlias: body.model,
    messages,
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

  const definitions = body.tools?.length
    ? mapOpenAiToolsToGateway(body.tools)
    : undefined;
  const toolChoice = mapOpenAiToolChoice(body.tool_choice);

  if (definitions?.length || toolChoice !== undefined) {
    dto.tooling = {
      ...(definitions?.length && { definitions }),
      ...(toolChoice !== undefined && { toolChoice }),
    };
  }
  return dto;
}
