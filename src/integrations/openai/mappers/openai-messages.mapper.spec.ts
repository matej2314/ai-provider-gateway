import {
  mapOpenAiMessagesToGateway,
  mapOpenAiToolCalls,
} from './openai-messages.mapper';
import { BadRequestException } from '@nestjs/common';
import { ApiErrorCode } from '../../../common/errors/api-error.code';

describe('mapOpenAiToolCalls', () => {
  it('should map valid tool call', () => {
    const raw = [
      {
        id: 'call_123',
        type: 'function',
        function: { name: 'get_weather', arguments: '{"location":"NYC"}' },
      },
    ];

    const result = mapOpenAiToolCalls(raw);

    expect(result).toEqual([
      {
        id: 'call_123',
        name: 'get_weather',
        arguments: '{"location":"NYC"}',
      },
    ]);
  });

  it('should map tool call with missing arguments (default to empty object)', () => {
    const raw = [
      {
        id: 'call_123',
        type: 'function',
        function: { name: 'get_weather' },
      },
    ];

    const result = mapOpenAiToolCalls(raw);

    expect(result).toEqual([
      { id: 'call_123', name: 'get_weather', arguments: '{}' },
    ]);
  });

  it('should skip non-function type tool calls', () => {
    const raw = [
      {
        id: 'call_123',
        type: 'invalid',
        function: { name: 'test', arguments: '{}' },
      },
    ];

    const result = mapOpenAiToolCalls(raw);

    expect(result).toEqual([]);
  });

  it('should skip tool calls without id', () => {
    const raw = [
      {
        type: 'function',
        function: { name: 'test', arguments: '{}' },
      },
    ];

    const result = mapOpenAiToolCalls(raw);

    expect(result).toEqual([]);
  });

  it('should skip tool calls without function name', () => {
    const raw = [
      {
        id: 'call_123',
        type: 'function',
        function: { arguments: '{}' },
      },
    ];

    const result = mapOpenAiToolCalls(raw);

    expect(result).toEqual([]);
  });

  it('should skip non-object items', () => {
    const raw = [null, undefined, 'string', 123];

    const result = mapOpenAiToolCalls(raw);

    expect(result).toEqual([]);
  });

  it('should map multiple tool calls', () => {
    const raw = [
      {
        id: 'call_1',
        type: 'function',
        function: { name: 'get_weather', arguments: '{}' },
      },
      {
        id: 'call_2',
        type: 'function',
        function: { name: 'get_time', arguments: '{"tz":"UTC"}' },
      },
    ];

    const result = mapOpenAiToolCalls(raw);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('get_weather');
    expect(result[1].name).toBe('get_time');
  });

  it('should filter out invalid tool calls and keep valid ones', () => {
    const raw = [
      { id: 'call_1', type: 'function', function: { name: 'valid' } },
      { id: 'call_2', type: 'invalid', function: { name: 'skip' } },
      { type: 'function', function: { name: 'skip_no_id' } },
      { id: 'call_3', type: 'function', function: { name: 'valid2' } },
    ];

    const result = mapOpenAiToolCalls(raw);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('valid');
    expect(result[1].name).toBe('valid2');
  });
});

describe('mapOpenAiMessagesToGateway', () => {
  describe('Happy path - basic messages', () => {
    it('should map user message', () => {
      const messages = [{ role: 'user', content: 'Hello' }];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toEqual([{ role: 'user', content: 'Hello' }]);
    });

    it('should map assistant message without tool calls', () => {
      const messages = [{ role: 'assistant', content: 'Hi there!' }];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toEqual([{ role: 'assistant', content: 'Hi there!' }]);
    });

    it('should map multiple messages', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
        { role: 'user', content: 'How are you?' },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toHaveLength(3);
    });
  });

  describe('Happy path - system message filtering', () => {
    it('should skip system message', () => {
      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toEqual([{ role: 'user', content: 'Hello' }]);
    });

    it('should skip multiple system messages', () => {
      const messages = [
        { role: 'system', content: 'System 1' },
        { role: 'user', content: 'Hello' },
        { role: 'system', content: 'System 2' },
        { role: 'assistant', content: 'Hi' },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
    });
  });

  describe('Happy path - assistant with tool calls', () => {
    it('should map assistant message with tool calls', () => {
      const messages = [
        {
          role: 'assistant',
          content: 'Let me check the weather',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: { name: 'get_weather', arguments: '{"loc":"NYC"}' },
            },
          ],
        },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toEqual([
        {
          role: 'assistant',
          content: 'Let me check the weather',
          toolCalls: [
            { id: 'call_123', name: 'get_weather', arguments: '{"loc":"NYC"}' },
          ],
        },
      ]);
    });

    it('should map assistant with multiple tool calls', () => {
      const messages = [
        {
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'get_weather' },
            },
            {
              id: 'call_2',
              type: 'function',
              function: { name: 'get_time' },
            },
          ],
        },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result[0].toolCalls).toHaveLength(2);
    });

    it('should not add toolCalls field when empty', () => {
      const messages = [
        {
          role: 'assistant',
          content: 'Hello',
          tool_calls: [],
        },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result[0]).toEqual({ role: 'assistant', content: 'Hello' });
      expect(result[0].toolCalls).toBeUndefined();
    });
  });

  describe('Happy path - tool messages', () => {
    it('should map tool message', () => {
      const messages = [
        {
          role: 'tool',
          tool_call_id: 'call_123',
          content: '{"temp":72}',
        },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toEqual([
        {
          role: 'tool',
          toolCallId: 'call_123',
          content: '{"temp":72}',
        },
      ]);
    });

    it('should map multiple tool messages', () => {
      const messages = [
        { role: 'tool', tool_call_id: 'call_1', content: 'result1' },
        { role: 'tool', tool_call_id: 'call_2', content: 'result2' },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toHaveLength(2);
      expect(result[0].toolCallId).toBe('call_1');
      expect(result[1].toolCallId).toBe('call_2');
    });
  });

  describe('Edge case - validation errors', () => {
    it('should throw when tool message missing tool_call_id', () => {
      const messages = [{ role: 'tool', content: 'result' }];

      expect(() => mapOpenAiMessagesToGateway(messages as any)).toThrow(
        BadRequestException,
      );

      try {
        mapOpenAiMessagesToGateway(messages as any);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.getResponse()).toMatchObject({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: 'Tool messages must include tool_call_id',
        });
      }
    });

    it('should throw when no messages after filtering', () => {
      const messages = [
        { role: 'system', content: 'System prompt' },
        { role: 'system', content: 'Another system' },
      ];

      expect(() => mapOpenAiMessagesToGateway(messages as any)).toThrow(
        BadRequestException,
      );

      try {
        mapOpenAiMessagesToGateway(messages as any);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.getResponse()).toMatchObject({
          code: ApiErrorCode.VALIDATION_FAILED,
          message:
            'At least one user, assistant or tool message is required after filtering.',
        });
      }
    });

    it('should throw when empty messages array', () => {
      const messages = [];

      expect(() => mapOpenAiMessagesToGateway(messages as any)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('Edge case - empty/null content', () => {
    it('should map user message with empty content', () => {
      const messages = [{ role: 'user', content: '' }];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toEqual([{ role: 'user', content: '' }]);
    });

    it('should map assistant message with null content (tool calls)', () => {
      const messages = [
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            { id: 'call_1', type: 'function', function: { name: 'test' } },
          ],
        },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result[0].content).toBeNull();
      expect(result[0].toolCalls).toBeDefined();
    });
  });

  describe('Integration - complex conversations', () => {
    it('should map full conversation with all message types', () => {
      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'What is the weather?' },
        {
          role: 'assistant',
          content: 'Let me check',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: { name: 'get_weather', arguments: '{}' },
            },
          ],
        },
        { role: 'tool', tool_call_id: 'call_123', content: '{"temp":72}' },
        { role: 'assistant', content: 'It is 72 degrees.' },
        { role: 'user', content: 'Thanks!' },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toHaveLength(5);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
      expect(result[1].toolCalls).toBeDefined();
      expect(result[2].role).toBe('tool');
      expect(result[3].role).toBe('assistant');
      expect(result[4].role).toBe('user');
    });

    it('should handle multi-turn tool calling', () => {
      const messages = [
        { role: 'user', content: 'Check weather and time' },
        {
          role: 'assistant',
          content: '',
          tool_calls: [
            { id: 'call_1', type: 'function', function: { name: 'weather' } },
            { id: 'call_2', type: 'function', function: { name: 'time' } },
          ],
        },
        { role: 'tool', tool_call_id: 'call_1', content: 'sunny' },
        { role: 'tool', tool_call_id: 'call_2', content: '10:00' },
        { role: 'assistant', content: 'Weather is sunny, time is 10:00' },
      ];

      const result = mapOpenAiMessagesToGateway(messages as any);

      expect(result).toHaveLength(5);
      expect(result[1].toolCalls).toHaveLength(2);
      expect(result[2].role).toBe('tool');
      expect(result[3].role).toBe('tool');
      expect(result[4].role).toBe('assistant');
    });
  });
});
