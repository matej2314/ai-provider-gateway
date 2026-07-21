import {
  mapOpenAiToolsToGateway,
  mapOpenAiToolChoice,
} from './openai-tools.mapper';
import { BadRequestException, HttpException } from '@nestjs/common';
import { ApiErrorCode } from '../../../common/errors/api-error.code';

describe('mapOpenAiToolsToGateway', () => {
  it('should map single function tool', () => {
    const tools = [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get weather',
          parameters: { type: 'object', properties: {} },
        },
      },
    ];

    const result = mapOpenAiToolsToGateway(tools);

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
        type: 'function',
        function: {
          name: 'test_tool',
          parameters: { type: 'object' },
        },
      },
    ];

    const result = mapOpenAiToolsToGateway(tools);

    expect(result).toEqual([
      {
        name: 'test_tool',
        parameters: { type: 'object' },
      },
    ]);
  });

  it('should omit description when it is an empty string', () => {
    const tools = [
      {
        type: 'function',
        function: {
          name: 'test_tool',
          description: '',
          parameters: { type: 'object' },
        },
      },
    ];

    const result = mapOpenAiToolsToGateway(tools);

    expect(result).toEqual([
      {
        name: 'test_tool',
        parameters: { type: 'object' },
      },
    ]);
  });

  it('should map tool without parameters (default empty object)', () => {
    const tools = [
      {
        type: 'function',
        function: {
          name: 'simple_tool',
        },
      },
    ];

    const result = mapOpenAiToolsToGateway(tools);

    expect(result).toEqual([
      {
        name: 'simple_tool',
        parameters: {},
      },
    ]);
  });

  it('should map multiple tools', () => {
    const tools = [
      {
        type: 'function',
        function: { name: 'tool1', parameters: {} },
      },
      {
        type: 'function',
        function: { name: 'tool2', description: 'Tool 2', parameters: {} },
      },
    ];

    const result = mapOpenAiToolsToGateway(tools);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('tool1');
    expect(result[1].name).toBe('tool2');
  });

  it('should skip non-function type tools', () => {
    const tools = [
      { type: 'invalid', function: { name: 'skip_me' } },
      { type: 'function', function: { name: 'keep_me' } },
    ];

    const result = mapOpenAiToolsToGateway(tools);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('keep_me');
  });

  it('should skip tools without function name', () => {
    const tools = [
      { type: 'function', function: { description: 'No name' } },
      { type: 'function', function: { name: 'valid' } },
    ];

    const result = mapOpenAiToolsToGateway(tools);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('valid');
  });

  it('should skip tools with empty string function name', () => {
    const tools = [
      { type: 'function', function: { name: '' } },
      { type: 'function', function: { name: 'valid' } },
    ];

    const result = mapOpenAiToolsToGateway(tools);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('valid');
  });

  it('should skip non-object items', () => {
    const tools = [
      null,
      undefined,
      'string',
      123,
      { type: 'function', function: { name: 'valid' } },
    ];

    const result = mapOpenAiToolsToGateway(tools);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('valid');
  });

  it('should throw when array contains only non-object items', () => {
    const tools = [null, undefined, 'string', 123];

    expect(() => mapOpenAiToolsToGateway(tools)).toThrow(BadRequestException);

    try {
      mapOpenAiToolsToGateway(tools);
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const error = e as HttpException;
      expect(error.getResponse()).toMatchObject({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Tools must contain at least one valid function tool',
      });
    }
  });

  it('should throw when all tools are invalid', () => {
    const tools = [
      { type: 'invalid', function: { name: 'test' } },
      { type: 'function', function: {} },
    ];

    expect(() => mapOpenAiToolsToGateway(tools)).toThrow(BadRequestException);

    try {
      mapOpenAiToolsToGateway(tools);
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const error = e as HttpException;
      expect(error.getResponse()).toMatchObject({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Tools must contain at least one valid function tool',
      });
    }
  });

  it('should not throw when empty tools array', () => {
    const tools: unknown[] = [];

    const result = mapOpenAiToolsToGateway(tools);

    expect(result).toEqual([]);
  });
});

describe('mapOpenAiToolChoice', () => {
  it('should map "auto"', () => {
    const result = mapOpenAiToolChoice('auto');

    expect(result).toBe('auto');
  });

  it('should map "none"', () => {
    const result = mapOpenAiToolChoice('none');

    expect(result).toBe('none');
  });

  it('should map "required"', () => {
    const result = mapOpenAiToolChoice('required');

    expect(result).toBe('required');
  });

  it('should map function-specific choice', () => {
    const toolChoice = {
      type: 'function',
      function: { name: 'get_weather' },
    };

    const result = mapOpenAiToolChoice(toolChoice);

    expect(result).toEqual({
      type: 'function',
      function: { name: 'get_weather' },
    });
  });

  it('should return undefined when toolChoice not provided', () => {
    const result = mapOpenAiToolChoice(undefined);

    expect(result).toBeUndefined();
  });

  it('should return undefined when toolChoice is null', () => {
    const result = mapOpenAiToolChoice(null);

    expect(result).toBeUndefined();
  });

  it('should throw when invalid string value', () => {
    expect(() => mapOpenAiToolChoice('invalid')).toThrow(BadRequestException);

    try {
      mapOpenAiToolChoice('invalid');
    } catch (e) {
      const error = e as HttpException;
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse()).toMatchObject({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Invalid tool_choice value',
      });
    }
  });

  it('should throw when object without type', () => {
    const toolChoice = { function: { name: 'test' } };

    expect(() => mapOpenAiToolChoice(toolChoice)).toThrow(BadRequestException);
  });

  it('should throw when function type without name', () => {
    const toolChoice = { type: 'function', function: {} };

    expect(() => mapOpenAiToolChoice(toolChoice)).toThrow(BadRequestException);
  });

  it('should throw when type is not function', () => {
    const toolChoice = { type: 'invalid', function: { name: 'test' } };

    expect(() => mapOpenAiToolChoice(toolChoice)).toThrow(BadRequestException);
  });

  it('should throw when empty object', () => {
    expect(() => mapOpenAiToolChoice({})).toThrow(BadRequestException);
  });
});
