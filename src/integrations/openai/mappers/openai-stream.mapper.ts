import {
  mapFinishReasontoOpenAI,
  toOpenAiCompletionId,
  mapSystemFingerprintToOpenAi,
} from './openai-response.mapper';
import type { SseDoneEvent, SseEvent } from 'src/chat/sse/sse-event.type';
import type { GatewayToolCall } from 'src/providers/types/tooling-types';

export type OpenAiStreamState = {
  completionId: string;
  model: string;
  roleSent: boolean;
  includeUsage: boolean;
  created: number;
};

const COMPLETION_OBJECT = 'chat.completion.chunk';

export function createOpenAiStreamState(
  requestedModel: string,
  includeUsage: boolean,
): OpenAiStreamState {
  return {
    completionId: '',
    model: requestedModel,
    roleSent: false,
    includeUsage,
    created: Math.floor(Date.now() / 1000),
  };
}

function buildToolCallsDelta(
  toolCalls: GatewayToolCall[],
): Record<string, unknown>[] {
  return toolCalls.map((toolCall, index) => ({
    index,
    id: toolCall.id,
    type: 'function',
    function: { name: toolCall.name, arguments: toolCall.arguments },
  }));
}

function chunkLine(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function baseChunkFields(state: OpenAiStreamState): Record<string, unknown> {
  return {
    id: state.completionId,
    object: COMPLETION_OBJECT,
    created: state.created,
    model: state.model,
  };
}

function resolveOpenAiFinishReason(
  done: SseDoneEvent,
): ReturnType<typeof mapFinishReasontoOpenAI> {
  if (done.toolCalls?.length) {
    return 'tool_calls';
  }
  if (done.finishReason) {
    return mapFinishReasontoOpenAI(done.finishReason);
  }
  return 'stop';
}

export function mapSseEventToOpenAi(
  event: SseEvent,
  state: OpenAiStreamState,
): string[] {
  switch (event.name) {
    case 'meta': {
      state.completionId = toOpenAiCompletionId(event.data.id);
      const lines: string[] = [];

      if (!state.roleSent) {
        lines.push(
          chunkLine({
            ...baseChunkFields(state),
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
    }
    case 'delta':
      return [
        chunkLine({
          ...baseChunkFields(state),
          choices: [
            {
              index: 0,
              delta: { content: event.data.text },
              finish_reason: null,
            },
          ],
        }),
      ];

    case 'done': {
      const finishReason = resolveOpenAiFinishReason(event.data);
      const lines: string[] = [];

      if (event.data.toolCalls?.length) {
        lines.push(
          chunkLine({
            ...baseChunkFields(state),
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: buildToolCallsDelta(event.data.toolCalls),
                },
                finish_reason: null,
              },
            ],
          }),
        );
      }

      const finalChunk: Record<string, unknown> = {
        ...baseChunkFields(state),
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: finishReason,
          },
        ],
      };

      if (state.includeUsage && event.data.usage) {
        const input = event.data.usage.inputTokens;
        const output = event.data.usage.outputTokens;
        finalChunk.usage = {
          prompt_tokens: input,
          completion_tokens: output,
          total_tokens: event.data.usage.totalTokens ?? input + output,
        };
      }
      Object.assign(
        finalChunk,
        mapSystemFingerprintToOpenAi(event.data.systemFingerprint),
      );

      lines.push(chunkLine(finalChunk), 'data: [DONE]\n\n');
      return lines;
    }

    default:
      return [];
  }
}
