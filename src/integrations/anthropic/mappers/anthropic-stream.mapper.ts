import type { SseEvent } from 'src/chat/sse/sse-event.type';

export type AnthropicStreamState = {
  messageId: string;
  model: string;
  messageSent: boolean;
  contentBlockSent: boolean;
  blockIndex: number;
  toolBlockStarted: boolean;
};

export function createAnthropicStreamState(
  model: string,
): AnthropicStreamState {
  return {
    messageId: '',
    model,
    messageSent: false,
    contentBlockSent: false,
    blockIndex: 0,
    toolBlockStarted: false,
  };
}

function eventLine(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function mapSseEventToAnthropic(
  event: SseEvent,
  state: AnthropicStreamState,
): string[] {
  switch (event.name) {
    case 'meta':
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

      if (!state.contentBlockSent) {
        lines.push(
          eventLine('content_block_start', {
            type: 'content_block_start',
            index: 0,
            content_block: { type: 'text', text: '' },
          }),
        );
        state.contentBlockSent = true;
      }
      return lines;

    case 'delta':
      return [
        eventLine('content_block_delta', {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: event.data.text },
        }),
      ];

    case 'done': {
      const lines: string[] = [];
      const hasToolCalls = (event.data.toolCalls?.length ?? 0) > 0;
      const stopReason =
        event.data.finishReason === 'tool_calls' ? 'tool_use' : 'end_turn';

      if (state.contentBlockSent) {
        lines.push(
          eventLine('content_block_stop', {
            type: 'content_block_stop',
            index: state.blockIndex,
          }),
        );
      }

      if (hasToolCalls) {
        for (const toolCall of event.data.toolCalls!) {
          const toolIndex = state.blockIndex + 1;
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
      }

      lines.push(
        eventLine('message_delta', {
          type: 'message_delta',
          delta: { stop_reason: stopReason, stop_sequence: null },
          usage: { output_tokens: event.data.usage?.outputTokens ?? 0 },
        }),
        eventLine('message_stop', { type: 'message_stop' }),
      );
      return lines;
    }

    default:
      return [];
  }
}
