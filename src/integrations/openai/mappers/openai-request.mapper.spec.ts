import { mapOpenAiChatRequestToGateway } from './openai-request.mapper';
import type { OpenAiChatCompletionRequestDto } from '../dtos/openai-chat-completion-request.dto';
import { TEST_MODEL_ALIAS } from '../../../common/mocks/test-constants';

describe('mapOpenAiChatRequestToGateway', () => {
  describe('Basic request mapping', () => {
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

    it('should map basic parameters', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.95,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.temperature).toBe(0.7);
      expect(result.params?.maxOutputTokens).toBe(2048);
      expect(result.params?.topP).toBe(0.95);
    });

    it('should map stop sequences (string and array)', () => {
      const resultString = mapOpenAiChatRequestToGateway({
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        stop: '\n\n',
      });

      expect(resultString.params?.stop).toBe('\n\n');

      const resultArray = mapOpenAiChatRequestToGateway({
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        stop: ['\n\n', '###'],
      });

      expect(resultArray.params?.stop).toEqual(['\n\n', '###']);
    });

    it('should map penalty parameters', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        frequency_penalty: 0.5,
        presence_penalty: 0.8,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.frequencyPenalty).toBe(0.5);
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

    it('should map response_format parameter', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        response_format: { type: 'json_object' },
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.responseFormat).toEqual({ type: 'json_object' });
    });
  });

  describe('Tools mapping', () => {
    it('should map tools to tooling definitions', () => {
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

      expect(result.tooling).toBeDefined();
      expect(result.tooling?.definitions).toHaveLength(1);
      expect(result.tooling?.definitions?.[0]).toEqual({
        name: 'get_weather',
        description: 'Get weather',
        parameters: { type: 'object', properties: {} },
      });
    });

    it('should map tool_choice parameter', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        tools: [
          {
            type: 'function',
            function: { name: 'test', parameters: {} },
          },
        ],
        tool_choice: 'required',
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.tooling?.toolChoice).toBe('required');
    });

    it('should map function-specific tool_choice', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        tools: [
          {
            type: 'function',
            function: { name: 'get_weather', parameters: {} },
          },
        ],
        tool_choice: {
          type: 'function',
          function: { name: 'get_weather' },
        },
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.tooling?.toolChoice).toEqual({
        type: 'function',
        function: { name: 'get_weather' },
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle request with all supported parameters', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.95,
        stop: ['\n\n'],
        frequency_penalty: 0.5,
        presence_penalty: 0.3,
        seed: 42,
        response_format: { type: 'json_object' },
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params).toEqual({
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.95,
        stop: ['\n\n'],
        frequencyPenalty: 0.5,
        presencePenalty: 0.3,
        seed: 42,
        responseFormat: { type: 'json_object' },
      });
    });

    it('should omit undefined parameters', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: undefined,
        max_tokens: undefined,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params).toBeUndefined();
    });

    it('should handle zero values correctly', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0,
        seed: 0,
        frequency_penalty: 0,
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.params?.temperature).toBe(0);
      expect(result.params?.seed).toBe(0);
      expect(result.params?.frequencyPenalty).toBe(0);
    });

    it('should handle empty tools array', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
        tools: [],
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.tooling).toBeUndefined();
    });
  });

  describe('Complex messages', () => {
    it('should map user and assistant messages (system filtered)', () => {
      const openAiRequest: OpenAiChatCompletionRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
          { role: 'user', content: 'How are you?' },
        ],
      };

      const result = mapOpenAiChatRequestToGateway(openAiRequest);

      expect(result.messages).toHaveLength(3);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[2].role).toBe('user');
    });
  });
});
