import {
  mapAnthropicToolsToGateway,
  mapAnthropicToolChoice,
  mapAnthropicContentBlockToGateway,
} from './anthropic-tools.mapper';
import { BadRequestException } from '@nestjs/common';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import { TEST_TOOL_CALL_ID } from '../../../common/mocks/test-constants';
import { asToolCallId } from '../../../common/types/branded.types';

const TEST_TOOL = {
  name: 'get_weather',
  description: 'Get weather',
  input_schema: { type: 'object', properties: {} },
};

describe('mapAnthropicToolsToGateway', () => {
  it('should map single tool', () => {
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

  it('should map tool without description', () => {
    const tools = [
      {
        name: 'test_tool',
        input_schema: { type: 'object' },
      },
    ];

    const result = mapAnthropicToolsToGateway(tools);

    expect(result).toEqual([
      {
        name: 'test_tool',
        parameters: { type: 'object' },
      },
    ]);
  });

  it('should map tool without input_schema (default empty object)', () => {
    const tools = [{ name: 'simple_tool' }];

    const result = mapAnthropicToolsToGateway(tools);

    expect(result).toEqual([
      {
        name: 'simple_tool',
        parameters: {},
      },
    ]);
  });

  it('should map multiple tools', () => {
    const tools = [
      { name: 'tool1', input_schema: {} },
      { name: 'tool2', description: 'Tool 2', input_schema: {} },
    ];

    const result = mapAnthropicToolsToGateway(tools);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('tool1');
    expect(result[1].name).toBe('tool2');
  });

  it('should skip tools without name', () => {
    const tools = [
      { description: 'No name', input_schema: {} },
      { name: 'valid', input_schema: {} },
    ];

    const result = mapAnthropicToolsToGateway(tools);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('valid');
  });

  it('should skip non-object items', () => {
    const tools = [null, undefined, 'string', { name: 'valid' }];

    const result = mapAnthropicToolsToGateway(tools);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('valid');
  });

  it('should return empty array when no valid tools', () => {
    const tools = [null, undefined, { description: 'no name' }];

    const result = mapAnthropicToolsToGateway(tools);

    expect(result).toEqual([]);
  });

  it('should return empty array for empty input', () => {
    expect(mapAnthropicToolsToGateway([])).toEqual([]);
  });

  it('should skip tool with empty name', () => {
    const tools = [{ name: '', input_schema: {} }];

    expect(mapAnthropicToolsToGateway(tools)).toEqual([]);
  });

  it('should omit empty description', () => {
    const tools = [{ name: 'test_tool', description: '', input_schema: {} }];

    expect(mapAnthropicToolsToGateway(tools)).toEqual([
      { name: 'test_tool', parameters: {} },
    ]);
  });
});

describe('mapAnthropicToolChoice', () => {
  it('should map {type:"auto"} to "auto"', () => {
    const result = mapAnthropicToolChoice({ type: 'auto' });

    expect(result).toBe('auto');
  });

  it('should map {type:"any"} to "required"', () => {
    const result = mapAnthropicToolChoice({ type: 'any' });

    expect(result).toBe('required');
  });

  it('should map {type:"tool", name:"X"} to function choice', () => {
    const toolChoice = { type: 'tool', name: 'get_weather' };

    const result = mapAnthropicToolChoice(toolChoice);

    expect(result).toEqual({
      type: 'function',
      function: { name: 'get_weather' },
    });
  });

  it('should return undefined when toolChoice not provided', () => {
    const result = mapAnthropicToolChoice(undefined);

    expect(result).toBeUndefined();
  });

  it('should return undefined when toolChoice is null', () => {
    const result = mapAnthropicToolChoice(null);

    expect(result).toBeUndefined();
  });

  it('should throw when invalid type', () => {
    const toolChoice = { type: 'invalid' };

    expect(() => mapAnthropicToolChoice(toolChoice)).toThrow(
      BadRequestException,
    );

    try {
      mapAnthropicToolChoice(toolChoice);
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect(e.getResponse()).toMatchObject({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Invalid tool_choice value',
      });
    }
  });

  it('should throw when tool type without name', () => {
    const toolChoice = { type: 'tool' };

    expect(() => mapAnthropicToolChoice(toolChoice)).toThrow(
      BadRequestException,
    );
  });

  it('should throw when not an object', () => {
    expect(() => mapAnthropicToolChoice('auto' as any)).toThrow(
      BadRequestException,
    );
  });

  it('should throw when tool_choice is empty object', () => {
    expect(() => mapAnthropicToolChoice({})).toThrow(BadRequestException);
  });

  it('should throw when tool type with empty name', () => {
    expect(() => mapAnthropicToolChoice({ type: 'tool', name: '' })).toThrow(
      BadRequestException,
    );
  });

  it('should return undefined when toolChoice is false', () => {
    expect(mapAnthropicToolChoice(false)).toBeUndefined();
  });
});

describe('mapAnthropicContentBlockToGateway', () => {
  describe('text blocks', () => {
    it('should map user text block', () => {
      const blocks = [{ type: 'text', text: 'Hello' }];

      const result = mapAnthropicContentBlockToGateway('user', blocks as any);

      expect(result).toEqual([{ role: 'user', content: 'Hello' }]);
    });

    it('should map assistant text block', () => {
      const blocks = [{ type: 'text', text: 'Hi there!' }];

      const result = mapAnthropicContentBlockToGateway(
        'assistant',
        blocks as any,
      );

      expect(result).toEqual([{ role: 'assistant', content: 'Hi there!' }]);
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

    it('should concatenate multiple text blocks for assistant', () => {
      const blocks = [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: ' ' },
        { type: 'text', text: 'World' },
      ];

      const result = mapAnthropicContentBlockToGateway(
        'assistant',
        blocks as any,
      );

      expect(result).toEqual([{ role: 'assistant', content: 'Hello World' }]);
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

    it('should map tool_use without input (default empty object)', () => {
      const blocks = [{ type: 'tool_use', id: 'call_1', name: 'test' }];

      const result = mapAnthropicContentBlockToGateway(
        'assistant',
        blocks as any,
      );

      expect(result[0].toolCalls![0].arguments).toBe('{}');
    });

    it('should skip tool_use without id and return assistant with empty content', () => {
      const blocks = [{ type: 'tool_use', name: 'weather', input: {} }];

      const result = mapAnthropicContentBlockToGateway(
        'assistant',
        blocks as any,
      );

      expect(result).toEqual([{ role: 'assistant', content: '' }]);
    });

    it('should skip tool_use without name and return assistant with empty content', () => {
      const blocks = [{ type: 'tool_use', id: 'call_1', input: {} }];

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

    it('should map tool_result without content (empty string)', () => {
      const blocks = [{ type: 'tool_result', tool_use_id: 'call_1' }];

      const result = mapAnthropicContentBlockToGateway('user', blocks as any);

      expect(result[0].content).toBe('');
    });

    it('should skip tool_result without tool_use_id', () => {
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

  describe('validation', () => {
    it('should throw when image block present', () => {
      const blocks = [{ type: 'image', source: {} }];

      expect(() =>
        mapAnthropicContentBlockToGateway('user', blocks as any),
      ).toThrow(BadRequestException);

      try {
        mapAnthropicContentBlockToGateway('user', blocks as any);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.getResponse()).toMatchObject({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: 'Image content block are not supported.',
        });
      }
    });

    it('should throw when no valid content blocks', () => {
      const blocks = [];

      expect(() =>
        mapAnthropicContentBlockToGateway('user', blocks as any),
      ).toThrow(BadRequestException);

      try {
        mapAnthropicContentBlockToGateway('user', blocks as any);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.getResponse()).toMatchObject({
          code: ApiErrorCode.VALIDATION_FAILED,
          message:
            'Each message must have at least one supported content block.',
        });
      }
    });

    it('should return assistant with empty content when blocks array is empty', () => {
      const result = mapAnthropicContentBlockToGateway('assistant', []);

      expect(result).toEqual([{ role: 'assistant', content: '' }]);
    });

    it('should throw when only empty text block for user', () => {
      const blocks = [{ type: 'text', text: '' }];

      expect(() =>
        mapAnthropicContentBlockToGateway('user', blocks as any),
      ).toThrow(BadRequestException);
    });

    it('should return assistant with empty content when only empty text block', () => {
      const blocks = [{ type: 'text', text: '' }];

      const result = mapAnthropicContentBlockToGateway(
        'assistant',
        blocks as any,
      );

      expect(result).toEqual([{ role: 'assistant', content: '' }]);
    });

    it('should throw when only unsupported block types', () => {
      const blocks = [{ type: 'unknown', data: 'x' }];

      expect(() =>
        mapAnthropicContentBlockToGateway('user', blocks as any),
      ).toThrow(BadRequestException);
    });

    it('should throw when image block is mixed with text', () => {
      const blocks = [
        { type: 'text', text: 'Hello' },
        { type: 'image', source: {} },
      ];

      expect(() =>
        mapAnthropicContentBlockToGateway('user', blocks as any),
      ).toThrow(BadRequestException);
    });

    it('should throw when user message has only invalid tool_use blocks', () => {
      const blocks = [{ type: 'tool_use', name: 'weather', input: {} }];

      expect(() =>
        mapAnthropicContentBlockToGateway('user', blocks as any),
      ).toThrow(BadRequestException);
    });
  });
});
