import {
  createOpenAiStreamState,
  mapSseEventToOpenAi,
} from './openai-stream.mapper';
import type { SseEvent } from '../../../chat/sse/sse-event.type';
import { asToolCallId } from '../../../common/types/branded.types';

describe('openai-stream.mapper', () => {
  it('createOpenAiStreamState should store model, includeUsage and created timestamp', () => {
    const before = Math.floor(Date.now() / 1000);
    const state = createOpenAiStreamState('gpt-4', true);
    const after = Math.floor(Date.now() / 1000);

    expect(state).toMatchObject({
      completionId: '',
      model: 'gpt-4',
      roleSent: false,
      includeUsage: true,
    });
    expect(state.created).toBeGreaterThanOrEqual(before);
    expect(state.created).toBeLessThanOrEqual(after);
  });

  it('meta should emit role chunk once and set completionId', () => {
    const state = createOpenAiStreamState('gpt-4', false);
    const lines = mapSseEventToOpenAi(
      { name: 'meta', data: { id: 'gw_abc123' } } as SseEvent,
      state,
    );

    expect(state.completionId).toBe('chatcmpl_abc123');
    expect(state.roleSent).toBe(true);
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0].replace('data: ', '').trim());
    expect(parsed.choices[0].delta).toEqual({ role: 'assistant', content: '' });

    const second = mapSseEventToOpenAi(
      { name: 'meta', data: { id: 'gw_other' } } as SseEvent,
      state,
    );
    expect(second).toEqual([]);
    expect(state.completionId).toBe('chatcmpl_other');
  });

  it('delta should emit content chunk with shared created timestamp', () => {
    const state = createOpenAiStreamState('gpt-4', false);
    state.completionId = 'chatcmpl_1';
    state.roleSent = true;

    const lines = mapSseEventToOpenAi(
      { name: 'delta', data: { text: 'Hello' } },
      state,
    );
    const parsed = JSON.parse(lines[0].replace('data: ', '').trim());

    expect(parsed.created).toBe(state.created);
    expect(parsed.choices[0].delta.content).toBe('Hello');
  });

  it('delta should emit chunk with empty content when text is empty', () => {
    const state = createOpenAiStreamState('gpt-4', false);
    state.completionId = 'chatcmpl_1';
    state.roleSent = true;

    const lines = mapSseEventToOpenAi(
      { name: 'delta', data: { text: '' } },
      state,
    );
    const parsed = JSON.parse(lines[0].replace('data: ', '').trim());

    expect(lines).toHaveLength(1);
    expect(parsed.choices[0].delta.content).toBe('');
  });

  it('done should emit final chunk and [DONE]', () => {
    const state = createOpenAiStreamState('gpt-4', false);
    state.completionId = 'chatcmpl_1';
    state.roleSent = true;

    const lines = mapSseEventToOpenAi(
      {
        name: 'done',
        data: {
          finishReason: 'stop',
          usage: { inputTokens: 10, outputTokens: 20 },
        },
      },
      state,
    );

    expect(lines).toHaveLength(2);
    const parsed = JSON.parse(lines[0].replace('data: ', '').trim());
    expect(parsed.choices[0].finish_reason).toBe('stop');
    expect(parsed.usage).toBeUndefined();
    expect(lines[1]).toBe('data: [DONE]\n\n');
  });

  it('done should include usage only when includeUsage and usage data are present', () => {
    const withUsage = createOpenAiStreamState('gpt-4', true);
    withUsage.completionId = 'chatcmpl_1';
    withUsage.roleSent = true;

    const included = mapSseEventToOpenAi(
      {
        name: 'done',
        data: {
          finishReason: 'stop',
          usage: { inputTokens: 10, outputTokens: 20 },
        },
      },
      withUsage,
    );
    expect(JSON.parse(included[0].replace('data: ', '').trim()).usage).toEqual({
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    });

    const missingUsageData = createOpenAiStreamState('gpt-4', true);
    missingUsageData.completionId = 'chatcmpl_1';
    missingUsageData.roleSent = true;
    const noUsage = mapSseEventToOpenAi(
      { name: 'done', data: { finishReason: 'stop' } },
      missingUsageData,
    );
    expect(
      JSON.parse(noUsage[0].replace('data: ', '').trim()).usage,
    ).toBeUndefined();
  });

  it('done should use explicit totalTokens from usage when provided', () => {
    const state = createOpenAiStreamState('gpt-4', true);
    state.completionId = 'chatcmpl_1';
    state.roleSent = true;

    const lines = mapSseEventToOpenAi(
      {
        name: 'done',
        data: {
          finishReason: 'stop',
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 99 },
        },
      },
      state,
    );
    const parsed = JSON.parse(lines[0].replace('data: ', '').trim());

    expect(parsed.usage).toEqual({
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 99,
    });
  });

  it('done should default finish_reason to stop when finishReason and toolCalls are absent', () => {
    const state = createOpenAiStreamState('gpt-4', false);
    state.completionId = 'chatcmpl_1';
    state.roleSent = true;

    const lines = mapSseEventToOpenAi({ name: 'done', data: {} }, state);
    const parsed = JSON.parse(lines[0].replace('data: ', '').trim());

    expect(lines).toHaveLength(2);
    expect(parsed.choices[0].finish_reason).toBe('stop');
  });

  it('done should map length and content_filter finish reasons', () => {
    const state = createOpenAiStreamState('gpt-4', false);
    state.completionId = 'chatcmpl_1';
    state.roleSent = true;

    const lengthLines = mapSseEventToOpenAi(
      { name: 'done', data: { finishReason: 'length' } },
      state,
    );
    expect(
      JSON.parse(lengthLines[0].replace('data: ', '').trim()).choices[0]
        .finish_reason,
    ).toBe('length');

    const filterLines = mapSseEventToOpenAi(
      { name: 'done', data: { finishReason: 'content_filter' } },
      state,
    );
    expect(
      JSON.parse(filterLines[0].replace('data: ', '').trim()).choices[0]
        .finish_reason,
    ).toBe('content_filter');
  });

  it('done should default gateway-specific finish reasons to stop', () => {
    const state = createOpenAiStreamState('gpt-4', false);
    state.completionId = 'chatcmpl_1';
    state.roleSent = true;

    const lines = mapSseEventToOpenAi(
      { name: 'done', data: { finishReason: 'end_turn' } },
      state,
    );
    const parsed = JSON.parse(lines[0].replace('data: ', '').trim());

    expect(parsed.choices[0].finish_reason).toBe('stop');
  });

  it('done should include system_fingerprint on final chunk when present', () => {
    const state = createOpenAiStreamState('gpt-4', false);
    state.completionId = 'chatcmpl_1';
    state.roleSent = true;

    const lines = mapSseEventToOpenAi(
      {
        name: 'done',
        data: { finishReason: 'stop', systemFingerprint: 'fp_xyz' },
      },
      state,
    );
    const parsed = JSON.parse(lines[0].replace('data: ', '').trim());

    expect(parsed.system_fingerprint).toBe('fp_xyz');
  });

  it('done should not emit tool_calls chunk when toolCalls is empty', () => {
    const state = createOpenAiStreamState('gpt-4', false);
    state.completionId = 'chatcmpl_1';
    state.roleSent = true;

    const lines = mapSseEventToOpenAi(
      {
        name: 'done',
        data: { finishReason: 'stop', toolCalls: [] },
      },
      state,
    );
    const parsed = JSON.parse(lines[0].replace('data: ', '').trim());

    expect(lines).toHaveLength(2);
    expect(parsed.choices[0].finish_reason).toBe('stop');
    expect(lines[1]).toBe('data: [DONE]\n\n');
  });

  it('done should emit tool_calls chunk and force finish_reason tool_calls', () => {
    const state = createOpenAiStreamState('gpt-4', false);
    state.completionId = 'chatcmpl_1';
    state.roleSent = true;

    const lines = mapSseEventToOpenAi(
      {
        name: 'done',
        data: {
          finishReason: 'stop',
          toolCalls: [
            {
              id: asToolCallId('call_1'),
              name: 'get_weather',
              arguments: '{"city":"NYC"}',
            },
            {
              id: asToolCallId('call_2'),
              name: 'get_time',
              arguments: '{}',
            },
          ],
          usage: { inputTokens: 1, outputTokens: 2 },
        },
      },
      state,
    );

    expect(lines).toHaveLength(3);
    const toolChunk = JSON.parse(lines[0].replace('data: ', '').trim());
    expect(toolChunk.choices[0].delta.tool_calls).toHaveLength(2);
    expect(toolChunk.choices[0].delta.tool_calls[0]).toEqual({
      index: 0,
      id: 'call_1',
      type: 'function',
      function: { name: 'get_weather', arguments: '{"city":"NYC"}' },
    });
    expect(toolChunk.choices[0].delta.tool_calls[1]).toEqual({
      index: 1,
      id: 'call_2',
      type: 'function',
      function: { name: 'get_time', arguments: '{}' },
    });

    const finalChunk = JSON.parse(lines[1].replace('data: ', '').trim());
    expect(finalChunk.choices[0].finish_reason).toBe('tool_calls');
    expect(lines[2]).toBe('data: [DONE]\n\n');
  });

  it('done should infer finish_reason tool_calls when toolCalls present without finishReason', () => {
    const state = createOpenAiStreamState('gpt-4', false);
    state.completionId = 'chatcmpl_1';
    state.roleSent = true;

    const lines = mapSseEventToOpenAi(
      {
        name: 'done',
        data: {
          toolCalls: [
            {
              id: asToolCallId('call_1'),
              name: 'get_weather',
              arguments: '{"city":"NYC"}',
            },
          ],
        },
      },
      state,
    );

    expect(lines).toHaveLength(3);
    const finalChunk = JSON.parse(lines[1].replace('data: ', '').trim());
    expect(finalChunk.choices[0].finish_reason).toBe('tool_calls');
  });

  it('should return empty array for unknown events', () => {
    const state = createOpenAiStreamState('gpt-4', false);
    expect(
      mapSseEventToOpenAi(
        { name: 'unknown' as 'meta', data: {} } as SseEvent,
        state,
      ),
    ).toEqual([]);
  });
});
