import {
  mapAnthropicToolsToGateway,
  mapAnthropicToolChoice,
  mapAnthropicContentBlockToGateway,
} from './anthropic-tools.mapper';
import { BadRequestException } from '@nestjs/common';
import { asToolCallId } from '../../../common/types/branded.types';

const TEST_TOOL = {
  name: 'get_weather',
  description: 'Get weather',
  input_schema: { type: 'object', properties: {} },
};

describe('mapAnthropicToolsToGateway', () => {
  it('should map tools with all fields', () => {
    const tools = [TEST_TOOL];

    const result = mapAnthropicToolsToGateway(tools);

    expect(result).toEqual([
      {
        name: 'get_weather',
        description: 'Get weather',
        parameters: { type: 'object', properties: {} },
      },
    ]);
  });

  it('should map tool without optional fields', () => {
    const tools = [
      { name: 'test_tool', input_schema: { type: 'object' } },
      { name: 'simple_tool' },
    ];

    const result = mapAnthropicToolsToGateway(tools);

    expect(result).toEqual([
      { name: 'test_tool', parameters: { type: 'object' } },
      { name: 'simple_tool', parameters: {} },
    ]);
  });

  it('should skip invalid tools', () => {
    const tools = [
      null,
      { description: 'No name', input_schema: {} },
      { name: '', input_schema: {} },
      { name: 'valid', input_schema: {} },
    ];

    const result = mapAnthropicToolsToGateway(tools);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('valid');
  });
});

describe('mapAnthropicToolChoice', () => {
  it('should map standard tool choice types', () => {
    expect(mapAnthropicToolChoice({ type: 'auto' })).toBe('auto');
    expect(mapAnthropicToolChoice({ type: 'any' })).toBe('required');
  });

  it('should map specific tool choice', () => {
    const toolChoice = { type: 'tool', name: 'get_weather' };

    const result = mapAnthropicToolChoice(toolChoice);

    expect(result).toEqual({
      type: 'function',
      function: { name: 'get_weather' },
    });
  });

  it('should return undefined for falsy values', () => {
    expect(mapAnthropicToolChoice(undefined)).toBeUndefined();
    expect(mapAnthropicToolChoice(null)).toBeUndefined();
    expect(mapAnthropicToolChoice(false)).toBeUndefined();
  });

  it('should throw for invalid tool choice', () => {
    expect(() => mapAnthropicToolChoice({ type: 'invalid' })).toThrow(
      BadRequestException,
    );
    expect(() => mapAnthropicToolChoice('auto' as any)).toThrow(
      BadRequestException,
    );
    expect(() => mapAnthropicToolChoice({})).toThrow(BadRequestException);
  });

  it('should throw when tool type missing name', () => {
    expect(() => mapAnthropicToolChoice({ type: 'tool' })).toThrow(
      BadRequestException,
    );
    expect(() => mapAnthropicToolChoice({ type: 'tool', name: '' })).toThrow(
      BadRequestException,
    );
  });
});

describe('mapAnthropicContentBlockToGateway', () => {
  describe('text blocks', () => {
    it('should map text blocks for user and assistant', () => {
      const blocks = [{ type: 'text', text: 'Hello' }];

      expect(mapAnthropicContentBlockToGateway('user', blocks as any)).toEqual([
        { role: 'user', content: 'Hello' },
      ]);

      expect(
        mapAnthropicContentBlockToGateway('assistant', blocks as any),
      ).toEqual([{ role: 'assistant', content: 'Hello' }]);
    });

    it('should concatenate multiple text blocks', () => {
      const blocks = [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: ' ' },
        { type: 'text', text: 'World' },
      ];

      const result = mapAnthropicContentBlockToGateway('user', blocks as any);

      expect(result).toEqual([{ role: 'user', content: 'Hello World' }]);
    });
  });

  describe('tool_use blocks (assistant)', () => {
    it('should map tool_use block to toolCalls', () => {
      const blocks = [
        {
          type: 'tool_use',
          id: 'toolu_123',
          name: 'get_weather',
          input: { location: 'SF' },
        },
      ];

      const result = mapAnthropicContentBlockToGateway(
        'assistant',
        blocks as any,
      );

      expect(result).toEqual([
        {
          role: 'assistant',
          content: '',
          toolCalls: [
            {
              id: asToolCallId('toolu_123'),
              name: 'get_weather',
              arguments: '{"location":"SF"}',
            },
          ],
        },
      ]);
    });

    it('should map multiple tool_use blocks', () => {
      const blocks = [
        { type: 'tool_use', id: 'call_1', name: 'weather', input: {} },
        { type: 'tool_use', id: 'call_2', name: 'time', input: {} },
      ];

      const result = mapAnthropicContentBlockToGateway(
        'assistant',
        blocks as any,
      );

      expect(result[0].toolCalls).toHaveLength(2);
    });

    it('should handle tool_use without input', () => {
      const blocks = [{ type: 'tool_use', id: 'call_1', name: 'test' }];

      const result = mapAnthropicContentBlockToGateway(
        'assistant',
        blocks as any,
      );

      expect(result[0].toolCalls![0].arguments).toBe('{}');
    });

    it('should skip invalid tool_use blocks', () => {
      const blocks = [
        { type: 'tool_use', name: 'weather', input: {} },
        { type: 'tool_use', id: 'call_1', input: {} },
      ];

      const result = mapAnthropicContentBlockToGateway(
        'assistant',
        blocks as any,
      );

      expect(result).toEqual([{ role: 'assistant', content: '' }]);
    });
  });

  describe('tool_result blocks', () => {
    it('should map tool_result block', () => {
      const blocks = [
        {
          type: 'tool_result',
          tool_use_id: 'toolu_123',
          content: '{"temp":72}',
        },
      ];

      const result = mapAnthropicContentBlockToGateway('user', blocks as any);

      expect(result).toEqual([
        {
          role: 'tool',
          toolCallId: 'toolu_123',
          content: '{"temp":72}',
        },
      ]);
    });

    it('should map multiple tool_result blocks', () => {
      const blocks = [
        { type: 'tool_result', tool_use_id: 'call_1', content: 'result1' },
        { type: 'tool_result', tool_use_id: 'call_2', content: 'result2' },
      ];

      const result = mapAnthropicContentBlockToGateway('user', blocks as any);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('tool');
      expect(result[1].role).toBe('tool');
    });

    it('should handle tool_result without content', () => {
      const blocks = [{ type: 'tool_result', tool_use_id: 'call_1' }];

      const result = mapAnthropicContentBlockToGateway('user', blocks as any);

      expect(result[0].content).toBe('');
    });

    it('should throw for tool_result without tool_use_id', () => {
      const blocks = [{ type: 'tool_result', content: 'orphan' }];

      expect(() =>
        mapAnthropicContentBlockToGateway('user', blocks as any),
      ).toThrow(BadRequestException);
    });
  });

  describe('mixed blocks', () => {
    it('should map text + tool_use', () => {
      const blocks = [
        { type: 'text', text: 'Let me check' },
        { type: 'tool_use', id: 'call_1', name: 'weather', input: {} },
      ];

      const result = mapAnthropicContentBlockToGateway(
        'assistant',
        blocks as any,
      );

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Let me check');
      expect(result[0].toolCalls).toHaveLength(1);
    });

    it('should map text + tool_result', () => {
      const blocks = [
        { type: 'text', text: 'User text' },
        { type: 'tool_result', tool_use_id: 'call_1', content: 'result' },
      ];

      const result = mapAnthropicContentBlockToGateway('user', blocks as any);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ role: 'user', content: 'User text' });
      expect(result[1]).toEqual({
        role: 'tool',
        toolCallId: 'call_1',
        content: 'result',
      });
    });
  });

  describe('validation errors', () => {
    it('should throw for unsupported block types', () => {
      expect(() =>
        mapAnthropicContentBlockToGateway('user', [
          { type: 'image', source: {} },
        ] as any),
      ).toThrow(BadRequestException);
    });

    it('should throw when no valid content blocks', () => {
      expect(() =>
        mapAnthropicContentBlockToGateway('user', [] as any),
      ).toThrow(BadRequestException);

      expect(() =>
        mapAnthropicContentBlockToGateway('user', [
          { type: 'text', text: '' },
        ] as any),
      ).toThrow(BadRequestException);
    });

    it('should return assistant with empty content for empty blocks', () => {
      const result = mapAnthropicContentBlockToGateway('assistant', []);

      expect(result).toEqual([{ role: 'assistant', content: '' }]);
    });

    it('should return assistant with empty content for only empty text', () => {
      const blocks = [{ type: 'text', text: '' }];

      const result = mapAnthropicContentBlockToGateway(
        'assistant',
        blocks as any,
      );

      expect(result).toEqual([{ role: 'assistant', content: '' }]);
    });
  });
});
