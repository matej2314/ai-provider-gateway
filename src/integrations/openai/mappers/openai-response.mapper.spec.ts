import {
  mapChatResponseToOpenAi,
  toOpenAiCompletionId,
  mapFinishReasontoOpenAI,
  mapSystemFingerprintToOpenAi,
} from './openai-response.mapper';
import type { ChatResponseDto } from '../../../chat/dto/chat-response.dto';
import {
  TEST_INPUT_TOKENS,
  TEST_OUTPUT_TOKENS,
} from '../../../common/mocks/test-constants';
import {
  asInputTokens,
  asOutputTokens,
} from '../../../common/types/branded.types';

describe('openai-response.mapper helpers', () => {
  it('toOpenAiCompletionId should replace gw_ prefix', () => {
    expect(toOpenAiCompletionId('gw_abc123')).toBe('chatcmpl_abc123');
    expect(toOpenAiCompletionId('direct')).toBe('chatcmpl_direct');
  });

  it('mapFinishReasontoOpenAI should pass known reasons and default to stop', () => {
    expect(mapFinishReasontoOpenAI('tool_calls')).toBe('tool_calls');
    expect(mapFinishReasontoOpenAI('length')).toBe('length');
    expect(mapFinishReasontoOpenAI(undefined)).toBe('stop');
    expect(mapFinishReasontoOpenAI('unknown' as never)).toBe('stop');
  });

  it('mapSystemFingerprintToOpenAi should spread only when truthy', () => {
    expect(mapSystemFingerprintToOpenAi('fp_1')).toEqual({
      system_fingerprint: 'fp_1',
    });
    expect(mapSystemFingerprintToOpenAi(undefined)).toEqual({});
    expect(mapSystemFingerprintToOpenAi('')).toEqual({});
  });
});

describe('mapChatResponseToOpenAi', () => {
  const baseResponse = {
    id: 'gw_abc123',
    output: { text: 'Hello world' },
    usage: {
      inputTokens: TEST_INPUT_TOKENS,
      outputTokens: TEST_OUTPUT_TOKENS,
    },
  } as unknown as ChatResponseDto;

  it('should map basic text completion', () => {
    const result = mapChatResponseToOpenAi(baseResponse, 'gpt-4');

    expect(result).toMatchObject({
      id: 'chatcmpl_abc123',
      object: 'chat.completion',
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Hello world' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    });
    expect(result.created).toBeGreaterThan(0);
  });

  it('should map tool calls and set content to null when text is empty', () => {
    const result = mapChatResponseToOpenAi(
      {
        id: 'gw_1',
        output: { text: '' },
        toolCalls: [
          { id: 'call_1', name: 'get_weather', arguments: '{"city":"NYC"}' },
        ],
        finishReason: 'tool_calls',
        usage: {
          inputTokens: asInputTokens(1),
          outputTokens: asOutputTokens(2),
        },
      } as unknown as ChatResponseDto,
      'gpt-4',
    );

    expect(result.choices[0].message.content).toBeNull();
    expect(result.choices[0].message.tool_calls).toEqual([
      {
        id: 'call_1',
        type: 'function',
        function: { name: 'get_weather', arguments: '{"city":"NYC"}' },
      },
    ]);
    expect(result.choices[0].finish_reason).toBe('tool_calls');
  });

  it('should keep whitespace text when tool calls are present', () => {
    const result = mapChatResponseToOpenAi(
      {
        id: 'gw_1',
        output: { text: '   ' },
        toolCalls: [{ id: 'call_1', name: 'test', arguments: '{}' }],
        usage: {
          inputTokens: asInputTokens(1),
          outputTokens: asOutputTokens(2),
        },
      } as unknown as ChatResponseDto,
      'gpt-4',
    );

    expect(result.choices[0].message.content).toBe('   ');
  });

  it('should omit tool_calls field when toolCalls is empty or undefined', () => {
    const withEmpty = mapChatResponseToOpenAi(
      { ...baseResponse, toolCalls: [] },
      'gpt-4',
    );
    expect(withEmpty.choices[0].message.tool_calls).toBeUndefined();

    const without = mapChatResponseToOpenAi(baseResponse, 'gpt-4');
    expect(without.choices[0].message.tool_calls).toBeUndefined();
  });

  it('should include system_fingerprint when present', () => {
    const result = mapChatResponseToOpenAi(
      { ...baseResponse, systemFingerprint: 'fp_xyz' },
      'gpt-4',
    );
    expect(result.system_fingerprint).toBe('fp_xyz');
  });
});
