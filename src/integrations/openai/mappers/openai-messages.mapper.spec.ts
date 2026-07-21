import {
  mapOpenAiMessagesToGateway,
  mapOpenAiToolCalls,
} from './openai-messages.mapper';
import { BadRequestException, HttpException } from '@nestjs/common';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import { TEST_TOOL_CALL_ID } from '../../../common/mocks/test-constants';

describe('mapOpenAiToolCalls', () => {
  it('should map valid tool calls', () => {
    const raw = [
      {
        id: TEST_TOOL_CALL_ID,
        type: 'function',
        function: { name: 'get_weather', arguments: '{"location":"NYC"}' },
      },
      {
        id: 'call_2',
        type: 'function',
        function: { name: 'get_time', arguments: '{"tz":"UTC"}' },
      },
    ];

    const result = mapOpenAiToolCalls(raw);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: TEST_TOOL_CALL_ID,
      name: 'get_weather',
      arguments: '{"location":"NYC"}',
    });
    expect(result[1].name).toBe('get_time');
  });

  it('should handle missing arguments (default to empty object)', () => {
    const raw = [
      {
        id: TEST_TOOL_CALL_ID,
        type: 'function',
        function: { name: 'get_weather' },
      },
    ];

    const result = mapOpenAiToolCalls(raw);

    expect(result[0].arguments).toBe('{}');
  });

  it('should skip invalid tool calls', () => {
    const raw = [
      { id: 'valid', type: 'function', function: { name: 'test' } },
      { id: 'invalid', type: 'invalid_type', function: { name: 'skip' } },
      { type: 'function', function: { name: 'skip_no_id' } },
      { id: 'skip', type: 'function', function: {} },
      null,
      undefined,
      'string',
    ];

    const result = mapOpenAiToolCalls(raw);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid');
  });
});

describe('mapOpenAiMessagesToGateway', () => {
  describe('Basic messages', () => {
    it('should map user and assistant messages (system messages are filtered)', () => {
      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]);
    });

    it('should preserve null and undefined content', () => {
      const messages = [
        { role: 'user', content: null },
        { role: 'assistant', content: undefined },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toEqual([
        { role: 'user', content: null },
        { role: 'assistant', content: undefined },
      ]);
    });
  });

  describe('Assistant messages with tool calls', () => {
    it('should map assistant message with tool calls', () => {
      const messages = [
        {
          role: 'assistant',
          content: 'Let me check',
          tool_calls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'get_weather', arguments: '{"city":"NYC"}' },
            },
          ],
        },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toEqual([
        {
          role: 'assistant',
          content: 'Let me check',
          toolCalls: [
            {
              id: 'call_1',
              name: 'get_weather',
              arguments: '{"city":"NYC"}',
            },
          ],
        },
      ]);
    });

    it('should handle assistant message with tool calls and null content', () => {
      const messages = [
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'test', arguments: '{}' },
            },
          ],
        },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result[0].content).toBe(null);
      expect(result[0].toolCalls).toHaveLength(1);
    });
  });

  describe('Tool role messages', () => {
    it('should map tool role message', () => {
      const messages = [
        {
          role: 'tool',
          tool_call_id: 'call_1',
          content: '{"temp":72}',
        },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toEqual([
        {
          role: 'tool',
          toolCallId: 'call_1',
          content: '{"temp":72}',
        },
      ]);
    });

    it('should throw when tool message missing tool_call_id', () => {
      const messages = [
        {
          role: 'tool',
          content: 'orphan result',
        },
      ];

      expect(() => mapOpenAiMessagesToGateway(messages as any)).toThrow(
        BadRequestException,
      );

      try {
        mapOpenAiMessagesToGateway(messages as any);
      } catch (e) {
        const error = e as HttpException;
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.getResponse()).toMatchObject({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: expect.stringContaining('tool_call_id'),
        });
      }
    });
  });

  describe('Edge cases', () => {
    it('should throw for empty messages array', () => {
      expect(() => mapOpenAiMessagesToGateway([])).toThrow(BadRequestException);
    });

    it('should throw for invalid message role', () => {
      const messages = [{ role: 'invalid_role', content: 'test' }];

      expect(() => mapOpenAiMessagesToGateway(messages as any)).toThrow(
        BadRequestException,
      );
    });

    it('should filter out invalid tool calls in assistant message', () => {
      const messages = [
        {
          role: 'assistant',
          content: 'Testing',
          tool_calls: [
            { id: 'valid', type: 'function', function: { name: 'test' } },
            { id: 'invalid', type: 'invalid', function: { name: 'skip' } },
            { type: 'function', function: { name: 'skip_no_id' } },
          ],
        },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result[0].toolCalls).toHaveLength(1);
      expect(result[0].toolCalls![0].id).toBe('valid');
    });

    it('should omit toolCalls when all are invalid', () => {
      const messages = [
        {
          role: 'assistant',
          content: 'Test',
          tool_calls: [
            { id: 'skip', type: 'invalid', function: { name: 'test' } },
          ],
        },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result[0].toolCalls).toBeUndefined();
    });
  });

  describe('Complex scenarios', () => {
    it('should handle full conversation with tools (system message filtered)', () => {
      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'What is the weather?' },
        {
          role: 'assistant',
          content: 'Let me check',
          tool_calls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'get_weather', arguments: '{"city":"SF"}' },
            },
          ],
        },
        {
          role: 'tool',
          tool_call_id: 'call_1',
          content: '{"temp":72}',
        },
        {
          role: 'assistant',
          content: 'The temperature is 72°F',
        },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toHaveLength(4);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
      expect(result[1].toolCalls).toHaveLength(1);
      expect(result[2].role).toBe('tool');
      expect(result[2].toolCallId).toBe('call_1');
    });
  });
});
