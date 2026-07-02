import type OpenAI from 'openai';
import type {
  ProviderAssistantTurn,
  ProviderChatTurn,
  ProviderToolResultTurn,
} from 'src/providers/interfaces/ai-provider.interface';

type ChatCompletionMessageParam =
  OpenAI.Chat.Completions.ChatCompletionMessageParam;

function mapAssistantTurn(
  turn: ProviderAssistantTurn,
): ChatCompletionMessageParam {
  if (!turn.toolCalls?.length) {
    return { role: 'assistant', content: turn.content };
  }

  return {
    role: 'assistant',
    content: turn.content || null,
    tool_calls: turn.toolCalls.map((call) => ({
      id: call.id,
      type: 'function' as const,
      function: {
        name: call.name,
        arguments: call.arguments || '{}',
      },
    })),
  };
}

export function extractOpenAiTextContent(
  content: string | null | undefined,
): string {
  return content ?? '';
}

export function mapTurnsToOpenAiMessages(
  turns: ProviderChatTurn[],
  system?: string,
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  if (system?.trim()) {
    messages.push({ role: 'system', content: system });
  }

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];

    switch (turn.role) {
      case 'user':
        messages.push({ role: 'user', content: turn.content });
        continue;
      case 'assistant':
        messages.push(mapAssistantTurn(turn));
        continue;
      case 'tool': {
        const toolResults: ChatCompletionMessageParam[] = [
          {
            role: 'tool',
            tool_call_id: turn.toolCallId,
            content: turn.content,
          },
        ];
        while (i + 1 < turns.length && turns[i + 1].role === 'tool') {
          i++;
          const next = turns[i] as ProviderToolResultTurn;
          toolResults.push({
            role: 'tool',
            tool_call_id: next.toolCallId,
            content: next.content,
          });
        }
        messages.push(...toolResults);
        break;
      }
    }
  }
  return messages;
}
