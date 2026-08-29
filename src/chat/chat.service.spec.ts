jest.mock('uuid', () => ({
  v4: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
}));

import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { LoggingService } from '../logging/logging.service';
import { ApiErrorCode } from '../common/errors/api-error.code';
import { ChatProviderCallService } from './services/chat-provider-call.service';
import { ChatCachePipelineService } from './services/chat-cache-pipeline.service';
import { ChatProviderCooldownService } from './services/chat-provider-cooldown.service';
import { ChatValidationService } from './services/chat-validation.service';
import { ChatErrorHandlerService } from './services/chat-error-handler.service';
import {
  ChatResponseBuilderService,
  type ProviderResponse,
} from './services/chat-response-builder.service';
import { StreamCacheReplayService } from './services/stream-cache-replay.service';
import { resolveProviderCallOptions } from './helpers/resolve-provider-call-options';
import { ResilientExecutor } from './resilience/resilient-executor';
import { ActiveStreamsTracker } from '../observability/app-metrics/active-streams.tracker';
import { AppMetricsService } from '../observability/app-metrics/app-metrics.service';
import { createMockLoggingService } from '../common/mocks/createMockLoggingService';
import { createMockResilientExecutor } from '../common/mocks/createMockResilientExecutor';
import { createMockProviderRegistryService } from '../common/mocks/createMockProviderRegistryService';
import { createMockDefaultResolvedConfig } from '../common/mocks/createMockResolvedProviderConfig';
import { createMockConfigService } from '../common/mocks/createMockConfigService';
import {
  asGatewayKey,
  asClientId,
  asModelAlias,
  asResponseId,
  asProviderInstanceId,
  asAttemptNumber,
  type ClientId,
  type ModelAlias,
  type RequestId,
  type ConversationId,
  type ProviderInstanceId,
  type ResponseId,
} from '../common/types/branded.types';
import {
  TEST_CONVERSATION_ID,
  TEST_GATEWAY_KEY_BRANDED,
  TEST_MODEL_ALIAS,
  TEST_REQUEST_ID,
  TEST_RESPONSE_ID_PREFIX,
  VALID_CONVERSATION_ID,
} from '../common/mocks/test-constants';
import type { ResolvedProviderConfig } from '../providers/provider-registry.service';
import type { ChatExecutionPrep } from './types/chat-execution-prep.types';
import type { StreamCacheHit } from './types/stream-cache-decision.types';
import type { CachedChatResponse } from '../cache/types/cached-chat-response.type';

describe('ChatService', () => {
  let service: ChatService;
  let mockRegistry: Partial<ProviderRegistryService>;
  let mockConfig: Partial<ConfigService>;
  let mockProviderCall: Partial<ChatProviderCallService>;
  let mockExecutor: Partial<ResilientExecutor>;
  let mockLogger: Partial<LoggingService>;
  let mockCachePipeline: Partial<ChatCachePipelineService>;
  let mockProviderCooldown: Partial<ChatProviderCooldownService>;
  let mockValidation: Partial<ChatValidationService>;
  let mockErrorHandler: Partial<ChatErrorHandlerService>;
  let mockResponseBuilder: Partial<ChatResponseBuilderService>;
  let mockStreamCacheReplay: { replay: jest.Mock };
  let mockActiveStreams: Partial<ActiveStreamsTracker>;
  let mockAppMetrics: { recordCachePipelineAccess: jest.Mock };
  let resolvedConfig: ResolvedProviderConfig;

  const TEST_CLIENT_ID = asClientId('test-client');

  function mockExecutorChatSuccess(
    responseOverrides: Record<string, unknown> = {},
  ) {
    (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockResolvedValue({
      value: {
        response: {
          text: 'Hello!',
          usage: { inputTokens: 5, outputTokens: 10 },
          stopReason: 'end_turn',
          ...responseOverrides,
        },
        resolved: resolvedConfig,
      },
      usedAlias: asModelAlias(TEST_MODEL_ALIAS),
      attempts: asAttemptNumber(1),
      didFallback: false,
    });
  }

  function mockStreamExecutorSuccess(
    valueOverrides: Record<string, unknown> = {},
  ) {
    (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockResolvedValue({
      value: {
        resolved: resolvedConfig,
        assembledText: 'Hello',
        usageMetadata: { inputTokens: 5, outputTokens: 10 },
        toolCalls: [],
        stopReason: 'end_turn',
        ...valueOverrides,
      },
      usedAlias: asModelAlias(TEST_MODEL_ALIAS),
      attempts: asAttemptNumber(1),
      didFallback: false,
    });
  }

  beforeEach(async () => {
    resolvedConfig = createMockDefaultResolvedConfig();
    mockRegistry = createMockProviderRegistryService();
    (mockRegistry.resolve as jest.Mock).mockReturnValue(resolvedConfig);

    mockConfig = createMockConfigService({
      resolvedSystemPrompts: { master: 'you are helpful', main: undefined },
    });

    mockLogger = createMockLoggingService();
    mockExecutor = createMockResilientExecutor();

    mockCachePipeline = {
      getCachedIfAllowed: jest.fn().mockResolvedValue({ cached: null }),
      setCachedIfAllowed: jest.fn().mockResolvedValue(undefined),
      buildIdentityKey: jest.fn(
        (req: { modelAlias: string; messages: unknown }) =>
          `id:${req.modelAlias}:${JSON.stringify(req.messages)}`,
      ),
    };

    mockProviderCooldown = {
      assertNotInCooldown: jest.fn().mockResolvedValue(undefined),
    };

    mockValidation = {
      validateTooling: jest.fn(),
      validateThinking: jest.fn(),
      validateForStreaming: jest.fn().mockReturnValue(resolvedConfig),
    };

    mockErrorHandler = {
      handleProviderError: jest.fn().mockResolvedValue(undefined),
    };

    mockResponseBuilder = {
      buildChatResponse: jest.fn(
        (
          response: ProviderResponse,
          providerName: ProviderInstanceId,
          modelAlias: ModelAlias,
          requestId: RequestId,
          conversationId: ConversationId,
          effectiveModelAlias?: ModelAlias,
          _options?: unknown,
          _providerType?: unknown,
          responseId?: ResponseId,
        ) => ({
          id: responseId ?? asResponseId(TEST_RESPONSE_ID_PREFIX),
          provider: providerName,
          model: modelAlias,
          ...(effectiveModelAlias && { effectiveModelAlias }),
          output: { type: 'text' as const, text: response.text },
          usage: response.usage,
          requestId,
          conversationId,
          finishReason: 'stop' as const,
        }),
      ),
      buildStreamDoneEvent: jest.fn().mockReturnValue({
        name: 'done',
        data: { finishReason: 'stop' },
      }),
    };

    mockProviderCall = {
      completeOnce: jest.fn().mockResolvedValue({
        response: {
          text: 'Hello!',
          usage: { inputTokens: 5, outputTokens: 10 },
          stopReason: 'end_turn',
        },
        providerName: 'anthropic',
        modelId: 'claude-sonnet-4-5',
        resolved: resolvedConfig,
      }),
      streamOnce: jest.fn(),
    };

    mockStreamCacheReplay = {
      replay: jest.fn(),
    };

    mockActiveStreams = {
      trackStream: jest.fn((_client: ClientId, fn: () => Promise<unknown>) =>
        fn(),
      ) as unknown as ActiveStreamsTracker['trackStream'],
    };

    mockAppMetrics = {
      recordCachePipelineAccess: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ProviderRegistryService, useValue: mockRegistry },
        { provide: ConfigService, useValue: mockConfig },
        { provide: LoggingService, useValue: mockLogger },
        { provide: ResilientExecutor, useValue: mockExecutor },
        { provide: ChatProviderCallService, useValue: mockProviderCall },
        { provide: ChatCachePipelineService, useValue: mockCachePipeline },
        {
          provide: ChatProviderCooldownService,
          useValue: mockProviderCooldown,
        },
        { provide: ChatValidationService, useValue: mockValidation },
        { provide: ChatErrorHandlerService, useValue: mockErrorHandler },
        { provide: ChatResponseBuilderService, useValue: mockResponseBuilder },
        { provide: StreamCacheReplayService, useValue: mockStreamCacheReplay },
        { provide: ActiveStreamsTracker, useValue: mockActiveStreams },
        { provide: AppMetricsService, useValue: mockAppMetrics },
      ],
    }).compile();

    service = module.get(ChatService);
  });

  describe('validateForStreaming', () => {
    it('should delegate to validation service', () => {
      const result = service.validateForStreaming(TEST_MODEL_ALIAS);

      expect(mockValidation.validateForStreaming).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS,
      );
      expect(result).toBe(resolvedConfig);
    });
  });

  describe('prepareRequestForExecution', () => {
    const baseRequest = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'user' as const, content: 'Hi' }],
      params: {},
    };

    it('should run ingress, tooling, thinking validation and cooldown check', async () => {
      const expectedOptions = resolveProviderCallOptions(
        resolvedConfig.params,
        baseRequest.params,
      );

      const prep = await service.prepareRequestForExecution(
        baseRequest,
        TEST_REQUEST_ID,
        'native',
        TEST_GATEWAY_KEY_BRANDED,
      );

      expect(mockValidation.validateTooling).toHaveBeenCalledWith(
        baseRequest,
        resolvedConfig,
      );
      expect(mockValidation.validateThinking).toHaveBeenCalledWith(
        resolvedConfig,
        expectedOptions,
      );
      expect(mockProviderCooldown.assertNotInCooldown).toHaveBeenCalledWith(
        TEST_GATEWAY_KEY_BRANDED,
        'anthropic',
        TEST_REQUEST_ID,
      );
      expect(prep.primaryResolved).toBe(resolvedConfig);
      expect(prep.options).toEqual(expectedOptions);
    });

    it('should propagate cooldown errors', async () => {
      const rateLimitError = new HttpException('Rate limited', 429);
      (mockProviderCooldown.assertNotInCooldown as jest.Mock).mockRejectedValue(
        rateLimitError,
      );

      await expect(
        service.prepareRequestForExecution(
          baseRequest,
          TEST_REQUEST_ID,
          'native',
          TEST_GATEWAY_KEY_BRANDED,
        ),
      ).rejects.toBe(rateLimitError);
    });

    it('should skip cooldown when gatewayKey is empty', async () => {
      await service.prepareRequestForExecution(
        baseRequest,
        TEST_REQUEST_ID,
        'native',
        asGatewayKey(''),
      );

      expect(mockProviderCooldown.assertNotInCooldown).not.toHaveBeenCalled();
    });
  });

  describe('executeChat', () => {
    const baseRequest = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'user' as const, content: 'Hi' }],
      params: {},
    };

    it('should orchestrate validation, executor and response builder', async () => {
      mockExecutorChatSuccess({ text: 'Hello!' });

      const expectedOptions = resolveProviderCallOptions(
        resolvedConfig.params,
        baseRequest.params,
      );

      const result = await service.executeChat(
        baseRequest,
        TEST_CLIENT_ID,
        TEST_REQUEST_ID,
        TEST_GATEWAY_KEY_BRANDED,
        'native',
      );

      expect(mockValidation.validateTooling).toHaveBeenCalledWith(
        baseRequest,
        resolvedConfig,
      );
      expect(mockProviderCooldown.assertNotInCooldown).toHaveBeenCalledWith(
        TEST_GATEWAY_KEY_BRANDED,
        'anthropic',
        TEST_REQUEST_ID,
      );
      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalled();
      expect(mockResponseBuilder.buildChatResponse).toHaveBeenCalled();
      expect(mockValidation.validateThinking).toHaveBeenCalledWith(
        resolvedConfig,
        expectedOptions,
      );
      expect(result.output.text).toBe('Hello!');
      expect(result.id).toBe(TEST_RESPONSE_ID_PREFIX);
      expect(mockAppMetrics.recordCachePipelineAccess).toHaveBeenCalledWith(
        asModelAlias(TEST_MODEL_ALIAS),
        false,
      );
    });

    it('should return cached response without calling executor', async () => {
      const cachedResponse = {
        id: 'cached-123',
        output: { type: 'text' as const, text: 'Cached response' },
      };
      (mockCachePipeline.getCachedIfAllowed as jest.Mock).mockResolvedValue({
        cached: cachedResponse,
        cacheSource: 'exact',
      });

      const result = await service.executeChat(
        baseRequest,
        TEST_CLIENT_ID,
        TEST_REQUEST_ID,
        TEST_GATEWAY_KEY_BRANDED,
        'native',
      );

      expect(mockCachePipeline.getCachedIfAllowed).toHaveBeenCalledWith(
        baseRequest,
        expect.any(Object),
        TEST_CLIENT_ID,
        TEST_GATEWAY_KEY_BRANDED,
      );
      expect(result).toEqual({
        ...cachedResponse,
        conversationId: VALID_CONVERSATION_ID,
        cacheSource: 'exact',
        requestId: TEST_REQUEST_ID,
      });
      expect(mockExecutor.executeWithRetryAndFallback).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordCachePipelineAccess).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Chat cache hit', {
        cacheSource: 'exact',
      });
    });

    it('should propagate semantic cacheSource on semantic hit', async () => {
      const cachedResponse = {
        id: 'cached-sem-123',
        output: { type: 'text' as const, text: 'Semantic cached' },
        cached: true as const,
        cachedAt: '2026-01-01T00:00:00.000Z',
      };
      (mockCachePipeline.getCachedIfAllowed as jest.Mock).mockResolvedValue({
        cached: cachedResponse,
        cacheSource: 'semantic',
      });

      const result = await service.executeChat(
        baseRequest,
        TEST_CLIENT_ID,
        TEST_REQUEST_ID,
        TEST_GATEWAY_KEY_BRANDED,
        'native',
      );

      expect(result).toEqual({
        ...cachedResponse,
        conversationId: VALID_CONVERSATION_ID,
        cacheSource: 'semantic',
        requestId: TEST_REQUEST_ID,
      });
      expect(mockExecutor.executeWithRetryAndFallback).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Chat cache hit', {
        cacheSource: 'semantic',
      });
    });

    it('should propagate provider cooldown errors', async () => {
      const rateLimitError = new HttpException('Rate limited', 429);
      (mockProviderCooldown.assertNotInCooldown as jest.Mock).mockRejectedValue(
        rateLimitError,
      );

      await expect(
        service.executeChat(
          baseRequest,
          TEST_CLIENT_ID,
          TEST_REQUEST_ID,
          TEST_GATEWAY_KEY_BRANDED,
          'native',
        ),
      ).rejects.toBe(rateLimitError);
      expect(mockExecutor.executeWithRetryAndFallback).not.toHaveBeenCalled();
    });

    it('should call validateTooling before provider call', async () => {
      mockExecutorChatSuccess();
      const toolingRequest = {
        ...baseRequest,
        tooling: {
          definitions: [{ name: 'test', parameters: {} }],
        },
      };

      await service.executeChat(
        toolingRequest,
        TEST_CLIENT_ID,
        TEST_REQUEST_ID,
        TEST_GATEWAY_KEY_BRANDED,
        'native',
      );

      expect(mockValidation.validateTooling).toHaveBeenCalledWith(
        toolingRequest,
        resolvedConfig,
      );
      expect(mockAppMetrics.recordCachePipelineAccess).not.toHaveBeenCalled();
    });

    it('should propagate validateTooling errors', async () => {
      const validationError = new HttpException('Tools not supported', 400);
      (mockValidation.validateTooling as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      await expect(
        service.executeChat(
          {
            ...baseRequest,
            tooling: { definitions: [{ name: 'test', parameters: {} }] },
          },
          TEST_CLIENT_ID,
          TEST_REQUEST_ID,
          TEST_GATEWAY_KEY_BRANDED,
          'native',
        ),
      ).rejects.toBe(validationError);
    });

    it('should propagate validateThinking errors', async () => {
      const validationError = new HttpException('Thinking not supported', 400);
      (mockValidation.validateThinking as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      await expect(
        service.executeChat(
          baseRequest,
          TEST_CLIENT_ID,
          TEST_REQUEST_ID,
          TEST_GATEWAY_KEY_BRANDED,
          'native',
        ),
      ).rejects.toBe(validationError);
      expect(mockExecutor.executeWithRetryAndFallback).not.toHaveBeenCalled();
    });

    it('should reject native ingress with more than 150 messages before executor', async () => {
      const oversizedRequest = {
        ...baseRequest,
        messages: Array(151).fill({ role: 'user' as const, content: 'x' }),
      };

      await expect(
        service.executeChat(
          oversizedRequest,
          TEST_CLIENT_ID,
          TEST_REQUEST_ID,
          TEST_GATEWAY_KEY_BRANDED,
          'native',
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: ApiErrorCode.VALIDATION_FAILED,
        }),
      });
      expect(mockExecutor.executeWithRetryAndFallback).not.toHaveBeenCalled();
    });

    it('should allow facade-openai ingress with 151 messages', async () => {
      mockExecutorChatSuccess();
      const largeRequest = {
        ...baseRequest,
        messages: Array(151).fill({ role: 'user' as const, content: 'x' }),
      };

      await service.executeChat(
        largeRequest,
        TEST_CLIENT_ID,
        TEST_REQUEST_ID,
        TEST_GATEWAY_KEY_BRANDED,
        'facade-openai',
      );

      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalled();
    });

    it('should reject native ingress when user content exceeds 3000 characters', async () => {
      const longContentRequest = {
        ...baseRequest,
        messages: [{ role: 'user' as const, content: 'a'.repeat(3001) }],
      };

      await expect(
        service.executeChat(
          longContentRequest,
          TEST_CLIENT_ID,
          TEST_REQUEST_ID,
          TEST_GATEWAY_KEY_BRANDED,
          'native',
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: ApiErrorCode.VALIDATION_FAILED,
        }),
      });
      expect(mockExecutor.executeWithRetryAndFallback).not.toHaveBeenCalled();
    });

    it('should pass conversationId to response builder', async () => {
      mockExecutorChatSuccess();
      const request = {
        ...baseRequest,
        conversationId: VALID_CONVERSATION_ID,
      };
      const expectedOptions = resolveProviderCallOptions(
        resolvedConfig.params,
        request.params,
      );

      await service.executeChat(
        request,
        TEST_CLIENT_ID,
        TEST_REQUEST_ID,
        TEST_GATEWAY_KEY_BRANDED,
        'native',
      );

      expect(mockResponseBuilder.buildChatResponse).toHaveBeenCalledWith(
        expect.any(Object),
        'anthropic',
        TEST_MODEL_ALIAS,
        TEST_REQUEST_ID,
        TEST_CONVERSATION_ID,
        undefined,
        expectedOptions,
        resolvedConfig.providerType,
      );
    });

    it('should delegate cache write after successful execution', async () => {
      mockExecutorChatSuccess({ text: 'Fresh answer' });

      await service.executeChat(
        baseRequest,
        TEST_CLIENT_ID,
        TEST_REQUEST_ID,
        TEST_GATEWAY_KEY_BRANDED,
        'native',
      );

      expect(mockCachePipeline.setCachedIfAllowed).toHaveBeenCalledWith(
        baseRequest,
        expect.objectContaining({
          output: { type: 'text', text: 'Fresh answer' },
        }),
        expect.any(Object),
        TEST_CLIENT_ID,
        TEST_GATEWAY_KEY_BRANDED,
        undefined,
      );
    });

    it('should pass embedState from lookup to cache write on miss', async () => {
      const embedState = { vector: [0.1, 0.2, 0.3], embedAttempted: true };
      (mockCachePipeline.getCachedIfAllowed as jest.Mock).mockResolvedValue({
        cached: null,
        embedState,
      });
      mockExecutorChatSuccess({ text: 'Fresh answer' });

      await service.executeChat(
        baseRequest,
        TEST_CLIENT_ID,
        TEST_REQUEST_ID,
        TEST_GATEWAY_KEY_BRANDED,
        'native',
      );

      expect(mockCachePipeline.setCachedIfAllowed).toHaveBeenCalledWith(
        baseRequest,
        expect.objectContaining({
          output: { type: 'text', text: 'Fresh answer' },
        }),
        expect.any(Object),
        TEST_CLIENT_ID,
        TEST_GATEWAY_KEY_BRANDED,
        embedState,
      );
    });

    it('should skip rate limit and cache when gatewayKey is empty', async () => {
      mockExecutorChatSuccess();

      await service.executeChat(
        baseRequest,
        TEST_CLIENT_ID,
        TEST_REQUEST_ID,
        asGatewayKey(''),
        'native',
      );

      expect(mockProviderCooldown.assertNotInCooldown).not.toHaveBeenCalled();
      expect(mockCachePipeline.getCachedIfAllowed).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordCachePipelineAccess).not.toHaveBeenCalled();
    });

    it('should pass effectiveModelAlias to builder when fallback occurred', async () => {
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockResolvedValue(
        {
          value: {
            response: {
              text: 'Fallback response',
              stopReason: 'end_turn',
            },
            resolved: {
              ...resolvedConfig,
              modelAlias: asModelAlias('fallback-model'),
            },
          },
          usedAlias: asModelAlias('fallback-model'),
          attempts: asAttemptNumber(3),
          didFallback: true,
        },
      );

      const expectedOptions = resolveProviderCallOptions(
        resolvedConfig.params,
        baseRequest.params,
      );

      await service.executeChat(
        baseRequest,
        TEST_CLIENT_ID,
        TEST_REQUEST_ID,
        TEST_GATEWAY_KEY_BRANDED,
        'native',
      );

      expect(mockResponseBuilder.buildChatResponse).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Fallback response' }),
        'anthropic',
        TEST_MODEL_ALIAS,
        TEST_REQUEST_ID,
        expect.any(String),
        'fallback-model',
        expectedOptions,
        resolvedConfig.providerType,
      );
      expect(mockCachePipeline.setCachedIfAllowed).not.toHaveBeenCalled();
    });

    it('should not set fallbackAlias for tooling requests', async () => {
      mockExecutorChatSuccess();
      const toolingRequest = {
        ...baseRequest,
        tooling: {
          definitions: [{ name: 'test', parameters: {} }],
        },
      };

      await service.executeChat(
        toolingRequest,
        TEST_CLIENT_ID,
        TEST_REQUEST_ID,
        TEST_GATEWAY_KEY_BRANDED,
        'native',
      );

      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryAlias: TEST_MODEL_ALIAS,
          fallbackAlias: undefined,
        }),
      );
    });

    it('should use primary fallbackAlias for non-tooling requests', async () => {
      resolvedConfig = {
        ...createMockDefaultResolvedConfig(),
        fallbackAlias: asModelAlias('fallback-model'),
      };
      (mockRegistry.resolve as jest.Mock).mockReturnValue(resolvedConfig);
      mockExecutorChatSuccess();

      await service.executeChat(
        baseRequest,
        TEST_CLIENT_ID,
        TEST_REQUEST_ID,
        TEST_GATEWAY_KEY_BRANDED,
        'native',
      );

      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryAlias: TEST_MODEL_ALIAS,
          fallbackAlias: asModelAlias('fallback-model'),
        }),
      );
    });

    it('should delegate provider errors to error handler and rethrow', async () => {
      const error = new HttpException('Rate limited', 429);
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockRejectedValue(
        error,
      );

      await expect(
        service.executeChat(
          baseRequest,
          TEST_CLIENT_ID,
          TEST_REQUEST_ID,
          TEST_GATEWAY_KEY_BRANDED,
          'native',
        ),
      ).rejects.toBe(error);

      expect(mockErrorHandler.handleProviderError).toHaveBeenCalledWith(
        expect.anything(),
        error,
        'anthropic',
        TEST_GATEWAY_KEY_BRANDED,
      );
    });

    it('should coalesce parallel identical misses into one completeOnce', async () => {
      (
        mockExecutor.executeWithRetryAndFallback as jest.Mock
      ).mockImplementation(
        async (opts: {
          runOnce: (
            alias: ModelAlias,
            attemptNo: number,
            signal: AbortSignal,
          ) => Promise<unknown>;
          primaryAlias: ModelAlias;
        }) => {
          await new Promise((r) => setTimeout(r, 20));
          const value = await opts.runOnce(
            opts.primaryAlias,
            1,
            new AbortController().signal,
          );
          return {
            value,
            usedAlias: opts.primaryAlias,
            attempts: asAttemptNumber(1),
            didFallback: false,
          };
        },
      );

      const [first, second] = await Promise.all([
        service.executeChat(
          baseRequest,
          TEST_CLIENT_ID,
          TEST_REQUEST_ID,
          TEST_GATEWAY_KEY_BRANDED,
          'native',
        ),
        service.executeChat(
          baseRequest,
          TEST_CLIENT_ID,
          TEST_REQUEST_ID,
          TEST_GATEWAY_KEY_BRANDED,
          'native',
        ),
      ]);

      expect(first).toEqual(second);
      expect(mockProviderCall.completeOnce).toHaveBeenCalledTimes(1);
      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalledTimes(1);
      expect(mockAppMetrics.recordCachePipelineAccess).toHaveBeenCalledTimes(1);
      expect(mockAppMetrics.recordCachePipelineAccess).toHaveBeenCalledWith(
        asModelAlias(TEST_MODEL_ALIAS),
        false,
      );
    });

    it('should not coalesce requests that differ only by trailing space', async () => {
      (
        mockExecutor.executeWithRetryAndFallback as jest.Mock
      ).mockImplementation(
        async (opts: {
          runOnce: (
            alias: ModelAlias,
            attemptNo: number,
            signal: AbortSignal,
          ) => Promise<unknown>;
          primaryAlias: ModelAlias;
        }) => {
          await new Promise((r) => setTimeout(r, 20));
          const value = await opts.runOnce(
            opts.primaryAlias,
            1,
            new AbortController().signal,
          );
          return {
            value,
            usedAlias: opts.primaryAlias,
            attempts: asAttemptNumber(1),
            didFallback: false,
          };
        },
      );

      await Promise.all([
        service.executeChat(
          {
            ...baseRequest,
            messages: [{ role: 'user', content: 'hello' }],
          },
          TEST_CLIENT_ID,
          TEST_REQUEST_ID,
          TEST_GATEWAY_KEY_BRANDED,
          'native',
        ),
        service.executeChat(
          {
            ...baseRequest,
            messages: [{ role: 'user', content: 'hello ' }],
          },
          TEST_CLIENT_ID,
          TEST_REQUEST_ID,
          TEST_GATEWAY_KEY_BRANDED,
          'native',
        ),
      ]);

      expect(mockProviderCall.completeOnce).toHaveBeenCalledTimes(2);
      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalledTimes(2);
    });

    it('should propagate leader failure to waiters and allow a later retry', async () => {
      const boom = new Error('fail');
      (
        mockExecutor.executeWithRetryAndFallback as jest.Mock
      ).mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 20));
        throw boom;
      });

      await expect(
        Promise.all([
          service.executeChat(
            baseRequest,
            TEST_CLIENT_ID,
            TEST_REQUEST_ID,
            TEST_GATEWAY_KEY_BRANDED,
            'native',
          ),
          service.executeChat(
            baseRequest,
            TEST_CLIENT_ID,
            TEST_REQUEST_ID,
            TEST_GATEWAY_KEY_BRANDED,
            'native',
          ),
        ]),
      ).rejects.toThrow('fail');

      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalledTimes(1);

      mockExecutorChatSuccess();
      await expect(
        service.executeChat(
          baseRequest,
          TEST_CLIENT_ID,
          TEST_REQUEST_ID,
          TEST_GATEWAY_KEY_BRANDED,
          'native',
        ),
      ).resolves.toMatchObject({ output: { text: 'Hello!' } });
      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalledTimes(2);
    });

    it('should check cooldown before cache lookup', async () => {
      const rateLimitError = new HttpException('Rate limited', 429);
      (mockProviderCooldown.assertNotInCooldown as jest.Mock).mockRejectedValue(
        rateLimitError,
      );

      await expect(
        service.executeChat(
          baseRequest,
          TEST_CLIENT_ID,
          TEST_REQUEST_ID,
          TEST_GATEWAY_KEY_BRANDED,
          'native',
        ),
      ).rejects.toBe(rateLimitError);

      expect(mockCachePipeline.getCachedIfAllowed).not.toHaveBeenCalled();
      expect(mockCachePipeline.buildIdentityKey).not.toHaveBeenCalled();
    });
  });

  describe('resolveStreamCache', () => {
    const baseRequest = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'user' as const, content: 'Hi' }],
      params: {},
    };

    it('should return miss without lookup when gatewayKey is empty', async () => {
      const decision = await service.resolveStreamCache(
        baseRequest,
        TEST_REQUEST_ID,
        TEST_CLIENT_ID,
        'native',
        asGatewayKey(''),
      );

      expect(decision).toMatchObject({ outcome: 'miss' });
      expect(decision.prep.primaryResolved).toBe(resolvedConfig);
      expect(mockCachePipeline.getCachedIfAllowed).not.toHaveBeenCalled();
    });

    it('should return hit with cached payload and cacheSource', async () => {
      const cachedResponse = {
        id: 'cached-stream-123',
        output: { type: 'text' as const, text: 'Cached stream' },
      };
      (mockCachePipeline.getCachedIfAllowed as jest.Mock).mockResolvedValue({
        cached: cachedResponse,
        cacheSource: 'exact',
      });

      const decision = await service.resolveStreamCache(
        baseRequest,
        TEST_REQUEST_ID,
        TEST_CLIENT_ID,
        'native',
        TEST_GATEWAY_KEY_BRANDED,
      );

      expect(decision).toEqual({
        outcome: 'hit',
        prep: expect.objectContaining({
          primaryResolved: resolvedConfig,
        }),
        cached: cachedResponse,
        cacheSource: 'exact',
      });
      expect(mockCachePipeline.getCachedIfAllowed).toHaveBeenCalledWith(
        baseRequest,
        expect.any(Object),
        TEST_CLIENT_ID,
        TEST_GATEWAY_KEY_BRANDED,
      );
    });

    it('should return semantic hit with cacheSource', async () => {
      const cachedResponse = {
        id: 'cached-sem-stream',
        output: { type: 'text' as const, text: 'Semantic stream' },
        cached: true as const,
        cachedAt: '2026-01-01T00:00:00.000Z',
      };
      (mockCachePipeline.getCachedIfAllowed as jest.Mock).mockResolvedValue({
        cached: cachedResponse,
        cacheSource: 'semantic',
      });

      const decision = await service.resolveStreamCache(
        baseRequest,
        TEST_REQUEST_ID,
        TEST_CLIENT_ID,
        'native',
        TEST_GATEWAY_KEY_BRANDED,
      );

      expect(decision).toEqual({
        outcome: 'hit',
        prep: expect.objectContaining({
          primaryResolved: resolvedConfig,
        }),
        cached: cachedResponse,
        cacheSource: 'semantic',
      });
    });

    it('should return miss with embedState from lookup', async () => {
      const embedState = { vector: [0.1, 0.2], embedAttempted: true };
      (mockCachePipeline.getCachedIfAllowed as jest.Mock).mockResolvedValue({
        cached: null,
        embedState,
      });

      const decision = await service.resolveStreamCache(
        baseRequest,
        TEST_REQUEST_ID,
        TEST_CLIENT_ID,
        'native',
        TEST_GATEWAY_KEY_BRANDED,
      );

      expect(decision).toEqual({
        outcome: 'miss',
        prep: expect.objectContaining({
          primaryResolved: resolvedConfig,
        }),
        embedState,
      });
    });

    it('should propagate cooldown errors before cache lookup', async () => {
      const rateLimitError = new HttpException('Rate limited', 429);
      (mockProviderCooldown.assertNotInCooldown as jest.Mock).mockRejectedValue(
        rateLimitError,
      );

      await expect(
        service.resolveStreamCache(
          baseRequest,
          TEST_REQUEST_ID,
          TEST_CLIENT_ID,
          'native',
          TEST_GATEWAY_KEY_BRANDED,
        ),
      ).rejects.toBe(rateLimitError);

      expect(mockCachePipeline.getCachedIfAllowed).not.toHaveBeenCalled();
    });
  });

  describe('replayStreamCacheHit', () => {
    it('should delegate replay to StreamCacheReplayService', () => {
      const emit = jest.fn();
      const shouldAbort = jest.fn().mockReturnValue(false);
      const cached: CachedChatResponse = {
        id: asResponseId('gw_cached'),
        provider: asProviderInstanceId('anthropic'),
        model: asModelAlias(TEST_MODEL_ALIAS),
        output: { type: 'text', text: 'From cache' },
        cached: true,
        cachedAt: '2026-01-01T00:00:00.000Z',
        finishReason: 'stop',
      };
      const decision: StreamCacheHit = {
        outcome: 'hit',
        prep: {
          responseConversationId: TEST_CONVERSATION_ID,
        } as ChatExecutionPrep,
        cached,
        cacheSource: 'exact',
      };

      service.replayStreamCacheHit(
        decision,
        TEST_REQUEST_ID,
        emit,
        shouldAbort,
      );

      expect(mockStreamCacheReplay.replay).toHaveBeenCalledWith({
        cached,
        cacheSource: 'exact',
        requestId: TEST_REQUEST_ID,
        conversationId: TEST_CONVERSATION_ID,
        emit,
        shouldAbort,
      });
    });
  });

  describe('executeStreamMiss', () => {
    const baseRequest = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'user' as const, content: 'Hi' }],
      params: {},
    };

    it('should stream from passed prep without a second prepare or cooldown', async () => {
      const prep = await service.prepareRequestForExecution(
        baseRequest,
        TEST_REQUEST_ID,
        'native',
        TEST_GATEWAY_KEY_BRANDED,
      );
      (mockProviderCooldown.assertNotInCooldown as jest.Mock).mockClear();
      (mockValidation.validateTooling as jest.Mock).mockClear();
      mockStreamExecutorSuccess();

      await service.executeStreamMiss(
        baseRequest,
        TEST_REQUEST_ID,
        TEST_CLIENT_ID,
        jest.fn(),
        TEST_GATEWAY_KEY_BRANDED,
        { outcome: 'miss', prep },
      );

      expect(mockProviderCooldown.assertNotInCooldown).not.toHaveBeenCalled();
      expect(mockValidation.validateTooling).not.toHaveBeenCalled();
      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalled();
      expect(mockResponseBuilder.buildStreamDoneEvent).toHaveBeenCalled();
    });

    it('should cache assembledText with stream meta id after a successful miss', async () => {
      const prep = await service.prepareRequestForExecution(
        baseRequest,
        TEST_REQUEST_ID,
        'native',
        TEST_GATEWAY_KEY_BRANDED,
      );
      const embedState = { vector: [0.4, 0.5], embedAttempted: true };
      mockStreamExecutorSuccess({ assembledText: 'Hello streamed' });

      await service.executeStreamMiss(
        baseRequest,
        TEST_REQUEST_ID,
        TEST_CLIENT_ID,
        jest.fn(),
        TEST_GATEWAY_KEY_BRANDED,
        { outcome: 'miss', prep, embedState },
      );

      expect(mockResponseBuilder.buildChatResponse).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Hello streamed' }),
        'anthropic',
        TEST_MODEL_ALIAS,
        TEST_REQUEST_ID,
        expect.any(String),
        undefined,
        expect.any(Object),
        resolvedConfig.providerType,
        asResponseId(TEST_RESPONSE_ID_PREFIX),
      );
      expect(mockCachePipeline.setCachedIfAllowed).toHaveBeenCalledWith(
        baseRequest,
        expect.objectContaining({
          id: TEST_RESPONSE_ID_PREFIX,
          output: { type: 'text', text: 'Hello streamed' },
        }),
        expect.any(Object),
        TEST_CLIENT_ID,
        TEST_GATEWAY_KEY_BRANDED,
        embedState,
      );
    });

    it('should not cache when stream used fallback', async () => {
      const prep = await service.prepareRequestForExecution(
        baseRequest,
        TEST_REQUEST_ID,
        'native',
        TEST_GATEWAY_KEY_BRANDED,
      );
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockResolvedValue(
        {
          value: {
            resolved: resolvedConfig,
            assembledText: 'Fallback stream',
            usageMetadata: { inputTokens: 5, outputTokens: 10 },
            stopReason: 'end_turn',
          },
          usedAlias: asModelAlias('fallback-model'),
          attempts: asAttemptNumber(2),
          didFallback: true,
        },
      );

      await service.executeStreamMiss(
        baseRequest,
        TEST_REQUEST_ID,
        TEST_CLIENT_ID,
        jest.fn(),
        TEST_GATEWAY_KEY_BRANDED,
        { outcome: 'miss', prep },
      );

      expect(mockResponseBuilder.buildChatResponse).not.toHaveBeenCalled();
      expect(mockCachePipeline.setCachedIfAllowed).not.toHaveBeenCalled();
    });
  });

  describe('executeStream', () => {
    const baseRequest = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'user' as const, content: 'Hi' }],
      params: {},
    };

    it('should orchestrate validation, executor, done event and emit', async () => {
      mockStreamExecutorSuccess();
      const emitted: Array<{ name: string; data: unknown }> = [];
      const expectedOptions = resolveProviderCallOptions(
        resolvedConfig.params,
        baseRequest.params,
      );

      await service.executeStream(
        baseRequest,
        TEST_REQUEST_ID,
        TEST_CLIENT_ID,
        (event) => {
          emitted.push(event);
        },
        'native',
        TEST_GATEWAY_KEY_BRANDED,
      );

      expect(mockValidation.validateTooling).toHaveBeenCalledWith(
        baseRequest,
        resolvedConfig,
      );
      expect(mockProviderCooldown.assertNotInCooldown).toHaveBeenCalledWith(
        TEST_GATEWAY_KEY_BRANDED,
        'anthropic',
        TEST_REQUEST_ID,
      );
      expect(mockCachePipeline.getCachedIfAllowed).not.toHaveBeenCalled();
      expect(mockCachePipeline.setCachedIfAllowed).toHaveBeenCalledWith(
        baseRequest,
        expect.objectContaining({
          output: { type: 'text', text: 'Hello' },
        }),
        expect.any(Object),
        TEST_CLIENT_ID,
        TEST_GATEWAY_KEY_BRANDED,
        undefined,
      );
      expect(mockValidation.validateThinking).toHaveBeenCalledWith(
        resolvedConfig,
        expectedOptions,
      );
      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryAlias: TEST_MODEL_ALIAS,
          requestId: TEST_REQUEST_ID,
        }),
      );
      expect(mockResponseBuilder.buildStreamDoneEvent).toHaveBeenCalled();
      expect(emitted).toContainEqual({
        name: 'done',
        data: { finishReason: 'stop' },
      });
    });

    it('should reject native ingress with more than 150 messages before stream executor', async () => {
      const oversizedRequest = {
        ...baseRequest,
        messages: Array(151).fill({ role: 'user' as const, content: 'x' }),
      };

      await expect(
        service.executeStream(
          oversizedRequest,
          TEST_REQUEST_ID,
          TEST_CLIENT_ID,
          jest.fn(),
          'native',
          TEST_GATEWAY_KEY_BRANDED,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: ApiErrorCode.VALIDATION_FAILED,
        }),
      });
      expect(mockExecutor.executeWithRetryAndFallback).not.toHaveBeenCalled();
    });

    it('should pass stream result fields to buildStreamDoneEvent', async () => {
      mockStreamExecutorSuccess({
        usageMetadata: { inputTokens: 15, outputTokens: 25 },
        toolCalls: [{ id: 'call-1', name: 'search', arguments: { q: 'test' } }],
        stopReason: 'tool_use',
        systemFingerprint: 'fp_stream_123',
        thinkingContent: 'Stream thinking',
        usageDetails: {
          promptCacheHitTokens: 100,
          promptCacheCreationTokens: 50,
        },
      });

      const expectedOptions = resolveProviderCallOptions(
        resolvedConfig.params,
        baseRequest.params,
      );

      await service.executeStream(
        baseRequest,
        TEST_REQUEST_ID,
        TEST_CLIENT_ID,
        jest.fn(),
        'native',
        TEST_GATEWAY_KEY_BRANDED,
      );

      expect(mockResponseBuilder.buildStreamDoneEvent).toHaveBeenCalledWith(
        { inputTokens: 15, outputTokens: 25 },
        [{ id: 'call-1', name: 'search', arguments: { q: 'test' } }],
        'tool_use',
        'fp_stream_123',
        'Stream thinking',
        expectedOptions,
        resolvedConfig.providerType,
        {
          promptCacheHitTokens: 100,
          promptCacheCreationTokens: 50,
        },
        undefined,
      );
    });

    it('should propagate validateThinking errors before stream executor', async () => {
      const validationError = new HttpException('Thinking not supported', 400);
      (mockValidation.validateThinking as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      await expect(
        service.executeStream(
          baseRequest,
          TEST_REQUEST_ID,
          TEST_CLIENT_ID,
          jest.fn(),
          'native',
          TEST_GATEWAY_KEY_BRANDED,
        ),
      ).rejects.toBe(validationError);
      expect(mockExecutor.executeWithRetryAndFallback).not.toHaveBeenCalled();
    });

    it('should propagate cooldown errors before stream executor', async () => {
      const rateLimitError = new HttpException('Rate limited', 429);
      (mockProviderCooldown.assertNotInCooldown as jest.Mock).mockRejectedValue(
        rateLimitError,
      );

      await expect(
        service.executeStream(
          baseRequest,
          TEST_REQUEST_ID,
          TEST_CLIENT_ID,
          jest.fn(),
          'native',
          TEST_GATEWAY_KEY_BRANDED,
        ),
      ).rejects.toBe(rateLimitError);
      expect(mockExecutor.executeWithRetryAndFallback).not.toHaveBeenCalled();
    });

    it('should not set fallbackAlias for tooling requests', async () => {
      mockStreamExecutorSuccess();
      const toolingRequest = {
        ...baseRequest,
        tooling: {
          definitions: [{ name: 'test', parameters: {} }],
        },
      };

      await service.executeStream(
        toolingRequest,
        TEST_REQUEST_ID,
        TEST_CLIENT_ID,
        jest.fn(),
        'native',
        TEST_GATEWAY_KEY_BRANDED,
      );

      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryAlias: TEST_MODEL_ALIAS,
          fallbackAlias: undefined,
        }),
      );
    });

    it('should pass effectiveModelAlias to buildStreamDoneEvent when fallback occurred', async () => {
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockResolvedValue(
        {
          value: {
            resolved: resolvedConfig,
            usageMetadata: { inputTokens: 5, outputTokens: 10 },
            stopReason: 'end_turn',
          },
          usedAlias: asModelAlias('fallback-model'),
          attempts: asAttemptNumber(2),
          didFallback: true,
        },
      );

      const expectedOptions = resolveProviderCallOptions(
        resolvedConfig.params,
        baseRequest.params,
      );

      await service.executeStream(
        baseRequest,
        TEST_REQUEST_ID,
        TEST_CLIENT_ID,
        jest.fn(),
        'native',
        TEST_GATEWAY_KEY_BRANDED,
      );

      expect(mockResponseBuilder.buildStreamDoneEvent).toHaveBeenCalledWith(
        { inputTokens: 5, outputTokens: 10 },
        undefined,
        'end_turn',
        undefined,
        undefined,
        expectedOptions,
        resolvedConfig.providerType,
        undefined,
        asModelAlias('fallback-model'),
      );
      expect(mockCachePipeline.setCachedIfAllowed).not.toHaveBeenCalled();
    });

    it('should use primary fallbackAlias for streaming', async () => {
      resolvedConfig = {
        ...createMockDefaultResolvedConfig(),
        fallbackAlias: asModelAlias('fallback-model'),
      };
      (mockRegistry.resolve as jest.Mock).mockReturnValue(resolvedConfig);
      mockStreamExecutorSuccess();

      await service.executeStream(
        baseRequest,
        TEST_REQUEST_ID,
        TEST_CLIENT_ID,
        jest.fn(),
        'native',
        TEST_GATEWAY_KEY_BRANDED,
      );

      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryAlias: TEST_MODEL_ALIAS,
          fallbackAlias: asModelAlias('fallback-model'),
        }),
      );
    });

    it('should delegate stream errors to error handler and rethrow', async () => {
      const error = new Error('Stream failed');
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockRejectedValue(
        error,
      );

      await expect(
        service.executeStream(
          baseRequest,
          TEST_REQUEST_ID,
          TEST_CLIENT_ID,
          jest.fn(),
          'native',
          TEST_GATEWAY_KEY_BRANDED,
        ),
      ).rejects.toBe(error);

      expect(mockErrorHandler.handleProviderError).toHaveBeenCalledWith(
        expect.anything(),
        error,
        'anthropic',
        TEST_GATEWAY_KEY_BRANDED,
      );
    });
  });
});
