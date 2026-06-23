jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import {
  createAnthropicStreamState,
  mapSseEventToAnthropic,
} from './anthropic-stream.mapper';
import type { SseEvent } from '../../../chat/sse/sse-event.type';

describe('anthropic-stream.mapper', () => {
  it('createAnthropicStreamState should initialize state', () => {
    expect(createAnthropicStreamState('claude-sonnet-4-5')).toEqual({
      messageId: '',
      model: 'claude-sonnet-4-5',
      messageSent: false,
      textBlockStarted: false,
      blockIndex: 0,
      activeToolBlockIndex: null,
    });
  });

  describe('meta', () => {
    it('should emit message_start once and convert gw_ id to msg_', () => {
      const state = createAnthropicStreamState('claude-sonnet-4-5');
      const lines = mapSseEventToAnthropic(
        { name: 'meta', data: { id: 'gw_abc123' } } as SseEvent,
        state,
      );

      expect(state.messageId).toBe('msg_abc123');
      expect(state.messageSent).toBe(true);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('event: message_start');
      expect(lines[0]).toContain('"id":"msg_abc123"');
    });

    it('should not emit message_start when messageSent is already true', () => {
      const state = createAnthropicStreamState('claude-sonnet-4-5');
      state.messageSent = true;

      const lines = mapSseEventToAnthropic(
        { name: 'meta', data: { id: 'gw_xyz' } } as SseEvent,
        state,
      );

      expect(lines).toEqual([]);
      expect(state.messageId).toBe('msg_xyz');
    });
  });

  describe('delta', () => {
    it('should emit content_block_start before first text delta', () => {
      const state = createAnthropicStreamState('claude-sonnet-4-5');
      state.messageSent = true;

      const lines = mapSseEventToAnthropic(
        { name: 'delta', data: { text: 'Hello' } },
        state,
      );

      expect(state.textBlockStarted).toBe(true);
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('event: content_block_start');
      expect(lines[1]).toContain('event: content_block_delta');
      expect(lines[1]).toContain('"text":"Hello"');
    });
  });

  describe('done', () => {
    it('should close text block and emit message_delta + message_stop', () => {
      const state = createAnthropicStreamState('claude-sonnet-4-5');
      state.messageId = 'msg_123';
      state.messageSent = true;
      state.textBlockStarted = true;

      const lines = mapSseEventToAnthropic(
        {
          name: 'done',
          data: {
            finishReason: 'stop',
            usage: { inputTokens: 10, outputTokens: 20 },
          },
        },
        state,
      );

      expect(lines[0]).toContain('event: content_block_stop');
      expect(lines[1]).toContain('event: message_delta');
      expect(lines[1]).toContain('"stop_reason":"end_turn"');
      expect(lines[1]).toContain('"output_tokens":20');
      expect(lines[2]).toContain('event: message_stop');
    });

    it('should emit tool_use blocks with incremental indices', () => {
      const state = createAnthropicStreamState('claude-sonnet-4-5');
      state.messageSent = true;
      state.textBlockStarted = true;

      const lines = mapSseEventToAnthropic(
        {
          name: 'done',
          data: {
            toolCalls: [
              { id: 'call_1', name: 'tool1', arguments: '{}' },
              { id: 'call_2', name: 'tool2', arguments: '{"x":1}' },
            ],
            usage: { outputTokens: 10 },
          },
        } as SseEvent,
        state,
      );

      const starts = lines.filter((l) => l.includes('content_block_start'));
      expect(starts).toHaveLength(2);
      expect(starts[0]).toContain('"index":1');
      expect(starts[1]).toContain('"index":2');
      expect(lines.some((l) => l.includes('input_json_delta'))).toBe(true);
    });

    it('should set stop_reason to tool_use only when finishReason is tool_calls', () => {
      const state = createAnthropicStreamState('claude-sonnet-4-5');
      state.messageSent = true;

      const withToolCalls = mapSseEventToAnthropic(
        {
          name: 'done',
          data: {
            finishReason: 'stop',
            toolCalls: [{ id: 'call_1', name: 'test', arguments: '{}' }],
            usage: { outputTokens: 1 },
          },
        } as SseEvent,
        state,
      );
      const deltaLine = withToolCalls.find((l) => l.includes('message_delta'))!;
      expect(deltaLine).toContain('"stop_reason":"end_turn"');

      const withToolCallsReason = mapSseEventToAnthropic(
        {
          name: 'done',
          data: {
            finishReason: 'tool_calls',
            toolCalls: [{ id: 'call_1', name: 'test', arguments: '{}' }],
            usage: { outputTokens: 1 },
          },
        } as SseEvent,
        createAnthropicStreamState('claude-sonnet-4-5'),
      );
      const toolDelta = withToolCallsReason.find((l) =>
        l.includes('message_delta'),
      )!;
      expect(toolDelta).toContain('"stop_reason":"tool_use"');
    });

    it('should map length and content_filter to end_turn in stream (unlike non-stream mapper)', () => {
      const state = createAnthropicStreamState('claude-sonnet-4-5');
      state.messageSent = true;

      for (const finishReason of ['length', 'content_filter'] as const) {
        const lines = mapSseEventToAnthropic(
          {
            name: 'done',
            data: { finishReason, usage: { outputTokens: 1 } },
          } as SseEvent,
          state,
        );
        const deltaLine = lines.find((l) => l.includes('message_delta'))!;
        expect(deltaLine).toContain('"stop_reason":"end_turn"');
      }
    });

    it('should skip text content_block_stop when no text deltas were sent', () => {
      const state = createAnthropicStreamState('claude-sonnet-4-5');
      state.messageSent = true;
      state.textBlockStarted = false;

      const lines = mapSseEventToAnthropic(
        {
          name: 'done',
          data: {
            toolCalls: [{ id: 'call_1', name: 'test', arguments: '{}' }],
            usage: { outputTokens: 1 },
          },
        } as SseEvent,
        state,
      );

      expect(lines[0]).toContain('event: content_block_start');
      expect(
        lines.filter((l) => l.includes('content_block_stop')),
      ).toHaveLength(1);
    });
  });

  it('should return empty array for unknown events', () => {
    const state = createAnthropicStreamState('claude-sonnet-4-5');
    expect(
      mapSseEventToAnthropic(
        { name: 'unknown' as 'meta', data: {} } as SseEvent,
        state,
      ),
    ).toEqual([]);
  });
});
