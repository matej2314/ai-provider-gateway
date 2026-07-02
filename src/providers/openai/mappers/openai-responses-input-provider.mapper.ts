import type OpenAI from 'openai';
import type {
  ProviderAssistantTurn,
  ProviderChatTurn,
  ProviderToolResultTurn,
} from 'src/providers/interfaces/ai-provider.interface';

function mapAssistantTurnToResponsesInput(
  turn: ProviderAssistantTurn,
): OpenAI.Responses.ResponseInputItem[] {
  const items: OpenAI.Responses.ResponseInputItem[] = [];

  if (turn.content) {
    items.push({ role: 'assistant', content: turn.content });
  }

  if (turn.toolCalls?.length) {
    for (const call of turn.toolCalls) {
      items.push({
        type: 'function_call',
        call_id: call.id,
        name: call.name,
        arguments: call.arguments || '{}',
      });
    }
  }

  return items;
}

export function mapTurnsToResponsesInput(
  turns: ProviderChatTurn[],
): OpenAI.Responses.ResponseInput {
  const items: OpenAI.Responses.ResponseInputItem[] = [];

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];

    switch (turn.role) {
      case 'user':
        items.push({ role: 'user', content: turn.content });
        continue;
      case 'assistant':
        items.push(...mapAssistantTurnToResponsesInput(turn));
        continue;
      case 'tool': {
        items.push({
          type: 'function_call_output',
          call_id: turn.toolCallId,
          output: turn.content,
        });
        while (i + 1 < turns.length && turns[i + 1].role === 'tool') {
          i++;
          const next = turns[i] as ProviderToolResultTurn;
          items.push({
            type: 'function_call_output',
            call_id: next.toolCallId,
            output: next.content,
          });
        }
        break;
      }
    }
  }

  return items;
}
