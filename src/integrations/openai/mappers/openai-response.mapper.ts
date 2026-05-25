import type { OpenAiChatCompletionResponseDto } from '../dtos/openai-chat-completion-response.dto';
import type { ChatResponseDto } from 'src/chat/dto/chat-response.dto';

export function toOpenAiCompletionId(gatewayId: string): string {
  if (gatewayId.startsWith('gw_')) {
    return `chatcmpl_${gatewayId.slice(3)}`;
  }
  return `chatcmpl_${gatewayId}`;
}

export function mapChatResponseToOpenAi(
  result: ChatResponseDto,
  requestedModel: string,
): OpenAiChatCompletionResponseDto {
  const input = result.usage?.inputTokens ?? 0;
  const output = result.usage?.outputTokens ?? 0;

  return {
    id: toOpenAiCompletionId(result.id),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: requestedModel,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: result.output.text,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: input,
      completion_tokens: output,
      total_tokens: input + output,
    },
  };
}
