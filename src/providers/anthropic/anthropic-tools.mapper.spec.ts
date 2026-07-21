import {
  mapToolsToAnthropic,
  mapToolChoiceToAnthropic,
  mapTurnsToAnthropicMessages,
  parseAnthropicResponseWithTools,
} from './anthropic-tools.mapper';
import type {
  ProviderToolDefinition,
  ProviderChatTurn,
  ProviderAssistantTurn,
} from '../interfaces/ai-provider.interface';
import type { GatewayToolChoice } from '../types/tooling-types';
import type Anthropic from '@anthropic-ai/sdk';
import { asToolCallId } from '../../common/types/branded.types';

describe('mapToolsToAnthropic', () => {
  it('should map single tool', () => {
    const tools: ProviderToolDefinition[] = [
      {
        name: 'get_weather',
        description: 'Get weather',
        parameters: { type: 'object', properties: {} },
      },
    ];

    const result = mapToolsToAnthropic(tools);

    expect(result).toEqual([
      {
        name: 'get_weather',
        description: 'Get weather',
        input_schema: { type: 'object', properties: {} },
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

    const result = mapToolsToAnthropic(tools);

    expect(result).toEqual([
      {
        name: 'test_tool',
        input_schema: { type: 'object' },
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

    const result = mapToolsToAnthropic(tools);

    expect(result[0].input_schema).toEqual({
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

    const result = mapToolsToAnthropic(tools);

    expect(result[0].input_schema).toEqual({
      type: 'object',
      properties: { location: { type: 'string' } },
    });
  });

  it('should map multiple tools with wrapped empty parameters', () => {
    const tools: ProviderToolDefinition[] = [
      { name: 'tool1', parameters: {} },
      { name: 'tool2', description: 'Tool 2', parameters: {} },
    ];

    const result = mapToolsToAnthropic(tools);

    expect(result).toEqual([
      {
        name: 'tool1',
        input_schema: { type: 'object', properties: {} },
      },
      {
        name: 'tool2',
        description: 'Tool 2',
        input_schema: { type: 'object', properties: {} },
      },
    ]);
  });
});

describe('mapToolChoiceToAnthropic', () => {
  it('should map "auto" to {type:"auto"}', () => {
    const result = mapToolChoiceToAnthropic('auto');

    expect(result).toEqual({ type: 'auto' });
  });

  it('should map "none" to {type:"none"}', () => {
    const result = mapToolChoiceToAnthropic('none');

    expect(result).toEqual({ type: 'none' });
  });

  it('should map "required" to {type:"any"}', () => {
    const result = mapToolChoiceToAnthropic('required');

    expect(result).toEqual({ type: 'any' });
  });

  it('should map function choice to {type:"tool", name:"X"}', () => {
    const choice: GatewayToolChoice = {
      type: 'function',
      function: { name: 'get_weather' },
    };

    const result = mapToolChoiceToAnthropic(choice);

    expect(result).toEqual({ type: 'tool', name: 'get_weather' });
  });

  it('should return undefined when toolChoice undefined', () => {
    const result = mapToolChoiceToAnthropic(undefined);

    expect(result).toBeUndefined();
  });

  it('should return undefined for unrecognized toolChoice', () => {
    const result = mapToolChoiceToAnthropic(
      'invalid' as unknown as GatewayToolChoice,
    );

    expect(result).toBeUndefined();
  });
});

describe('mapTurnsToAnthropicMessages', () => {
  it('should map user turn', () => {
    const turns: ProviderChatTurn[] = [{ role: 'user', content: 'Hello' }];

    const result = mapTurnsToAnthropicMessages(turns);

    expect(result).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('should map assistant turn', () => {
    const turns: ProviderChatTurn[] = [{ role: 'assistant', content: 'Hi!' }];

    const result = mapTurnsToAnthropicMessages(turns);

    expect(result).toEqual([{ role: 'assistant', content: 'Hi!' }]);
  });

  it('should map assistant turn with toolCalls', () => {
    const turns: ProviderAssistantTurn[] = [
      {
        role: 'assistant',
        content: 'Let me check',
        toolCalls: [
          { id: asToolCallId('call_1'), name: 'weather', arguments: '{}' },
          {
            id: asToolCallId('call_2'),
            name: 'search',
            arguments: '{"query":"rain"}',
          },
        ],
      },
    ];

    const result = mapTurnsToAnthropicMessages(turns);

    expect(result[0]).toEqual({
      role: 'assistant',
      content: [
        { type: 'text', text: 'Let me check' },
        { type: 'tool_use', id: 'call_1', name: 'weather', input: {} },
        {
          type: 'tool_use',
          id: 'call_2',
          name: 'search',
          input: { query: 'rain' },
        },
      ],
    });
  });

  it('should map assistant turn with toolCalls and empty content as tool_use blocks only', () => {
    const turns: ProviderAssistantTurn[] = [
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: asToolCallId('call_1'), name: 'weather', arguments: '{}' },
        ],
      },
    ];

    const result = mapTurnsToAnthropicMessages(turns);

    expect(result[0]).toEqual({
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'call_1', name: 'weather', input: {} }],
    });
  });

  it('should fall back to empty object for invalid toolCall arguments JSON', () => {
    const turns: ProviderAssistantTurn[] = [
      {
        role: 'assistant',
        content: 'Calling tool',
        toolCalls: [
          {
            id: asToolCallId('call_1'),
            name: 'weather',
            arguments: 'not-json',
          },
        ],
      },
    ];

    const result = mapTurnsToAnthropicMessages(turns);

    expect(result[0]).toEqual({
      role: 'assistant',
      content: [
        { type: 'text', text: 'Calling tool' },
        { type: 'tool_use', id: 'call_1', name: 'weather', input: {} },
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

    const result = mapTurnsToAnthropicMessages(turns);

    expect(result).toEqual([
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'call_1',
            content: '{"temp":72}',
          },
        ],
      },
    ]);
  });

  it('should merge consecutive tool results into single user message', () => {
    const turns: ProviderChatTurn[] = [
      { role: 'tool', toolCallId: asToolCallId('call_1'), content: 'result1' },
      { role: 'tool', toolCallId: asToolCallId('call_2'), content: 'result2' },
    ];

    const result = mapTurnsToAnthropicMessages(turns);

    expect(result).toEqual([
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'call_1', content: 'result1' },
          { type: 'tool_result', tool_use_id: 'call_2', content: 'result2' },
        ],
      },
    ]);
  });

  it('should handle mixed turns', () => {
    const turns: ProviderChatTurn[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
      { role: 'user', content: 'How are you?' },
    ];

    const result = mapTurnsToAnthropicMessages(turns);

    expect(result).toHaveLength(3);
    expect(result[0].role).toBe('user');
    expect(result[1].role).toBe('assistant');
    expect(result[2].role).toBe('user');
  });
});

describe('parseAnthropicResponseWithTools', () => {
  const thinkingBlock = (thinking: string): Anthropic.ContentBlock => ({
    type: 'thinking',
    thinking,
    signature: 'test-signature',
  });

  it('should parse text response', () => {
    const response = {
      id: 'msg-123',
      model: 'claude-sonnet-4',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello!' }],
      usage: { input_tokens: 10, output_tokens: 5 },
      stop_reason: 'end_turn',
      type: 'message',
    } as Anthropic.Message;

    const result = parseAnthropicResponseWithTools(response);

    expect(result).toEqual({
      text: 'Hello!',
      model: 'claude-sonnet-4',
      usage: { inputTokens: 10, outputTokens: 5 },
      stopReason: 'end_turn',
    });
  });

  it('should parse response with tool_use', () => {
    const response = {
      id: 'msg-123',
      model: 'claude-sonnet-4',
      role: 'assistant',
      content: [
        { type: 'text', text: 'Let me check' },
        {
          type: 'tool_use',
          id: 'call_1',
          name: 'weather',
          input: { location: 'SF' },
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
      stop_reason: 'tool_use',
      type: 'message',
    } as Anthropic.Message;

    const result = parseAnthropicResponseWithTools(response);

    expect(result.text).toBe('Let me check');
    expect(result.toolCalls).toEqual([
      { id: 'call_1', name: 'weather', arguments: '{"location":"SF"}' },
    ]);
    expect(result.stopReason).toBe('tool_use');
  });

  it('should pass through string tool_use input without re-stringifying', () => {
    const response = {
      id: 'msg-123',
      model: 'claude-sonnet-4',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'call_1',
          name: 'weather',
          input: '{"raw":"json"}',
        },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
      type: 'message',
    } as Anthropic.Message;

    const result = parseAnthropicResponseWithTools(response);

    expect(result.toolCalls).toEqual([
      { id: 'call_1', name: 'weather', arguments: '{"raw":"json"}' },
    ]);
  });

  it('should stringify null tool_use input as empty object', () => {
    const response = {
      id: 'msg-123',
      model: 'claude-sonnet-4',
      role: 'assistant',
      content: [
        { type: 'tool_use', id: 'call_1', name: 'weather', input: null },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
      type: 'message',
    } as unknown as Anthropic.Message;

    const result = parseAnthropicResponseWithTools(response);

    expect(result.toolCalls).toEqual([
      { id: 'call_1', name: 'weather', arguments: '{}' },
    ]);
  });

  it('should map stop_reason correctly', () => {
    const stopReasons: Array<[Anthropic.StopReason, string]> = [
      ['end_turn', 'end_turn'],
      ['tool_use', 'tool_use'],
      ['max_tokens', 'max_tokens'],
      ['stop_sequence', 'stop_sequence'],
      ['pause_turn', 'pause_turn'],
      ['refusal', 'refusal'],
    ];

    for (const [anthropicReason, expectedReason] of stopReasons) {
      const response = {
        id: 'msg-123',
        model: 'claude-sonnet-4',
        role: 'assistant',
        content: [],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: anthropicReason,
        type: 'message',
      } as unknown as Anthropic.Message;

      const result = parseAnthropicResponseWithTools(response);
      expect(result.stopReason).toBe(expectedReason);
    }
  });

  it('should omit stopReason when stop_reason is missing', () => {
    const response = {
      id: 'msg-123',
      model: 'claude-sonnet-4',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello' }],
      usage: { input_tokens: 10, output_tokens: 5 },
      type: 'message',
    } as Anthropic.Message;

    const result = parseAnthropicResponseWithTools(response);

    expect(result.stopReason).toBeUndefined();
  });

  it('should omit stopReason when stop_reason is not in STOP_REASON_MAP', () => {
    const response = {
      id: 'msg-123',
      model: 'claude-sonnet-4',
      role: 'assistant',
      content: [],
      usage: { input_tokens: 10, output_tokens: 5 },
      stop_reason: 'model_context_window_exceeded' as Anthropic.StopReason,
      type: 'message',
    } as unknown as Anthropic.Message;

    const result = parseAnthropicResponseWithTools(response);

    expect(result.stopReason).toBeUndefined();
  });

  it('should include prompt cache hit tokens', () => {
    const response = {
      id: 'msg-123',
      model: 'claude-sonnet-4',
      role: 'assistant',
      content: [],
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_read_input_tokens: 100,
      },
      type: 'message',
    } as unknown as Anthropic.Message;

    const result = parseAnthropicResponseWithTools(response);

    expect(result.usageDetails?.promptCacheHitTokens).toBe(100);
  });

  it('should include prompt cache creation tokens', () => {
    const response = {
      id: 'msg-123',
      model: 'claude-sonnet-4',
      role: 'assistant',
      content: [],
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_creation_input_tokens: 200,
      },
      type: 'message',
    } as unknown as Anthropic.Message;

    const result = parseAnthropicResponseWithTools(response);

    expect(result.usageDetails?.promptCacheCreationTokens).toBe(200);
  });

  it('should include both prompt cache token types in usageDetails', () => {
    const response = {
      id: 'msg-123',
      model: 'claude-sonnet-4',
      role: 'assistant',
      content: [],
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_read_input_tokens: 100,
        cache_creation_input_tokens: 200,
      },
      type: 'message',
    } as unknown as Anthropic.Message;

    const result = parseAnthropicResponseWithTools(response);

    expect(result.usageDetails).toEqual({
      promptCacheHitTokens: 100,
      promptCacheCreationTokens: 200,
    });
  });

  it('should extract thinkingContent from thinking blocks', () => {
    const response = {
      id: 'msg-123',
      model: 'claude-sonnet-4',
      role: 'assistant',
      content: [
        thinkingBlock('Reasoning step'),
        { type: 'text', text: 'Final answer' },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
      type: 'message',
    } as Anthropic.Message;

    const result = parseAnthropicResponseWithTools(response);

    expect(result.text).toBe('Final answer');
    expect(result.thinkingContent).toBe('Reasoning step');
  });

  it('should concatenate multiple text blocks', () => {
    const response = {
      id: 'msg-123',
      model: 'claude-sonnet-4',
      role: 'assistant',
      content: [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: ' ' },
        { type: 'text', text: 'world' },
      ],
      usage: { input_tokens: 10, output_tokens: 5 },
      type: 'message',
    } as Anthropic.Message;

    const result = parseAnthropicResponseWithTools(response);

    expect(result.text).toBe('Hello world');
  });
});
