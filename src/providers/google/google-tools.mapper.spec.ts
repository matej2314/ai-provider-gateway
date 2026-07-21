import {
  mapToolsToGemini,
  mapToolChoiceToGemini,
  mapTurnsToGeminiContents,
  parseGeminiResponseWithTools,
} from './google-tools.mapper';
import { asOutputTokens, asToolCallId } from '../../common/types/branded.types';
import { TEST_INPUT_TOKENS } from '../../common/mocks/test-constants';
import type {
  ProviderToolDefinition,
  ProviderChatTurn,
  ProviderAssistantTurn,
} from '../interfaces/ai-provider.interface';
import { FunctionCallingConfigMode } from '@google/genai';
import type { GatewayToolChoice } from '../types/tooling-types';

describe('mapToolsToGemini', () => {
  it('should map single tool', () => {
    const tools: ProviderToolDefinition[] = [
      {
        name: 'get_weather',
        description: 'Get weather',
        parameters: { type: 'object', properties: {} },
      },
    ];

    const result = mapToolsToGemini(tools);

    expect(result).toEqual([
      {
        name: 'get_weather',
        description: 'Get weather',
        parametersJsonSchema: { type: 'object', properties: {} },
      },
    ]);
  });

  it('should map tool without description', () => {
    const tools: ProviderToolDefinition[] = [
      {
        name: 'test_tool',
        parameters: { type: 'object' },
      },
    ];

    const result = mapToolsToGemini(tools);

    expect(result).toEqual([
      {
        name: 'test_tool',
        parametersJsonSchema: { type: 'object' },
      },
    ]);
  });

  it('should wrap non-object parameters in object schema', () => {
    const tools: ProviderToolDefinition[] = [
      {
        name: 'test_tool',
        parameters: { location: { type: 'string' } },
      },
    ];

    const result = mapToolsToGemini(tools);

    expect(result[0].parametersJsonSchema).toEqual({
      type: 'object',
      properties: { location: { type: 'string' } },
    });
  });

  it('should preserve object schema', () => {
    const tools: ProviderToolDefinition[] = [
      {
        name: 'test_tool',
        parameters: {
          type: 'object',
          properties: { location: { type: 'string' } },
        },
      },
    ];

    const result = mapToolsToGemini(tools);

    expect(result[0].parametersJsonSchema).toEqual({
      type: 'object',
      properties: { location: { type: 'string' } },
    });
  });

  it('should map multiple tools', () => {
    const tools: ProviderToolDefinition[] = [
      { name: 'tool1', parameters: {} },
      { name: 'tool2', description: 'Tool 2', parameters: {} },
    ];

    const result = mapToolsToGemini(tools);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('tool1');
    expect(result[1].name).toBe('tool2');
  });
});

describe('mapToolChoiceToGemini', () => {
  it('should map undefined to undefined', () => {
    const result = mapToolChoiceToGemini(undefined);

    expect(result).toBeUndefined();
  });

  it('should map "none" to NONE mode', () => {
    const result = mapToolChoiceToGemini('none');

    expect(result).toEqual({ mode: FunctionCallingConfigMode.NONE });
  });

  it('should map "required" to ANY mode', () => {
    const result = mapToolChoiceToGemini('required');

    expect(result).toEqual({ mode: FunctionCallingConfigMode.ANY });
  });

  it('should map "auto" to AUTO mode', () => {
    const result = mapToolChoiceToGemini('auto');

    expect(result).toEqual({ mode: FunctionCallingConfigMode.AUTO });
  });

  it('should map function choice to ANY mode with allowedFunctionNames', () => {
    const choice: GatewayToolChoice = {
      type: 'function',
      function: { name: 'get_weather' },
    };

    const result = mapToolChoiceToGemini(choice);

    expect(result).toEqual({
      mode: FunctionCallingConfigMode.ANY,
      allowedFunctionNames: ['get_weather'],
    });
  });

  it('should default to AUTO when unknown choice type', () => {
    const choice = { type: 'unknown' } as unknown as GatewayToolChoice;

    const result = mapToolChoiceToGemini(choice);

    expect(result).toEqual({ mode: FunctionCallingConfigMode.AUTO });
  });
});

describe('mapTurnsToGeminiContents', () => {
  it('should map user turn', () => {
    const turns: ProviderChatTurn[] = [{ role: 'user', content: 'Hello' }];

    const result = mapTurnsToGeminiContents(turns);

    expect(result).toEqual([
      {
        role: 'user',
        parts: [{ text: 'Hello' }],
      },
    ]);
  });

  it('should map assistant turn', () => {
    const turns: ProviderChatTurn[] = [{ role: 'assistant', content: 'Hi!' }];

    const result = mapTurnsToGeminiContents(turns);

    expect(result).toEqual([
      {
        role: 'model',
        parts: [{ text: 'Hi!' }],
      },
    ]);
  });

  it('should map assistant turn with toolCalls', () => {
    const turns: ProviderAssistantTurn[] = [
      {
        role: 'assistant',
        content: 'Let me check',
        toolCalls: [
          {
            id: asToolCallId('call_1'),
            name: 'weather',
            arguments: '{"location":"SF"}',
          },
        ],
      },
    ];

    const result = mapTurnsToGeminiContents(turns);

    expect(result[0]).toEqual({
      role: 'model',
      parts: [
        { text: 'Let me check' },
        {
          functionCall: {
            id: 'call_1',
            name: 'weather',
            args: { location: 'SF' },
          },
        },
      ],
    });
  });

  it('should map tool result turn', () => {
    const turns: ProviderChatTurn[] = [
      {
        role: 'tool',
        toolCallId: asToolCallId('call_1'),
        content: '{"temp":72}',
      },
    ];

    const result = mapTurnsToGeminiContents(turns);

    expect(result[0].role).toBe('user');
    expect(result[0].parts).toHaveLength(1);
  });

  it('should handle empty assistant content', () => {
    const turns: ProviderAssistantTurn[] = [
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: asToolCallId('call_1'), name: 'weather', arguments: '{}' },
        ],
      },
    ];

    const result = mapTurnsToGeminiContents(turns);

    expect(result[0].parts).toHaveLength(1);
    expect(result[0].parts?.[0]).toHaveProperty('functionCall');
  });

  it('should handle mixed turns', () => {
    const turns: ProviderChatTurn[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
      { role: 'user', content: 'How are you?' },
    ];

    const result = mapTurnsToGeminiContents(turns);

    expect(result).toHaveLength(3);
    expect(result[0].role).toBe('user');
    expect(result[1].role).toBe('model');
    expect(result[2].role).toBe('user');
  });

  it('should parse tool call arguments as JSON', () => {
    const turns: ProviderAssistantTurn[] = [
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: asToolCallId('call_1'),
            name: 'weather',
            arguments: '{"location":"SF","units":"celsius"}',
          },
        ],
      },
    ];

    const result = mapTurnsToGeminiContents(turns);

    expect(result[0].parts?.[0]).toEqual({
      functionCall: {
        id: 'call_1',
        name: 'weather',
        args: { location: 'SF', units: 'celsius' },
      },
    });
  });
});

describe('parseGeminiResponseWithTools', () => {
  it('should parse text response', () => {
    const response = {
      text: 'Hello!',
      modelVersion: 'gemini-2.5-flash',
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 5,
      },
    };

    const result = parseGeminiResponseWithTools(response, 'gemini-2.5-flash');

    expect(result).toEqual({
      text: 'Hello!',
      stopReason: 'end_turn',
      model: 'gemini-2.5-flash',
      usage: {
        inputTokens: TEST_INPUT_TOKENS,
        outputTokens: asOutputTokens(5),
      },
    });
  });

  it('should parse response with function calls', () => {
    const response = {
      text: '',
      functionCalls: [
        { id: 'call_1', name: 'weather', args: { location: 'SF' } },
      ],
      modelVersion: 'gemini-2.5-flash',
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 5,
      },
    };

    const result = parseGeminiResponseWithTools(response, 'gemini-2.5-flash');

    expect(result.toolCalls).toEqual([
      {
        id: asToolCallId('call_1'),
        name: 'weather',
        arguments: '{"location":"SF"}',
      },
    ]);
    expect(result.stopReason).toBe('tool_use');
  });

  it('should generate call id when missing', () => {
    const response = {
      text: '',
      functionCalls: [{ name: 'weather', args: {} }],
      usageMetadata: {},
    };

    const result = parseGeminiResponseWithTools(response, 'gemini-2.5-flash');

    expect(result.toolCalls?.[0].id).toBe('call_weather');
  });

  it('should skip function calls without name', () => {
    const response = {
      text: '',
      functionCalls: [
        { id: 'call_1', args: {} },
        { id: 'call_2', name: 'valid', args: {} },
      ],
      usageMetadata: {},
    };

    const result = parseGeminiResponseWithTools(response, 'gemini-2.5-flash');

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls?.[0].name).toBe('valid');
  });

  it('should fallback to modelId when modelVersion missing', () => {
    const response = {
      text: 'Hello',
      usageMetadata: {},
    };

    const result = parseGeminiResponseWithTools(response, 'gemini-2.5-flash');

    expect(result.model).toBe('gemini-2.5-flash');
  });

  it('should handle missing usageMetadata', () => {
    const response = {
      text: 'Hello',
    };

    const result = parseGeminiResponseWithTools(response, 'gemini-2.5-flash');

    expect(result.usage).toBeUndefined();
  });

  it('should set stopReason to end_turn when no tool calls', () => {
    const response = {
      text: 'Hello',
      usageMetadata: {},
    };

    const result = parseGeminiResponseWithTools(response, 'gemini-2.5-flash');

    expect(result.stopReason).toBe('end_turn');
  });

  it('should set stopReason to tool_use when tool calls present', () => {
    const response = {
      text: '',
      functionCalls: [{ name: 'weather', args: {} }],
      usageMetadata: {},
    };

    const result = parseGeminiResponseWithTools(response, 'gemini-2.5-flash');

    expect(result.stopReason).toBe('tool_use');
  });
});
