jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { mapGatewayResponseToAnthropicFormat } from './anthropic-response.mapper';
import type { ChatResponseDto } from '../../../chat/dto/chat-response.dto';
import {
  asInputTokens,
  asOutputTokens,
  asToolCallId,
} from '../../../common/types/branded.types';
import {
  TEST_INPUT_TOKENS,
  TEST_OUTPUT_TOKENS,
  TEST_TOOL_CALL_ID,
} from '../../../common/mocks/test-constants';

describe('mapGatewayResponseToAnthropicFormat', () => {
  it('should map simple text response with usage defaults', () => {
    const result = mapGatewayResponseToAnthropicFormat(
      {
        id: 'gw_abc123',
        output: { text: 'Hello world' },
        usage: {
          inputTokens: TEST_INPUT_TOKENS,
          outputTokens: TEST_OUTPUT_TOKENS,
        },
      } as unknown as ChatResponseDto,
      'claude-sonnet-4-5',
    );

    expect(result).toMatchObject({
      id: 'msg_abc123',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-5',
      content: [{ type: 'text', text: 'Hello world' }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: 10,
        output_tokens: 20,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
      },
    });
  });

  it('should prepend thinking block and omit empty text block', () => {
    const result = mapGatewayResponseToAnthropicFormat(
      {
        id: 'gw_1',
        output: { text: '' },
        thinkingContent: 'Reasoning',
        usage: {
          inputTokens: asInputTokens(1),
          outputTokens: asOutputTokens(2),
        },
      } as unknown as ChatResponseDto,
      'claude',
    );

    expect(result.content).toEqual([
      { type: 'thinking', thinking: 'Reasoning' },
    ]);
  });

  it('should map tool calls and parse JSON arguments', () => {
    const result = mapGatewayResponseToAnthropicFormat(
      {
        id: 'gw_1',
        output: { text: '' },
        toolCalls: [
          {
            id: TEST_TOOL_CALL_ID,
            name: 'get_weather',
            arguments: '{"city":"NYC"}',
          },
        ],
        finishReason: 'tool_calls',
        usage: {
          inputTokens: asInputTokens(1),
          outputTokens: asOutputTokens(2),
        },
      } as unknown as ChatResponseDto,
      'claude',
    );

    expect(result.content).toEqual([
      {
        type: 'tool_use',
        id: TEST_TOOL_CALL_ID,
        name: 'get_weather',
        input: { city: 'NYC' },
      },
    ]);
    expect(result.stop_reason).toBe('tool_use');
  });

  it('should use empty object for invalid tool arguments JSON', () => {
    const result = mapGatewayResponseToAnthropicFormat(
      {
        id: 'gw_1',
        output: { text: '' },
        toolCalls: [
          { id: asToolCallId('call_1'), name: 'test', arguments: 'not-json' },
        ],
        usage: {
          inputTokens: asInputTokens(1),
          outputTokens: asOutputTokens(2),
        },
      } as unknown as ChatResponseDto,
      'claude',
    );

    expect(result.content[0]).toMatchObject({ type: 'tool_use', input: {} });
  });

  it('should map finish reasons to Anthropic stop_reason values', () => {
    const base = {
      id: 'gw_1',
      output: { text: 'x' },
      usage: { inputTokens: 1, outputTokens: 2 },
    } as unknown as ChatResponseDto;

    expect(
      mapGatewayResponseToAnthropicFormat(
        { ...base, finishReason: 'length' },
        'm',
      ).stop_reason,
    ).toBe('max_tokens');
    expect(
      mapGatewayResponseToAnthropicFormat(
        { ...base, finishReason: 'content_filter' },
        'm',
      ).stop_reason,
    ).toBe('refusal');
    expect(
      mapGatewayResponseToAnthropicFormat(
        { ...base, finishReason: 'stop' },
        'm',
      ).stop_reason,
    ).toBe('end_turn');
  });

  it('should include cache token fields from usageDetails', () => {
    const result = mapGatewayResponseToAnthropicFormat(
      {
        id: 'gw_1',
        output: { text: 'x' },
        usage: {
          inputTokens: asInputTokens(100),
          outputTokens: asOutputTokens(50),
        },
        usageDetails: {
          promptCacheCreationTokens: 20,
          promptCacheHitTokens: 30,
        },
      } as unknown as ChatResponseDto,
      'claude',
    );

    expect(result.usage).toEqual({
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 20,
      cache_read_input_tokens: 30,
    });
  });
});
