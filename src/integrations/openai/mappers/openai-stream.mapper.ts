import { toOpenAiCompletionId } from './openai-response.mapper';
import type { SseEvent } from 'src/chat/sse/sse-event.type';

export type OpenAiStreamState = {
  completionId: string;
  model: string;
  roleSent: boolean;
};

const COMPLETION_OBJECT = 'chat.completion.chunk';

export function createOpenAiStreamState(
  requestedModel: string,
): OpenAiStreamState {
  return {
    completionId: '',
    model: requestedModel,
    roleSent: false,
  };
}

function chunkLine(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export function mapSseEventToOpenAi(
  event: SseEvent,
  state: OpenAiStreamState,
): string[] {
  switch (event.name) {
    case 'meta':
      state.completionId = toOpenAiCompletionId(event.data.id);
      const lines: string[] = [];
      if (!state.roleSent) {
        lines.push(
          chunkLine({
            id: state.completionId,
            object: COMPLETION_OBJECT,
            created: Math.floor(Date.now() / 1000),
            model: state.model,
            choices: [
              {
                index: 0,
                delta: { role: 'assistant', content: '' },
                finish_reason: null,
              },
            ],
          }),
        );
        state.roleSent = true;
      }
      return lines;

    case 'delta':
      return [
        chunkLine({
          id: state.completionId,
          object: COMPLETION_OBJECT,
          created: Math.floor(Date.now() / 1000),
          model: state.model,
          choices: [
            {
              index: 0,
              delta: { content: event.data.text },
              finish_reason: null,
            },
          ],
        }),
      ];

    case 'done':
      return [
        chunkLine({
          id: state.completionId,
          object: COMPLETION_OBJECT,
          created: Math.floor(Date.now() / 1000),
          model: state.model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: 'stop',
            },
          ],
        }),
        'data: [DONE]\n\n',
      ];

    default:
      return [];
  }
}
