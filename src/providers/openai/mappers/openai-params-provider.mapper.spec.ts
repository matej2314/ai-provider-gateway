import {
  mapCallOptionsToChatCompletionParams,
  mapCallOptionsToResponsesParams,
  mapMaxOutputTokensForChatCompletions,
} from './openai-params-provider.mapper';
import { asJsonSchemaName } from '../../../common/types/branded.types';

describe('openai-params-provider.mapper', () => {
  describe('mapMaxOutputTokensForChatCompletions', () => {
    it('uses max_tokens for legacy models', () => {
      expect(
        mapMaxOutputTokensForChatCompletions('gpt-3.5-turbo', 512),
      ).toEqual({
        max_tokens: 512,
      });
    });

    it('uses max_completion_tokens for gpt-4o', () => {
      expect(mapMaxOutputTokensForChatCompletions('gpt-4o', 512)).toEqual({
        max_completion_tokens: 512,
      });
    });

    it('uses max_completion_tokens for o-series models', () => {
      expect(mapMaxOutputTokensForChatCompletions('o3-mini', 1024)).toEqual({
        max_completion_tokens: 1024,
      });
    });

    it('returns empty object when maxOutputTokens is undefined', () => {
      expect(mapMaxOutputTokensForChatCompletions('gpt-4o')).toEqual({});
    });
  });

  describe('mapCallOptionsToChatCompletionParams', () => {
    it('disables thinking by default for chat-completions (DeepSeek V4 compat)', () => {
      expect(mapCallOptionsToChatCompletionParams('deepseek-v4-flash')).toEqual(
        {
          thinking: { type: 'disabled' },
        },
      );
    });

    it('enables thinking when thinkingEnabled is true', () => {
      expect(
        mapCallOptionsToChatCompletionParams('deepseek-v4-flash', {
          thinkingEnabled: true,
        }),
      ).toEqual({
        thinking: { type: 'enabled' },
      });
    });

    it('maps json_object response format', () => {
      expect(
        mapCallOptionsToChatCompletionParams('gpt-4o', {
          responseFormat: { type: 'json_object' },
        }),
      ).toEqual({
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
      });
    });

    it('maps json_schema response format with default name', () => {
      expect(
        mapCallOptionsToChatCompletionParams('gpt-4o', {
          responseFormat: {
            type: 'json_schema',
            jsonSchema: { type: 'object', properties: {} },
          },
        }),
      ).toEqual({
        thinking: { type: 'disabled' },
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'gateway_response',
            schema: { type: 'object', properties: {} },
            strict: true,
          },
        },
      });
    });

    it('does not send both max_tokens and max_completion_tokens', () => {
      const params = mapCallOptionsToChatCompletionParams('gpt-4o', {
        maxOutputTokens: 256,
      });

      expect(params).toEqual({
        thinking: { type: 'disabled' },
        max_completion_tokens: 256,
      });
      expect(params).not.toHaveProperty('max_tokens');
    });
  });

  describe('mapCallOptionsToResponsesParams', () => {
    it('maps max_output_tokens and json_object format', () => {
      expect(
        mapCallOptionsToResponsesParams({
          maxOutputTokens: 128,
          responseFormat: { type: 'json_object' },
        }),
      ).toEqual({
        max_output_tokens: 128,
        text: { format: { type: 'json_object' } },
      });
    });

    it('maps json_schema format for Responses API', () => {
      expect(
        mapCallOptionsToResponsesParams({
          responseFormat: {
            type: 'json_schema',
            jsonSchemaName: asJsonSchemaName('my_schema'),
            jsonSchema: { type: 'object' },
          },
        }),
      ).toEqual({
        text: {
          format: {
            type: 'json_schema',
            name: 'my_schema',
            schema: { type: 'object' },
            strict: true,
          },
        },
      });
    });

    it('maps parallel_tool_calls', () => {
      expect(
        mapCallOptionsToResponsesParams({ parallelToolCalls: false }),
      ).toEqual({
        parallel_tool_calls: false,
      });
    });
  });
});
