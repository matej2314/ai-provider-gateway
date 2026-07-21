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

  if (
    body.temperature !== undefined ||
    body.max_tokens !== undefined ||
    body.top_p !== undefined ||
    body.stop !== undefined ||
    body.frequency_penalty !== undefined ||
    body.presence_penalty !== undefined ||
    body.seed !== undefined ||
    body.response_format !== undefined ||
    body.max_completion_tokens !== undefined ||
    body.reasoning_effort !== undefined ||
    body.parallel_tool_calls !== undefined
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

    if (body.stop !== undefined) {
      dto.params.stop = body.stop;
    }

    if (body.frequency_penalty !== undefined) {
      dto.params.frequencyPenalty = body.frequency_penalty;
    }

    if (body.presence_penalty !== undefined) {
      dto.params.presencePenalty = body.presence_penalty;
    }

    if (body.seed !== undefined) {
      dto.params.seed = body.seed;
    }

    if (body.response_format !== undefined) {
      dto.params.responseFormat = {
        type: body.response_format.type,
      };
    }

    if (body.max_completion_tokens !== undefined) {
      dto.params.maxOutputTokens = body.max_completion_tokens;
    }

    if (body.reasoning_effort !== undefined) {
      if (body.reasoning_effort === 'none') {
        dto.params.thinkingEnabled = false;
      } else {
        dto.params.thinkingEnabled = true;
        dto.params.thinkingBudget = body.reasoning_effort;
      }
    }

    if (body.parallel_tool_calls !== undefined) {
      dto.params.parallelToolCalls = body.parallel_tool_calls;
    }
  }

  if (body.metadata) {
    dto.metadata = body.metadata;
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
