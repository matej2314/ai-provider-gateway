jest.mock('uuid', () => ({
  v4: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
}));

import { Test } from '@nestjs/testing';
import {
  ChatResponseBuilderService,
  type ProviderResponse,
} from './chat-response-builder.service';
import {
  TEST_CONVERSATION_ID,
  TEST_MODEL_ALIAS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_REQUEST_ID,
  TEST_RESPONSE_ID_PREFIX,
  TEST_INPUT_TOKENS,
  TEST_OUTPUT_TOKENS,
  TEST_PROMPT_CACHE_HIT_TOKENS,
  TEST_PROMPT_CACHE_CREATION_TOKENS,
} from '../../common/mocks/test-constants';
import {
  asInputTokens,
  asModelAlias,
  asOutputTokens,
  asPromptCacheHitTokens,
  asSystemFingerprint,
  asToolCallId,
} from '../../common/types/branded.types';
import type { GatewayToolCall } from '../../providers/types/tooling-types';

describe('ChatResponseBuilderService', () => {
  let service: ChatResponseBuilderService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ChatResponseBuilderService],
    }).compile();

    service = module.get(ChatResponseBuilderService);
  });

  describe('buildChatResponse', () => {
    const baseProviderResponse: ProviderResponse = {
      text: 'Hello world',
      stopReason: 'end_turn',
      usage: {
        inputTokens: TEST_INPUT_TOKENS,
        outputTokens: TEST_OUTPUT_TOKENS,
        totalTokens: 30,
      },
    };

    describe('Happy path', () => {
      it('should build minimal chat response with required fields', () => {
        const result = service.buildChatResponse(
          baseProviderResponse,
          'anthropic',
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CONVERSATION_ID,
        );

        expect(result).toEqual({
          id: TEST_RESPONSE_ID_PREFIX,
          provider: 'anthropic',
          model: TEST_MODEL_ALIAS,
          output: { type: 'text', text: 'Hello world' },
          usage: {
            inputTokens: TEST_INPUT_TOKENS,
            outputTokens: TEST_OUTPUT_TOKENS,
            totalTokens: 30,
          },
          requestId: TEST_REQUEST_ID,
          conversationId: TEST_CONVERSATION_ID,
          finishReason: 'stop',
        });
      });

      it('should include effectiveModelAlias when provided', () => {
        const result = service.buildChatResponse(
          baseProviderResponse,
          'anthropic',
          asModelAlias('primary-model'),
          TEST_REQUEST_ID,
          TEST_CONVERSATION_ID,
          asModelAlias('fallback-model'),
        );

        expect(result.effectiveModelAlias).toBe('fallback-model');
        expect(result.model).toBe('primary-model');
      });

      it('should include toolCalls when present', () => {
        const toolCalls: GatewayToolCall[] = [
          {
            id: asToolCallId('tc_1'),
            name: 'get_weather',
            arguments: JSON.stringify({ city: 'Warsaw' }),
          },
        ];
        const response: ProviderResponse = {
          ...baseProviderResponse,
          stopReason: 'tool_use',
          toolCalls,
        };

        const result = service.buildChatResponse(
          response,
          'anthropic',
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CONVERSATION_ID,
        );

        expect(result.toolCalls).toEqual(toolCalls);
        expect(result.finishReason).toBe('tool_calls');
      });

      it('should include usageDetails, systemFingerprint and thinkingContent', () => {
        const response: ProviderResponse = {
          ...baseProviderResponse,
          usageDetails: {
            promptCacheHitTokens: asPromptCacheHitTokens(5),
          },
          systemFingerprint: asSystemFingerprint('fp_abc123'),
          thinkingContent: 'Let me think...',
        };

        const result = service.buildChatResponse(
          response,
          'anthropic',
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CONVERSATION_ID,
        );

        expect(result.usageDetails).toEqual({
          promptCacheHitTokens: asPromptCacheHitTokens(5),
        });
        expect(result.systemFingerprint).toBe('fp_abc123');
        expect(result.thinkingContent).toBe('Let me think...');
      });
    });

    describe('finishReason mapping', () => {
      it('should map max_tokens to length', () => {
        const response: ProviderResponse = {
          text: 'Truncated',
          stopReason: 'max_tokens',
        };

        const result = service.buildChatResponse(
          response,
          'anthropic',
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CONVERSATION_ID,
        );

        expect(result.finishReason).toBe('length');
      });

      it('should map stop_sequence to stop', () => {
        const response: ProviderResponse = {
          text: 'Done',
          stopReason: 'stop_sequence',
        };

        const result = service.buildChatResponse(
          response,
          'anthropic',
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CONVERSATION_ID,
        );

        expect(result.finishReason).toBe('stop');
      });

      it('should default to stop for unknown stopReason', () => {
        const response: ProviderResponse = {
          text: 'Done',
          stopReason: undefined,
        };

        const result = service.buildChatResponse(
          response,
          'anthropic',
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CONVERSATION_ID,
        );

        expect(result.finishReason).toBe('stop');
      });
    });

    describe('Edge cases', () => {
      it('should omit effectiveModelAlias when not provided', () => {
        const result = service.buildChatResponse(
          baseProviderResponse,
          'anthropic',
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CONVERSATION_ID,
        );

        expect(result.effectiveModelAlias).toBeUndefined();
      });

      it('should omit toolCalls when array is empty', () => {
        const response: ProviderResponse = {
          ...baseProviderResponse,
          toolCalls: [],
        };

        const result = service.buildChatResponse(
          response,
          'anthropic',
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CONVERSATION_ID,
        );

        expect(result.toolCalls).toBeUndefined();
      });

      it('should omit thinkingContent when empty string', () => {
        const response: ProviderResponse = {
          ...baseProviderResponse,
          thinkingContent: '',
        };

        const result = service.buildChatResponse(
          response,
          'anthropic',
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CONVERSATION_ID,
        );

        expect(result.thinkingContent).toBeUndefined();
      });

      it('should generate unique id prefix gw_', () => {
        const result = service.buildChatResponse(
          baseProviderResponse,
          'anthropic',
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CONVERSATION_ID,
        );

        expect(result.id).toMatch(/^gw_/);
      });
    });

    it('should include warnings when options and providerType are passed', () => {
      const result = service.buildChatResponse(
        baseProviderResponse,
        'anthropic',
        TEST_MODEL_ALIAS_BRANDED,
        TEST_REQUEST_ID,
        TEST_CONVERSATION_ID,
        undefined,
        { frequencyPenalty: 0.5 },
        'anthropic',
      );

      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'PARAM_IGNORED_BY_PROVIDER',
            field: 'params.frequencyPenalty',
          }),
        ]),
      );
    });

    it('should omit warnings when providerType is missing', () => {
      const result = service.buildChatResponse(
        baseProviderResponse,
        'anthropic',
        TEST_MODEL_ALIAS_BRANDED,
        TEST_REQUEST_ID,
        TEST_CONVERSATION_ID,
        undefined,
        { frequencyPenalty: 0.5 },
        undefined,
      );

      expect(result.warnings).toBeUndefined();
    });

    it('should include warnings in stream done event', () => {
      const event = service.buildStreamDoneEvent(
        { inputTokens: asInputTokens(1), outputTokens: asOutputTokens(2) },
        undefined,
        'end_turn',
        undefined,
        undefined,
        { presencePenalty: 0.3 },
        'google',
      );

      if (event.name !== 'done') throw new Error('Expected done event');
      expect(event.data.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'params.presencePenalty' }),
        ]),
      );
    });
  });

  describe('buildStreamDoneEvent', () => {
    describe('Happy path', () => {
      it('should build done event with usage and totalTokens', () => {
        const event = service.buildStreamDoneEvent(
          { inputTokens: TEST_INPUT_TOKENS, outputTokens: asOutputTokens(25) },
          undefined,
          'end_turn',
          undefined,
          undefined,
        );

        expect(event).toEqual({
          name: 'done',
          data: {
            usage: {
              inputTokens: 10,
              outputTokens: 25,
              totalTokens: 35,
            },
            finishReason: 'stop',
          },
        });
      });

      it('should include toolCalls and map finishReason to tool_calls', () => {
        const toolCalls: GatewayToolCall[] = [
          {
            id: asToolCallId('tc_1'),
            name: 'search',
            arguments: JSON.stringify({ q: 'test' }),
          },
        ];

        const event = service.buildStreamDoneEvent(
          {
            inputTokens: asInputTokens(5),
            outputTokens: asOutputTokens(10),
          },
          toolCalls,
          'tool_use',
          asSystemFingerprint('fp_stream'),
          'reasoning block',
        );

        expect(event).toEqual({
          name: 'done',
          data: {
            usage: {
              inputTokens: 5,
              outputTokens: 10,
              totalTokens: 15,
            },
            toolCalls,
            finishReason: 'tool_calls',
            systemFingerprint: 'fp_stream',
            thinkingContent: 'reasoning block',
          },
        });
      });

      it('should include usageDetails and effectiveModelAlias when provided', () => {
        const event = service.buildStreamDoneEvent(
          { inputTokens: TEST_INPUT_TOKENS, outputTokens: TEST_OUTPUT_TOKENS },
          undefined,
          'end_turn',
          undefined,
          undefined,
          undefined,
          undefined,
          {
            promptCacheHitTokens: TEST_PROMPT_CACHE_HIT_TOKENS,
            promptCacheCreationTokens: TEST_PROMPT_CACHE_CREATION_TOKENS,
          },
          asModelAlias('fallback-model'),
        );

        expect(event).toEqual({
          name: 'done',
          data: {
            usage: {
              inputTokens: 10,
              outputTokens: 20,
              totalTokens: 30,
            },
            finishReason: 'stop',
            usageDetails: {
              promptCacheHitTokens: 100,
              promptCacheCreationTokens: 50,
            },
            effectiveModelAlias: 'fallback-model',
          },
        });
      });
    });

    describe('Edge cases', () => {
      it('should omit usage when usageMetadata is undefined', () => {
        const event = service.buildStreamDoneEvent(
          undefined,
          undefined,
          'end_turn',
          undefined,
          undefined,
        );

        if (event.name !== 'done') {
          throw new Error('Expected done event');
        }

        expect(event.data.usage).toBeUndefined();
        expect(event.data.finishReason).toBe('stop');
      });

      it('should omit toolCalls when array is empty', () => {
        const event = service.buildStreamDoneEvent(
          { inputTokens: asInputTokens(1), outputTokens: asOutputTokens(2) },
          [],
          'end_turn',
          undefined,
          undefined,
        );

        if (event.name !== 'done') {
          throw new Error('Expected done event');
        }

        expect(event.data.toolCalls).toBeUndefined();
      });

      it('should map max_tokens stopReason to length finishReason', () => {
        const event = service.buildStreamDoneEvent(
          { inputTokens: asInputTokens(100), outputTokens: asOutputTokens(0) },
          undefined,
          'max_tokens',
          undefined,
          undefined,
        );

        if (event.name !== 'done') {
          throw new Error('Expected done event');
        }

        expect(event.data.finishReason).toBe('length');
      });

      it('should omit systemFingerprint and thinkingContent when falsy', () => {
        const event = service.buildStreamDoneEvent(
          { inputTokens: asInputTokens(1), outputTokens: asOutputTokens(1) },
          undefined,
          'end_turn',
          asSystemFingerprint(''),
          '',
        );

        if (event.name !== 'done') {
          throw new Error('Expected done event');
        }

        expect(event.data.systemFingerprint).toBeUndefined();
        expect(event.data.thinkingContent).toBeUndefined();
      });

      it('should prefer toolCalls length over stopReason for finishReason', () => {
        const toolCalls: GatewayToolCall[] = [
          { id: asToolCallId('tc_1'), name: 'fn', arguments: '{}' },
        ];

        const event = service.buildStreamDoneEvent(
          undefined,
          toolCalls,
          'end_turn',
          undefined,
          undefined,
        );

        if (event.name !== 'done') {
          throw new Error('Expected done event');
        }

        expect(event.data.finishReason).toBe('tool_calls');
      });

      it('should omit effectiveModelAlias and usageDetails when not provided', () => {
        const event = service.buildStreamDoneEvent(
          { inputTokens: asInputTokens(1), outputTokens: asOutputTokens(2) },
          undefined,
          'end_turn',
          undefined,
          undefined,
        );

        if (event.name !== 'done') {
          throw new Error('Expected done event');
        }

        expect(event.data.effectiveModelAlias).toBeUndefined();
        expect(event.data.usageDetails).toBeUndefined();
      });
    });
  });
});
