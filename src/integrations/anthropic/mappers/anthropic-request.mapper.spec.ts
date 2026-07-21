import { BadRequestException, HttpException } from '@nestjs/common';
import { mapAnthropicRequestToGateway } from './anthropic-request.mapper';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import { TEST_MODEL_ALIAS } from '../../../common/mocks/test-constants';
import type { AnthropicMessagesRequestDto } from '../dtos/anthropic-messages-request.dto';

describe('mapAnthropicRequestToGateway', () => {
  describe('Happy path - basic request', () => {
    it('should map minimal request (model + text message)', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
        ],
        max_tokens: 1024,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result).toEqual({
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hello' }],
        params: { maxOutputTokens: 1024 },
      });
    });

    it('should map request with temperature', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        temperature: 0.7,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.temperature).toBe(0.7);
      expect(result.params?.maxOutputTokens).toBe(1024);
    });
  });

  describe('Happy path - params mapping (C1-C2, C6)', () => {
    it('should map top_p parameter', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        top_p: 0.95,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.topP).toBe(0.95);
    });

    it('should map top_k parameter (Anthropic-specific)', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        top_k: 40,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.topK).toBe(40);
    });

    it('should map stop_sequences parameter', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        stop_sequences: ['\n\n', '###'],
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.stop).toEqual(['\n\n', '###']);
    });

    it('should map all params simultaneously', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 2048,
        temperature: 0.8,
        top_p: 0.9,
        top_k: 50,
        stop_sequences: ['\n\n', 'END'],
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params).toEqual({
        maxOutputTokens: 2048,
        temperature: 0.8,
        topP: 0.9,
        topK: 50,
        stop: ['\n\n', 'END'],
      });
    });
  });

  describe('Happy path - output_config response format (C3)', () => {
    it('should map output_config with json_schema to json_object', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: { name: { type: 'string' } },
            },
          },
        },
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.responseFormat).toEqual({
        type: 'json_object',
        jsonSchema: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
      });
    });

    it('should map output_config without format to text', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        output_config: {},
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.responseFormat).toEqual({
        type: 'text',
        jsonSchema: undefined,
      });
    });

    it('should map output_config with explicit text format', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        output_config: {
          format: { type: 'text' },
        } as unknown as AnthropicMessagesRequestDto['output_config'],
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.responseFormat).toEqual({
        type: 'text',
        jsonSchema: undefined,
      });
    });
  });

  describe('Happy path - thinking mode (C8)', () => {
    it('should map thinking.type=enabled with budget_tokens', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'Solve' }] },
        ],
        max_tokens: 4096,
        thinking: {
          type: 'enabled',
          budget_tokens: 2048,
        },
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.thinkingEnabled).toBe(true);
      expect(result.params?.thinkingBudget).toBe(2048);
    });

    it('should map thinking.type=enabled without budget (adaptive)', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'Solve' }] },
        ],
        max_tokens: 4096,
        thinking: {
          type: 'enabled',
        },
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.thinkingEnabled).toBe(true);
      expect(result.params?.thinkingBudget).toBeUndefined();
    });

    it('should not map thinking when type=disabled', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        thinking: {
          type: 'disabled',
        },
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.thinkingEnabled).toBeUndefined();
      expect(result.params?.thinkingBudget).toBeUndefined();
    });

    it('should map output_config.effort as thinkingBudget when no thinking block', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        output_config: {
          effort: 'high',
        },
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.thinkingBudget).toBe('high');
    });

    it('should not map output_config.effort when thinking block present', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        thinking: { type: 'enabled', budget_tokens: 1024 },
        output_config: {
          effort: 'high',
        },
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.thinkingEnabled).toBe(true);
      expect(result.params?.thinkingBudget).toBe(1024);
    });

    it('should not set thinkingBudget when budget_tokens is 0', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        thinking: { type: 'enabled', budget_tokens: 0 },
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.thinkingEnabled).toBe(true);
      expect(result.params?.thinkingBudget).toBeUndefined();
    });
  });

  describe('Happy path - metadata (C5)', () => {
    it('should map metadata.user_id', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        metadata: { user_id: 'user123' },
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.metadata).toEqual({ userId: 'user123' });
    });

    it('should not set metadata when not provided', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.metadata).toBeUndefined();
    });

    it('should map metadata.user_id without any params', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        metadata: { user_id: 'user456' },
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.metadata).toEqual({ userId: 'user456' });
      expect(result.params).toBeUndefined();
    });
  });

  describe('Happy path - tools (T5A)', () => {
    it('should map tools to tooling.definitions', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        tools: [
          {
            name: 'get_weather',
            description: 'Get weather',
            input_schema: { type: 'object', properties: {} },
          },
        ],
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.tooling?.definitions).toBeDefined();
      expect(result.tooling?.definitions).toHaveLength(1);
      expect(result.tooling?.definitions?.[0].name).toBe('get_weather');
    });

    it('should map tool_choice to tooling.toolChoice', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        tools: [{ name: 'get_weather', input_schema: {} }],
        tool_choice: { type: 'auto' },
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.tooling?.toolChoice).toBe('auto');
    });

    it('should not set tooling when no tools provided', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.tooling).toBeUndefined();
    });

    it('should set tooling with toolChoice only when tools not provided', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        tool_choice: { type: 'auto' },
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.tooling).toEqual({ toolChoice: 'auto' });
      expect(result.tooling?.definitions).toBeUndefined();
    });
  });

  describe('Edge case - empty messages validation', () => {
    it('should throw when no messages after mapping', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [],
        max_tokens: 1024,
      };

      expect(() => mapAnthropicRequestToGateway(anthropicRequest)).toThrow(
        BadRequestException,
      );

      try {
        mapAnthropicRequestToGateway(anthropicRequest);
      } catch (e) {
        const error = e as HttpException;
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.getResponse()).toMatchObject({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: 'At least one message is required.',
        });
      }
    });
  });

  describe('Edge case - minimal request without params', () => {
    it('should not create params when only model and messages provided', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result).toEqual({
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      expect(result.params).toBeUndefined();
    });
  });

  describe('Edge case - undefined/null parameters', () => {
    it('should not create params when only max_tokens provided', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        temperature: undefined,
        top_p: undefined,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params).toEqual({ maxOutputTokens: 1024 });
    });

    it('should ignore undefined parameters', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        temperature: 0.7,
        top_p: undefined,
        top_k: undefined,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params).toEqual({
        maxOutputTokens: 1024,
        temperature: 0.7,
      });
    });
  });

  describe('Edge case - zero values', () => {
    it('should map zero temperature', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        temperature: 0,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.temperature).toBe(0);
    });

    it('should map zero top_k', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        top_k: 0,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.topK).toBe(0);
    });
  });

  describe('Edge case - boundary values', () => {
    it('should map minimum temperature (0)', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        temperature: 0,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.temperature).toBe(0);
    });

    it('should map maximum temperature (2)', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        temperature: 2,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.temperature).toBe(2);
    });

    it('should map minimum topP (0)', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        top_p: 0,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.topP).toBe(0);
    });

    it('should map maximum topP (1)', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        top_p: 1,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.topP).toBe(1);
    });

    it('should map minimum thinking budget (1024)', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 4096,
        thinking: { type: 'enabled', budget_tokens: 1024 },
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.thinkingBudget).toBe(1024);
    });
  });

  describe('Edge case - empty collections', () => {
    it('should map empty stop_sequences', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        stop_sequences: [],
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.stop).toEqual([]);
    });

    it('should handle empty tools array', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        max_tokens: 1024,
        tools: [],
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.tooling).toBeUndefined();
    });
  });

  describe('Integration - complex real-world scenarios', () => {
    it('should map full production request with all parameters', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'Generate poem' }] },
          {
            role: 'assistant',
            content: [{ type: 'text', text: 'Here is a poem...' }],
          },
          {
            role: 'user',
            content: [{ type: 'text', text: 'Make it longer' }],
          },
        ],
        max_tokens: 2048,
        temperature: 0.9,
        top_p: 0.95,
        top_k: 40,
        stop_sequences: ['\n\n', '---'],
        metadata: { user_id: 'user123' },
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.modelAlias).toBe(TEST_MODEL_ALIAS);
      expect(result.messages).toHaveLength(3);
      expect(result.params).toEqual({
        maxOutputTokens: 2048,
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        stop: ['\n\n', '---'],
      });
      expect(result.metadata).toEqual({ userId: 'user123' });
    });

    it('should map thinking mode request', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'Solve' }] },
        ],
        max_tokens: 8192,
        thinking: {
          type: 'enabled',
          budget_tokens: 4096,
        },
        temperature: 1.0,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params).toEqual({
        maxOutputTokens: 8192,
        temperature: 1.0,
        thinkingEnabled: true,
        thinkingBudget: 4096,
      });
    });

    it('should map structured output request', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'Return JSON' }] },
        ],
        max_tokens: 1024,
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'number' },
              },
              required: ['name'],
            },
          },
        },
        temperature: 0.2,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.params?.responseFormat).toEqual({
        type: 'json_object',
        jsonSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name'],
        },
      });
      expect(result.params?.temperature).toBe(0.2);
    });

    it('should map tool calling request', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'What is weather?' }],
          },
        ],
        max_tokens: 1024,
        tools: [
          {
            name: 'get_weather',
            description: 'Get current weather',
            input_schema: {
              type: 'object',
              properties: {
                location: { type: 'string' },
              },
              required: ['location'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'get_weather' },
        temperature: 0.5,
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.tooling?.definitions).toBeDefined();
      expect(result.tooling?.toolChoice).toEqual({
        type: 'function',
        function: { name: 'get_weather' },
      });
      expect(result.params).toEqual({
        maxOutputTokens: 1024,
        temperature: 0.5,
      });
    });
  });

  describe('Message mapping delegation', () => {
    it('should map assistant tool_use message via content blocks', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [
          {
            role: 'assistant',
            content: [
              { type: 'text', text: 'Checking weather' },
              {
                type: 'tool_use',
                id: 'toolu_123',
                name: 'get_weather',
                input: { location: 'SF' },
              },
            ],
          },
        ],
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.messages).toEqual([
        {
          role: 'assistant',
          content: 'Checking weather',
          toolCalls: [
            {
              id: 'toolu_123',
              name: 'get_weather',
              arguments: '{"location":"SF"}',
            },
          ],
        },
      ]);
    });

    it('should expand user tool_result into separate tool message', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Here is the result' },
              {
                type: 'tool_result',
                tool_use_id: 'toolu_123',
                content: '{"temp":72}',
              },
            ],
          },
        ],
      };

      const result = mapAnthropicRequestToGateway(anthropicRequest);

      expect(result.messages).toEqual([
        { role: 'user', content: 'Here is the result' },
        {
          role: 'tool',
          toolCallId: 'toolu_123',
          content: '{"temp":72}',
        },
      ]);
    });

    it('should throw when message contains image block', () => {
      const anthropicRequest: AnthropicMessagesRequestDto = {
        model: TEST_MODEL_ALIAS,
        messages: [
          {
            role: 'user',
            content: [{ type: 'image', source: {} }] as any,
          },
        ],
      };

      expect(() => mapAnthropicRequestToGateway(anthropicRequest)).toThrow(
        BadRequestException,
      );

      try {
        mapAnthropicRequestToGateway(anthropicRequest);
      } catch (e) {
        const error = e as HttpException;
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.getResponse()).toMatchObject({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: 'Image content block are not supported.',
        });
      }
    });
  });
});
