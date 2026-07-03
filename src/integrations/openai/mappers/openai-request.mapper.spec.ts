import { mapOpenAiChatRequestToGateway } from './openai-request.mapper';
import type { OpenAiChatCompletionRequestDto } from '../dtos/openai-chat-completion-request.dto';
import { TEST_MODEL_ALIAS } from '../../../common/mocks/test-constants';

describe('mapOpenAiChatRequestToGateway', () => {
  describe('Happy path - basic request', () => {
    it('should map minimal request (model + messages)', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result).toEqual({
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hello' }],
      });
    });

    it('should map request with temperature', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.7,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.temperature).toBe(0.7);
    });

    it('should map request with max_tokens', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 2048,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.maxOutputTokens).toBe(2048);
    });
  });

  describe('Happy path - params mapping (C1-C2)', () => {
    it('should map top_p parameter', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        top_p: 0.95,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.topP).toBe(0.95);
    });

    it('should map stop parameter (string)', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        stop: '\n\n',
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.stop).toBe('\n\n');
    });

    it('should map stop parameter (array)', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        stop: ['\n\n', '###', 'END'],
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.stop).toEqual(['\n\n', '###', 'END']);
    });

    it('should map frequency_penalty parameter', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        frequency_penalty: 0.5,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.frequencyPenalty).toBe(0.5);
    });

    it('should map presence_penalty parameter', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        presence_penalty: 0.8,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.presencePenalty).toBe(0.8);
    });

    it('should map seed parameter', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        seed: 42,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.seed).toBe(42);
    });

    it('should map all params simultaneously', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.9,
        max_tokens: 2048,
        top_p: 0.95,
        stop: ['\n\n'],
        frequency_penalty: 0.3,
        presence_penalty: 0.6,
        seed: 999,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params).toEqual({
        temperature: 0.9,
        maxOutputTokens: 2048,
        topP: 0.95,
        stop: ['\n\n'],
        frequencyPenalty: 0.3,
        presencePenalty: 0.6,
        seed: 999,
      });
    });
  });

  describe('Happy path - response format (C3)', () => {
    it('should map response_format json_object', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        response_format: { type: 'json_object' },
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.responseFormat).toEqual({ type: 'json_object' });
    });

    it('should map response_format text (default)', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        response_format: { type: 'text' },
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.responseFormat).toEqual({ type: 'text' });
    });
  });

  describe('Happy path - max_completion_tokens (C6)', () => {
    it('should map max_completion_tokens (takes precedence over max_tokens)', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1024,
        max_completion_tokens: 2048,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.maxOutputTokens).toBe(2048);
    });

    it('should use max_tokens when max_completion_tokens not provided', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1024,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.maxOutputTokens).toBe(1024);
    });
  });

  describe('Happy path - thinking mode (C8)', () => {
    it('should map reasoning_effort to thinking mode', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Solve this' }],
        reasoning_effort: 'high',
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.thinkingEnabled).toBe(true);
      expect(result.params?.thinkingBudget).toBe('high');
    });

    it('should map reasoning_effort with all effort levels', () => {
      const efforts = [
        'none',
        'minimal',
        'low',
        'medium',
        'high',
        'xhigh',
        'max',
      ] as const;

      for (const effort of efforts) {
        const openAiRequest: OpenAiChatCompletionRequestDto = {
          model: TEST_MODEL_ALIAS,
          messages: [{ role: 'user', content: 'Hi' }],
          reasoning_effort:
            effort as OpenAiChatCompletionRequestDto['reasoning_effort'],
        };

        const result = mapOpenAiChatRequestToGateway(openAiRequest);

        if (effort === 'none') {
          expect(result.params?.thinkingEnabled).toBe(false);
          expect(result.params?.thinkingBudget).toBeUndefined();
        } else {
          expect(result.params?.thinkingEnabled).toBe(true);
          expect(result.params?.thinkingBudget).toBe(effort);
        }
      }
    });

    it('should map reasoning_effort none to thinkingEnabled false', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        reasoning_effort: 'none',
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.thinkingEnabled).toBe(false);
      expect(result.params?.thinkingBudget).toBeUndefined();
    });

    it('should not set thinking mode when reasoning_effort not provided', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.thinkingEnabled).toBeUndefined();
      expect(result.params?.thinkingBudget).toBeUndefined();
    });
  });

  describe('Happy path - metadata (C5)', () => {
    it('should map metadata', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        metadata: { userId: '123', sessionId: 'abc' },
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.metadata).toEqual({ userId: '123', sessionId: 'abc' });
    });

    it('should not set metadata when not provided', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.metadata).toBeUndefined();
    });
  });

  describe('Happy path - tools (T5)', () => {
    it('should map tools to tooling.definitions', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get weather',
              parameters: { type: 'object', properties: {} },
            },
          },
        ],
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.tooling?.definitions).toBeDefined();
      expect(result.tooling?.definitions).toHaveLength(1);
      expect(result.tooling?.definitions?.[0].name).toBe('get_weather');
    });

    it('should map tool_choice to tooling.toolChoice', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        tools: [
          {
            type: 'function',
            function: { name: 'get_weather', parameters: {} },
          },
        ],
        tool_choice: 'auto',
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.tooling?.toolChoice).toBe('auto');
    });

    it('should not set tooling when no tools provided', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.tooling).toBeUndefined();
    });

    it('should set tooling with toolChoice only when tools not provided', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        tool_choice: 'auto',
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.tooling).toEqual({ toolChoice: 'auto' });
      expect(result.tooling?.definitions).toBeUndefined();
    });

    it('should set tooling with toolChoice when tools array is empty', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        tools: [],
        tool_choice: 'required',
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.tooling).toEqual({ toolChoice: 'required' });
      expect(result.tooling?.definitions).toBeUndefined();
    });

    it('should map parallel_tool_calls to params.parallelToolCalls', () => {
      const result = mapOpenAiChatRequestToGateway({
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        parallel_tool_calls: false,
      });

      expect(result.params?.parallelToolCalls).toBe(false);
    });

    it('should map parallel_tool_calls when it is the only param', () => {
      const result = mapOpenAiChatRequestToGateway({
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        parallel_tool_calls: true,
      });

      expect(result.params).toEqual({ parallelToolCalls: true });
    });
  });

  describe('Edge case - undefined/null parameters', () => {
    it('should not create params object when all params undefined', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: undefined,
        max_tokens: undefined,
        top_p: undefined,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params).toBeUndefined();
    });

    it('should ignore undefined parameters and only map defined ones', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.7,
        max_tokens: undefined,
        top_p: 0.9,
        stop: undefined,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params).toEqual({
        temperature: 0.7,
        topP: 0.9,
      });
    });
  });

  describe('Edge case - zero values', () => {
    it('should map zero temperature', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.temperature).toBe(0);
    });

    it('should map zero penalties', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        frequency_penalty: 0,
        presence_penalty: 0,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.frequencyPenalty).toBe(0);
      expect(result.params?.presencePenalty).toBe(0);
    });

    it('should map zero seed', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        seed: 0,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.seed).toBe(0);
    });
  });

  describe('Edge case - boundary values', () => {
    it('should map minimum temperature (0)', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.temperature).toBe(0);
    });

    it('should map maximum temperature (2)', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 2,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.temperature).toBe(2);
    });

    it('should map minimum topP (0)', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        top_p: 0,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.topP).toBe(0);
    });

    it('should map maximum topP (1)', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        top_p: 1,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.topP).toBe(1);
    });

    it('should map minimum penalties (-2)', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        frequency_penalty: -2,
        presence_penalty: -2,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.frequencyPenalty).toBe(-2);
      expect(result.params?.presencePenalty).toBe(-2);
    });

    it('should map maximum penalties (2)', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        frequency_penalty: 2,
        presence_penalty: 2,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.frequencyPenalty).toBe(2);
      expect(result.params?.presencePenalty).toBe(2);
    });

    it('should map maximum seed (2^32 - 1)', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        seed: 2 ** 32 - 1,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.seed).toBe(4294967295);
    });
  });

  describe('Edge case - empty collections', () => {
    it('should map empty stop array', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        stop: [],
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.stop).toEqual([]);
    });

    it('should map empty string stop', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        stop: '',
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.stop).toBe('');
    });

    it('should map empty metadata', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        metadata: {},
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.metadata).toEqual({});
    });
  });

  describe('Integration - complex real-world scenarios', () => {
    it('should map full production request with all parameters', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [
          { role: 'user', content: 'Generate a poem' },
          { role: 'assistant', content: 'Here is a poem...' },
          { role: 'user', content: 'Make it longer' },
        ],
        temperature: 0.9,
        max_tokens: 2048,
        top_p: 0.95,
        stop: ['\n\n', '---'],
        frequency_penalty: 0.3,
        presence_penalty: 0.6,
        seed: 42,
        response_format: { type: 'text' },
        metadata: { userId: 'user123', sessionId: 'sess456' },
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.modelAlias).toBe(TEST_MODEL_ALIAS);
      expect(result.messages).toHaveLength(3);
      expect(result.params).toEqual({
        temperature: 0.9,
        maxOutputTokens: 2048,
        topP: 0.95,
        stop: ['\n\n', '---'],
        frequencyPenalty: 0.3,
        presencePenalty: 0.6,
        seed: 42,
        responseFormat: { type: 'text' },
      });
      expect(result.metadata).toEqual({
        userId: 'user123',
        sessionId: 'sess456',
      });
    });

    it('should map reasoning request with thinking mode', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Solve complex problem' }],
        max_completion_tokens: 8192,
        reasoning_effort:
          'max' as OpenAiChatCompletionRequestDto['reasoning_effort'],
        temperature: 1.0,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params).toEqual({
        maxOutputTokens: 8192,
        thinkingEnabled: true,
        thinkingBudget: 'max',
        temperature: 1.0,
      });
    });

    it('should map tool calling request with all features', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'What is the weather?' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get current weather',
              parameters: {
                type: 'object',
                properties: {
                  location: { type: 'string' },
                },
                required: ['location'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'get_weather' } },
        temperature: 0.5,
        max_tokens: 1024,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.tooling?.definitions).toBeDefined();
      expect(result.tooling?.toolChoice).toEqual({
        type: 'function',
        function: { name: 'get_weather' },
      });
      expect(result.params).toEqual({
        temperature: 0.5,
        maxOutputTokens: 1024,
      });
    });

    it('should map JSON mode request', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [
          { role: 'user', content: 'Return user data in JSON format' },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.responseFormat).toEqual({ type: 'json_object' });
      expect(result.params?.temperature).toBe(0.2);
    });
  });
});
