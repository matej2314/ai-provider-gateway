jest.mock('uuid', () => ({
  v4: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
}));

import { Test } from '@nestjs/testing';
import { ChatProviderCallService } from './chat-provider-call.service';
import { ProviderRegistryService } from '../../providers/provider-registry.service';
import { AiMetricsService } from '../../observability/ai-metrics/ai-metrics.service';
import { AppMetricsService } from '../../observability/app-metrics/app-metrics.service';
import { createMockProviderRegistryService } from '../../common/mocks/createMockProviderRegistryService';
import { createMockDefaultResolvedConfig } from '../../common/mocks/createMockResolvedProviderConfig';
import { createMockAIProvider } from '../../common/mocks/createMockAIProvider';
import {
  TEST_MODEL_ALIAS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_MODEL_ID,
  TEST_REQUEST_ID,
  TEST_CONVERSATION_ID,
  TEST_INPUT_TOKENS,
  TEST_OUTPUT_TOKENS,
  TEST_INPUT_TOKENS_SMALL,
  TEST_OUTPUT_TOKENS_SMALL,
  TEST_PROMPT_CACHE_HIT_TOKENS,
  TEST_PROMPT_CACHE_CREATION_TOKENS,
} from '../../common/mocks/test-constants';
import {
  asModelAlias,
  asResponseId,
  asSystemFingerprint,
  asClientId,
} from '../../common/types/branded.types';
import type { ResolvedProviderConfig } from '../../providers/provider-registry.service';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type { SseEvent } from '../sse/sse-event.type';
import { AppProviderCallContext } from 'src/observability/app-metrics/interfaces/app-metrics-backend.interface';

describe('ChatProviderCallService', () => {
  let service: ChatProviderCallService;
  let mockRegistry: Partial<ProviderRegistryService>;
  let mockMetrics: Partial<AiMetricsService>;
  let mockAppMetrics: Partial<AppMetricsService>;
  let resolvedConfig: ResolvedProviderConfig;
  let mockProvider: ReturnType<typeof createMockAIProvider>;

  const TEST_CLIENT_ID = asClientId('test-client');

  const baseRequest: ChatRequestDto = {
    modelAlias: TEST_MODEL_ALIAS,
    messages: [{ role: 'user', content: 'Hi' }],
  };

  const resolvedPrompts = {
    master: 'you are a helpful assistant',
    perModelByAlias: {},
  };

  beforeEach(async () => {
    resolvedConfig = createMockDefaultResolvedConfig();
    mockProvider = createMockAIProvider();
    resolvedConfig.provider =
      mockProvider as ResolvedProviderConfig['provider'];

    mockRegistry = createMockProviderRegistryService();
    (mockRegistry.resolve as jest.Mock).mockReturnValue(resolvedConfig);

    mockMetrics = {
      observeLlmCall: jest.fn((_ctx, fn) => fn() as Promise<any>),
      observeLlmStream: jest.fn().mockReturnValue({
        withActiveSpan: <T>(fn: () => T) => fn(),
        end: jest.fn(),
        fail: jest.fn(),
      }),
    };

    mockAppMetrics = {
      observeProviderCall: jest.fn(
        (_ctx: AppProviderCallContext, fn: () => Promise<any>) => fn(),
      ),
      observeProviderStream: jest.fn().mockReturnValue({
        end: jest.fn(),
        fail: jest.fn(),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        ChatProviderCallService,
        { provide: ProviderRegistryService, useValue: mockRegistry },
        { provide: AiMetricsService, useValue: mockMetrics },
        { provide: AppMetricsService, useValue: mockAppMetrics },
      ],
    }).compile();

    service = module.get(ChatProviderCallService);
  });

  describe('completeOnce', () => {
    const providerResponse = {
      text: 'Hello from provider',
      model: TEST_MODEL_ID,
      usage: {
        inputTokens: TEST_INPUT_TOKENS,
        outputTokens: TEST_OUTPUT_TOKENS,
      },
      stopReason: 'end_turn' as const,
    };

    describe('Happy path', () => {
      it('should resolve provider and return CompleteOnceResult', async () => {
        (mockProvider.complete as jest.Mock).mockResolvedValue(
          providerResponse,
        );

        const result = await service.completeOnce(
          baseRequest,
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CLIENT_ID,
          resolvedPrompts,
        );

        expect(mockRegistry.resolve).toHaveBeenCalledWith(TEST_MODEL_ALIAS);
        expect(mockProvider.complete).toHaveBeenCalled();
        expect(mockMetrics.observeLlmCall).toHaveBeenCalled();
        expect(result).toEqual({
          response: providerResponse,
          providerName: 'anthropic',
          modelId: TEST_MODEL_ID,
          resolved: resolvedConfig,
        });
      });

      it('should observe provider call with success context', async () => {
        (mockProvider.complete as jest.Mock).mockResolvedValue(
          providerResponse,
        );

        await service.completeOnce(
          baseRequest,
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CLIENT_ID,
          resolvedPrompts,
        );

        expect(mockAppMetrics.observeProviderCall).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'chat',
            client: TEST_CLIENT_ID,
            model: TEST_MODEL_ALIAS_BRANDED,
            provider: 'anthropic',
          }),
          expect.any(Function),
          expect.any(Function),
        );
      });

      it('should pass mapUsage callback to observeProviderCall', async () => {
        (mockProvider.complete as jest.Mock).mockResolvedValue(
          providerResponse,
        );

        await service.completeOnce(
          baseRequest,
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CLIENT_ID,
          resolvedPrompts,
        );

        const mapUsage = (mockAppMetrics.observeProviderCall as jest.Mock).mock
          .calls[0][2];
        expect(mapUsage(providerResponse)).toEqual({
          inputTokens: TEST_INPUT_TOKENS,
          outputTokens: TEST_OUTPUT_TOKENS,
        });
      });

      it('should pass mapResult callback to observeLlmCall', async () => {
        (mockProvider.complete as jest.Mock).mockResolvedValue(
          providerResponse,
        );

        await service.completeOnce(
          baseRequest,
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CLIENT_ID,
          resolvedPrompts,
        );

        const mapResult = (mockMetrics.observeLlmCall as jest.Mock).mock
          .calls[0][2];
        expect(mapResult(providerResponse)).toEqual({
          responseModel: TEST_MODEL_ID,
          outputText: 'Hello from provider',
          usage: {
            inputTokens: TEST_INPUT_TOKENS,
            outputTokens: TEST_OUTPUT_TOKENS,
          },
        });
      });
    });

    describe('Errors', () => {
      it('should propagate provider.complete rejection', async () => {
        (mockProvider.complete as jest.Mock).mockRejectedValue(
          new Error('Provider unavailable'),
        );

        await expect(
          service.completeOnce(
            baseRequest,
            TEST_MODEL_ALIAS_BRANDED,
            TEST_REQUEST_ID,
            TEST_CLIENT_ID,
            resolvedPrompts,
          ),
        ).rejects.toThrow('Provider unavailable');
      });
    });

    describe('Edge cases', () => {
      it('should handle response without usage in mapResult', async () => {
        const responseNoUsage = {
          text: 'No usage',
          stopReason: 'end_turn' as const,
        };
        (mockProvider.complete as jest.Mock).mockResolvedValue(responseNoUsage);

        await service.completeOnce(
          baseRequest,
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CLIENT_ID,
          resolvedPrompts,
        );

        const mapResult = (mockMetrics.observeLlmCall as jest.Mock).mock
          .calls[0][2];
        expect(mapResult(responseNoUsage)).toEqual({
          responseModel: undefined,
          outputText: 'No usage',
          usage: undefined,
        });
      });

      it('should merge request params with resolved defaults', async () => {
        (mockProvider.complete as jest.Mock).mockResolvedValue(
          providerResponse,
        );
        const requestWithParams: ChatRequestDto = {
          ...baseRequest,
          params: { temperature: 0.9 },
        };

        await service.completeOnce(
          requestWithParams,
          TEST_MODEL_ALIAS_BRANDED,
          TEST_REQUEST_ID,
          TEST_CLIENT_ID,
          resolvedPrompts,
        );

        const callArgs = (mockProvider.complete as jest.Mock).mock.calls[0];
        expect(callArgs[2]).toEqual(
          expect.objectContaining({ temperature: 0.9 }),
        );
      });
    });
  });

  describe('streamOnce', () => {
    const TEST_STREAM_RESPONSE_ID = asResponseId('gw_stream_1');
    const TEST_EFFECTIVE_MODEL_ALIAS = asModelAlias('fallback-model');

    const emittedEvents: SseEvent[] = [];
    const emit = (event: SseEvent) => emittedEvents.push(event);
    const streamMeta = {
      gatewayId: TEST_STREAM_RESPONSE_ID,
      primaryModelAlias: TEST_MODEL_ALIAS_BRANDED,
      responseConversationId: TEST_CONVERSATION_ID,
      metaEmitted: { value: false },
    };

    function createMockStreamResult(overrides: Record<string, unknown> = {}) {
      function* textStream() {
        yield 'Hello';
        yield ' world';
      }

      return {
        textStream: textStream(),
        getUsageMetadata: jest.fn().mockResolvedValue({
          inputTokens: TEST_INPUT_TOKENS_SMALL,
          outputTokens: TEST_OUTPUT_TOKENS_SMALL,
        }),
        getFinalToolCalls: jest.fn().mockResolvedValue([]),
        getStopReason: jest.fn().mockResolvedValue('end_turn'),
        getSystemFingerprint: jest
          .fn()
          .mockResolvedValue(asSystemFingerprint('fp_abc')),
        getThinkingContent: jest.fn().mockResolvedValue('thinking...'),
        getUsageDetails: jest.fn().mockResolvedValue(undefined),
        ...overrides,
      };
    }

    beforeEach(() => {
      emittedEvents.length = 0;
      streamMeta.metaEmitted.value = false;
    });

    describe('Happy path', () => {
      it('should emit meta event and stream deltas', async () => {
        const streamResult = createMockStreamResult();
        (mockProvider.stream as jest.Mock).mockReturnValue(streamResult);
        const spanEnd = jest.fn();
        const appEnd = jest.fn();
        (mockMetrics.observeLlmStream as jest.Mock).mockReturnValue({
          withActiveSpan: <T>(fn: () => T) => fn(),
          end: spanEnd,
          fail: jest.fn(),
        });
        (mockAppMetrics.observeProviderStream as jest.Mock).mockReturnValue({
          end: appEnd,
          fail: jest.fn(),
        });

        const result = await service.streamOnce({
          requestBody: baseRequest,
          alias: TEST_MODEL_ALIAS_BRANDED,
          requestId: TEST_REQUEST_ID,
          clientId: TEST_CLIENT_ID,
          resolvedPrompts,
          emit,
          streamMeta,
        });

        expect(emittedEvents[0]).toEqual({
          name: 'meta',
          data: {
            id: TEST_STREAM_RESPONSE_ID,
            provider: 'anthropic',
            model: TEST_MODEL_ALIAS,
            requestId: TEST_REQUEST_ID,
            conversationId: TEST_CONVERSATION_ID,
          },
        });
        expect(emittedEvents.slice(1)).toEqual([
          { name: 'delta', data: { text: 'Hello' } },
          { name: 'delta', data: { text: ' world' } },
        ]);
        expect(result.assembledText).toBe('Hello world');
        expect(result.providerName).toBe('anthropic');
        expect(result.modelId).toBe(TEST_MODEL_ID);
        expect(streamMeta.metaEmitted.value).toBe(true);
        expect(mockAppMetrics.observeProviderStream).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'stream',
            client: TEST_CLIENT_ID,
            model: TEST_MODEL_ALIAS_BRANDED,
            provider: 'anthropic',
          }),
        );
        expect(appEnd).toHaveBeenCalledWith({
          inputTokens: TEST_INPUT_TOKENS_SMALL,
          outputTokens: TEST_OUTPUT_TOKENS_SMALL,
        });
        expect(spanEnd).toHaveBeenCalledWith({
          responseModel: undefined,
          outputText: 'Hello world',
          usage: {
            inputTokens: TEST_INPUT_TOKENS_SMALL,
            outputTokens: TEST_OUTPUT_TOKENS_SMALL,
          },
        });
      });

      it('should include effectiveModelAlias in meta when alias differs', async () => {
        (mockProvider.stream as jest.Mock).mockReturnValue(
          createMockStreamResult(),
        );

        await service.streamOnce({
          requestBody: baseRequest,
          alias: TEST_EFFECTIVE_MODEL_ALIAS,
          requestId: TEST_REQUEST_ID,
          clientId: TEST_CLIENT_ID,
          resolvedPrompts,
          emit,
          streamMeta,
        });

        expect(emittedEvents[0].data).toEqual(
          expect.objectContaining({
            effectiveModelAlias: TEST_EFFECTIVE_MODEL_ALIAS,
          }),
        );
      });

      it('should return optional fields when stream provides them', async () => {
        const toolCalls = [
          { id: 'tc_1', name: 'get_weather', arguments: { city: 'Warsaw' } },
        ];
        (mockProvider.stream as jest.Mock).mockReturnValue(
          createMockStreamResult({
            getFinalToolCalls: jest.fn().mockResolvedValue(toolCalls),
            getStopReason: jest.fn().mockResolvedValue('tool_use'),
          }),
        );

        const result = await service.streamOnce({
          requestBody: baseRequest,
          alias: TEST_MODEL_ALIAS_BRANDED,
          requestId: TEST_REQUEST_ID,
          clientId: TEST_CLIENT_ID,
          resolvedPrompts,
          emit,
          streamMeta,
        });

        expect(result.toolCalls).toEqual(toolCalls);
        expect(result.stopReason).toBe('tool_use');
        expect(result.systemFingerprint).toBe(asSystemFingerprint('fp_abc'));
        expect(result.thinkingContent).toBe('thinking...');
        expect(result.usageMetadata).toEqual({
          inputTokens: TEST_INPUT_TOKENS_SMALL,
          outputTokens: TEST_OUTPUT_TOKENS_SMALL,
        });
      });

      it('should return usageDetails when stream provides getUsageDetails', async () => {
        const usageDetails = {
          promptCacheHitTokens: TEST_PROMPT_CACHE_HIT_TOKENS,
          promptCacheCreationTokens: TEST_PROMPT_CACHE_CREATION_TOKENS,
        };
        (mockProvider.stream as jest.Mock).mockReturnValue(
          createMockStreamResult({
            getUsageDetails: jest.fn().mockResolvedValue(usageDetails),
          }),
        );

        const result = await service.streamOnce({
          requestBody: baseRequest,
          alias: TEST_MODEL_ALIAS_BRANDED,
          requestId: TEST_REQUEST_ID,
          clientId: TEST_CLIENT_ID,
          resolvedPrompts,
          emit,
          streamMeta,
        });

        expect(result.usageDetails).toEqual(usageDetails);
      });
    });

    describe('Meta event control', () => {
      it('should not emit meta when metaEmitted is already true', async () => {
        streamMeta.metaEmitted.value = true;
        (mockProvider.stream as jest.Mock).mockReturnValue(
          createMockStreamResult(),
        );

        await service.streamOnce({
          requestBody: baseRequest,
          alias: TEST_MODEL_ALIAS_BRANDED,
          requestId: TEST_REQUEST_ID,
          clientId: TEST_CLIENT_ID,
          resolvedPrompts,
          emit,
          streamMeta,
        });

        expect(emittedEvents.find((e) => e.name === 'meta')).toBeUndefined();
        expect(emittedEvents.length).toBeGreaterThan(0);
      });
    });

    describe('Edge cases', () => {
      it('should return empty assembledText when stream has no chunks', async () => {
        function* emptyStream() {}
        (mockProvider.stream as jest.Mock).mockReturnValue({
          textStream: emptyStream(),
          getUsageMetadata: jest.fn().mockResolvedValue(undefined),
        });

        const result = await service.streamOnce({
          requestBody: baseRequest,
          alias: TEST_MODEL_ALIAS_BRANDED,
          requestId: TEST_REQUEST_ID,
          clientId: TEST_CLIENT_ID,
          resolvedPrompts,
          emit,
          streamMeta,
        });

        expect(result.assembledText).toBe('');
        expect(result.toolCalls).toBeUndefined();
        expect(result.stopReason).toBeUndefined();
      });

      it('should omit toolCalls when getFinalToolCalls returns empty array', async () => {
        (mockProvider.stream as jest.Mock).mockReturnValue(
          createMockStreamResult({
            getFinalToolCalls: jest.fn().mockResolvedValue([]),
          }),
        );

        const result = await service.streamOnce({
          requestBody: baseRequest,
          alias: TEST_MODEL_ALIAS_BRANDED,
          requestId: TEST_REQUEST_ID,
          clientId: TEST_CLIENT_ID,
          resolvedPrompts,
          emit,
          streamMeta,
        });

        expect(result.toolCalls).toBeUndefined();
      });

      it('should work when optional stream getters are missing', async () => {
        function* textStream() {
          yield 'Only text';
        }
        (mockProvider.stream as jest.Mock).mockReturnValue({
          textStream: textStream(),
          getUsageMetadata: jest.fn().mockResolvedValue(undefined),
        });

        const result = await service.streamOnce({
          requestBody: baseRequest,
          alias: TEST_MODEL_ALIAS_BRANDED,
          requestId: TEST_REQUEST_ID,
          clientId: TEST_CLIENT_ID,
          resolvedPrompts,
          emit,
          streamMeta,
        });

        expect(result.assembledText).toBe('Only text');
        expect(result.systemFingerprint).toBeUndefined();
        expect(result.thinkingContent).toBeUndefined();
        expect(result.usageDetails).toBeUndefined();
      });

      it('should call spanController.end with undefined outputText when no text', async () => {
        function* emptyStream() {}
        const spanEnd = jest.fn();
        (mockMetrics.observeLlmStream as jest.Mock).mockReturnValue({
          withActiveSpan: <T>(fn: () => T) => fn(),
          end: spanEnd,
          fail: jest.fn(),
        });
        (mockProvider.stream as jest.Mock).mockReturnValue({
          textStream: emptyStream(),
          getUsageMetadata: jest.fn().mockResolvedValue(undefined),
        });

        await service.streamOnce({
          requestBody: baseRequest,
          alias: TEST_MODEL_ALIAS_BRANDED,
          requestId: TEST_REQUEST_ID,
          clientId: TEST_CLIENT_ID,
          resolvedPrompts,
          emit,
          streamMeta,
        });

        expect(spanEnd).toHaveBeenCalledWith({
          responseModel: undefined,
          outputText: undefined,
          usage: undefined,
        });
      });
    });

    describe('Errors', () => {
      it('should propagate error when textStream iteration fails', async () => {
        function* failingStream() {
          yield 'partial';
          throw new Error('Stream interrupted');
        }
        const spanEnd = jest.fn();
        const spanFail = jest.fn();
        const appEnd = jest.fn();
        const appFail = jest.fn();
        (mockMetrics.observeLlmStream as jest.Mock).mockReturnValue({
          withActiveSpan: <T>(fn: () => T) => fn(),
          end: spanEnd,
          fail: spanFail,
        });
        (mockAppMetrics.observeProviderStream as jest.Mock).mockReturnValue({
          end: appEnd,
          fail: appFail,
        });
        (mockProvider.stream as jest.Mock).mockReturnValue({
          textStream: failingStream(),
          getUsageMetadata: jest.fn(),
        });

        await expect(
          service.streamOnce({
            requestBody: baseRequest,
            alias: TEST_MODEL_ALIAS_BRANDED,
            requestId: TEST_REQUEST_ID,
            clientId: TEST_CLIENT_ID,
            resolvedPrompts,
            emit,
            streamMeta,
          }),
        ).rejects.toThrow('Stream interrupted');

        expect(appFail).toHaveBeenCalledWith(expect.any(Error));
        expect(spanFail).toHaveBeenCalledWith({ outputText: 'partial' });
        expect(appEnd).not.toHaveBeenCalled();
        expect(spanEnd).not.toHaveBeenCalled();
      });

      it('should call spanController.fail when provider.stream throws', async () => {
        const spanFail = jest.fn();
        const appFail = jest.fn();
        (mockMetrics.observeLlmStream as jest.Mock).mockReturnValue({
          withActiveSpan: <T>(fn: () => T) => fn(),
          end: jest.fn(),
          fail: spanFail,
        });
        (mockAppMetrics.observeProviderStream as jest.Mock).mockReturnValue({
          end: jest.fn(),
          fail: appFail,
        });
        (mockProvider.stream as jest.Mock).mockImplementation(() => {
          throw new Error('Stream setup failed');
        });

        await expect(
          service.streamOnce({
            requestBody: baseRequest,
            alias: TEST_MODEL_ALIAS_BRANDED,
            requestId: TEST_REQUEST_ID,
            clientId: TEST_CLIENT_ID,
            resolvedPrompts,
            emit,
            streamMeta,
          }),
        ).rejects.toThrow('Stream setup failed');

        expect(appFail).toHaveBeenCalledWith(expect.any(Error));
        expect(spanFail).toHaveBeenCalledWith({ outputText: undefined });
      });
    });
  });
});
