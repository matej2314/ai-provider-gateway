import type { SseEvent } from 'src/chat/sse/sse-event.type';
import { mapGatewayFinishReasonToAnthropicStopReason } from './anthropic-stop-reason.mapper';

export type AnthropicStreamState = {
  messageId: string;
  model: string;
  messageSent: boolean;
  textBlockStarted: boolean;
  blockIndex: number;
  activeToolBlockIndex: number | null;
};

export function createAnthropicStreamState(
  model: string,
): AnthropicStreamState {
  return {
    messageId: '',
    model,
    messageSent: false,
    textBlockStarted: false,
    blockIndex: 0,
    activeToolBlockIndex: null,
  };
}

function eventLine(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function nextToolBlockIndex(state: AnthropicStreamState): number {
  return state.textBlockStarted ? ++state.blockIndex : state.blockIndex++;
}

export function mapSseEventToAnthropic(
  event: SseEvent,
  state: AnthropicStreamState,
): string[] {
  switch (event.name) {
    case 'meta': {
      state.messageId = `msg_${event.data.id.replace(/^gw_/, '')}`;
      const lines: string[] = [];
      if (!state.messageSent) {
        lines.push(
          eventLine('message_start', {
            type: 'message_start',
            message: {
              id: state.messageId,
              type: 'message',
              role: 'assistant',
              content: [],
              model: state.model,
              usage: { input_tokens: 0, output_tokens: 0 },
            },
          }),
        );
        state.messageSent = true;
      }
      return lines;
    }

    case 'delta': {
      const lines: string[] = [];

      if (!state.textBlockStarted) {
        lines.push(
          eventLine('content_block_start', {
            type: 'content_block_start',
            index: state.blockIndex,
            content_block: { type: 'text', text: '' },
          }),
        );
        state.textBlockStarted = true;
      }

      lines.push(
        eventLine('content_block_delta', {
          type: 'content_block_delta',
          index: state.blockIndex,
          delta: { type: 'text_delta', text: event.data.text },
        }),
      );
      return lines;
    }

    case 'done': {
      const lines: string[] = [];
      const hasToolCalls = (event.data.toolCalls?.length ?? 0) > 0;
      const stopReason = mapGatewayFinishReasonToAnthropicStopReason(
        event.data.finishReason,
      );

      if (state.textBlockStarted) {
        lines.push(
          eventLine('content_block_stop', {
            type: 'content_block_stop',
            index: state.blockIndex,
          }),
        );
      }

      if (hasToolCalls) {
        for (const toolCall of event.data.toolCalls!) {
          const toolIndex = nextToolBlockIndex(state);
          state.activeToolBlockIndex = toolIndex;

          lines.push(
            eventLine('content_block_start', {
              type: 'content_block_start',
              index: toolIndex,
              content_block: {
                type: 'tool_use',
                id: toolCall.id,
                name: toolCall.name,
                input: {},
              },
            }),
            eventLine('content_block_delta', {
              type: 'content_block_delta',
              index: toolIndex,
              delta: {
                type: 'input_json_delta',
                partial_json: toolCall.arguments,
              },
            }),
            eventLine('content_block_stop', {
              type: 'content_block_stop',
              index: toolIndex,
            }),
          );
        }
        state.activeToolBlockIndex = null;
      }

      lines.push(
        eventLine('message_delta', {
          type: 'message_delta',
          delta: { stop_reason: stopReason, stop_sequence: null },
          usage: {
            output_tokens: event.data.usage?.outputTokens ?? 0,
          },
        }),
        eventLine('message_stop', { type: 'message_stop' }),
      );
      return lines;
    }

    default:
      return [];
  }
}
