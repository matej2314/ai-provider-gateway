jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { LoggingService } from '../logging/logging.service';
import { ApiErrorCode } from '../common/errors/api-error.code';
import { ChatProviderCallService } from './services/chat-provider-call.service';
import { ChatCacheGuardService } from './services/chat-cache-guard.service';
import { ChatValidationService } from './services/chat-validation.service';
import { ChatErrorHandlerService } from './services/chat-error-handler.service';
import {
  ChatResponseBuilderService,
  type ProviderResponse,
} from './services/chat-response-builder.service';
import { resolveProviderCallOptions } from './helpers/resolve-provider-call-options';
import { ResilientExecutor } from '../common/resilience/resilient-executor';
import { createMockLoggingService } from '../common/mocks/createMockLoggingService';
import { createMockResilientExecutor } from '../common/mocks/createMockResilientExecutor';
import { createMockProviderRegistryService } from '../common/mocks/createMockProviderRegistryService';
import { createMockDefaultResolvedConfig } from '../common/mocks/createMockResolvedProviderConfig';
import { createMockConfigService } from '../common/mocks/createMockConfigService';
import {
  VALID_CONVERSATION_ID,
  TEST_MODEL_ALIAS,
} from '../common/mocks/test-constants';
import type { ResolvedProviderConfig } from '../providers/provider-registry.service';

describe('ChatService', () => {
  let service: ChatService;
  let mockRegistry: Partial<ProviderRegistryService>;
  let mockConfig: Partial<ConfigService>;
  let mockProviderCall: Partial<ChatProviderCallService>;
  let mockExecutor: Partial<ResilientExecutor>;
  let mockLogger: Partial<LoggingService>;
  let mockCacheGuard: Partial<ChatCacheGuardService>;
  let mockValidation: Partial<ChatValidationService>;
  let mockErrorHandler: Partial<ChatErrorHandlerService>;
  let mockResponseBuilder: Partial<ChatResponseBuilderService>;
  let resolvedConfig: ResolvedProviderConfig;

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
      usedAlias: TEST_MODEL_ALIAS,
      attempts: 1,
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
      usedAlias: TEST_MODEL_ALIAS,
      attempts: 1,
      didFallback: false,
    });
  }

  beforeEach(async () => {
    resolvedConfig = createMockDefaultResolvedConfig();
    mockRegistry = createMockProviderRegistryService();
    (mockRegistry.resolve as jest.Mock).mockReturnValue(resolvedConfig);

    mockConfig = createMockConfigService({
      gatewayOptions: {
        replace: { clients: true, providers: true, models: true },
        clients: {},
        providers: {},
        models: {},
      },
      resolvedSystemPrompts: { master: 'you are helpful', main: undefined },
    });

    mockLogger = createMockLoggingService();
    mockExecutor = createMockResilientExecutor();

    mockCacheGuard = {
      checkRateLimit: jest.fn().mockResolvedValue(undefined),
      getCachedIfAllowed: jest.fn().mockResolvedValue(null),
      setCachedIfAllowed: jest.fn().mockResolvedValue(undefined),
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
          providerName: string,
          modelAlias: string,
          requestId: string,
          conversationId: string,
          effectiveModelAlias?: string,
          _options?: unknown,
          _providerType?: string,
        ) => ({
          id: 'gw_test-uuid',
          provider: providerName,
          model: modelAlias,
          ...(effectiveModelAlias && { effectiveModelAlias }),
          output: { type: 'text' as const, text: response.text },
          usage: response.usage,
          requestId,
          conversationId,
          finishReason: 'stop',
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

    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ProviderRegistryService, useValue: mockRegistry },
        { provide: ConfigService, useValue: mockConfig },
        { provide: LoggingService, useValue: mockLogger },
        { provide: ResilientExecutor, useValue: mockExecutor },
        { provide: ChatProviderCallService, useValue: mockProviderCall },
        { provide: ChatCacheGuardService, useValue: mockCacheGuard },
        { provide: ChatValidationService, useValue: mockValidation },
        { provide: ChatErrorHandlerService, useValue: mockErrorHandler },
        { provide: ChatResponseBuilderService, useValue: mockResponseBuilder },
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
        'req-123',
        'gw_key_123',
        'native',
      );

      expect(mockValidation.validateTooling).toHaveBeenCalledWith(
        baseRequest,
        resolvedConfig,
      );
      expect(mockCacheGuard.checkRateLimit).toHaveBeenCalledWith(
        'gw_key_123',
        'anthropic',
        'req-123',
      );
      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalled();
      expect(mockResponseBuilder.buildChatResponse).toHaveBeenCalled();
      expect(mockValidation.validateThinking).toHaveBeenCalledWith(
        baseRequest,
        resolvedConfig,
        expectedOptions,
      );
      expect(result.output.text).toBe('Hello!');
      expect(result.id).toBe('gw_test-uuid');
    });

    it('should return cached response without calling executor', async () => {
      const cachedResponse = {
        id: 'cached-123',
        output: { type: 'text' as const, text: 'Cached response' },
      };
      (mockCacheGuard.getCachedIfAllowed as jest.Mock).mockResolvedValue(
        cachedResponse,
      );

      const result = await service.executeChat(
        baseRequest,
        'req-123',
        'gw_key_123',
        'native',
      );

      expect(mockCacheGuard.getCachedIfAllowed).toHaveBeenCalled();
      expect(result).toBe(cachedResponse);
      expect(mockExecutor.executeWithRetryAndFallback).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Chat cache hit');
    });

    it('should propagate cache guard rate limit errors', async () => {
      const rateLimitError = new HttpException('Rate limited', 429);
      (mockCacheGuard.checkRateLimit as jest.Mock).mockRejectedValue(
        rateLimitError,
      );

      await expect(
        service.executeChat(baseRequest, 'req-123', 'gw_key_123', 'native'),
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
        'req-123',
        'gw_key_123',
        'native',
      );

      expect(mockValidation.validateTooling).toHaveBeenCalledWith(
        toolingRequest,
        resolvedConfig,
      );
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
          'req-123',
          'gw_key_123',
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
        service.executeChat(baseRequest, 'req-123', 'gw_key_123', 'native'),
      ).rejects.toBe(validationError);
      expect(mockExecutor.executeWithRetryAndFallback).not.toHaveBeenCalled();
    });

    it('should reject native ingress with more than 150 messages before executor', async () => {
      const oversizedRequest = {
        ...baseRequest,
        messages: Array(151).fill({ role: 'user' as const, content: 'x' }),
      };

      await expect(
        service.executeChat(oversizedRequest, 'req-123', 'gw_key_123', 'native'),
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
        'req-123',
        'gw_key_123',
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
          'req-123',
          'gw_key_123',
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

      await service.executeChat(request, 'req-123', 'gw_key_123', 'native');

      expect(mockResponseBuilder.buildChatResponse).toHaveBeenCalledWith(
        expect.any(Object),
        'anthropic',
        TEST_MODEL_ALIAS,
        'req-123',
        VALID_CONVERSATION_ID,
        undefined,
        expectedOptions,
        resolvedConfig.providerType,
      );
    });

    it('should delegate cache write after successful execution', async () => {
      mockExecutorChatSuccess({ text: 'Fresh answer' });

      await service.executeChat(baseRequest, 'req-123', 'gw_key_123', 'native');

      expect(mockCacheGuard.setCachedIfAllowed).toHaveBeenCalledWith(
        baseRequest,
        expect.objectContaining({
          output: { type: 'text', text: 'Fresh answer' },
        }),
        expect.any(Object),
      );
    });

    it('should skip rate limit and cache when gatewayKey is empty', async () => {
      mockExecutorChatSuccess();

      await service.executeChat(baseRequest, 'req-123', '', 'native');

      expect(mockCacheGuard.checkRateLimit).not.toHaveBeenCalled();
      expect(mockCacheGuard.getCachedIfAllowed).not.toHaveBeenCalled();
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
              modelAlias: 'fallback-model',
            },
          },
          usedAlias: 'fallback-model',
          attempts: 3,
          didFallback: true,
        },
      );

      const expectedOptions = resolveProviderCallOptions(
        resolvedConfig.params,
        baseRequest.params,
      );

      await service.executeChat(baseRequest, 'req-123', 'gw_key_123', 'native');

      expect(mockResponseBuilder.buildChatResponse).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Fallback response' }),
        'anthropic',
        TEST_MODEL_ALIAS,
        'req-123',
        expect.any(String),
        'fallback-model',
        expectedOptions,
        resolvedConfig.providerType,
      );
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
        'req-123',
        'gw_key_123',
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
        fallbackAlias: 'fallback-model',
      };
      (mockRegistry.resolve as jest.Mock).mockReturnValue(resolvedConfig);
      mockExecutorChatSuccess();

      await service.executeChat(baseRequest, 'req-123', 'gw_key_123', 'native');

      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryAlias: TEST_MODEL_ALIAS,
          fallbackAlias: 'fallback-model',
        }),
      );
    });

    it('should delegate provider errors to error handler and rethrow', async () => {
      const error = new HttpException('Rate limited', 429);
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockRejectedValue(
        error,
      );

      await expect(
        service.executeChat(baseRequest, 'req-123', 'gw_key_123', 'native'),
      ).rejects.toBe(error);

      expect(mockErrorHandler.handleProviderError).toHaveBeenCalledWith(
        expect.anything(),
        error,
        'anthropic',
        'gw_key_123',
      );
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
        'req-123',
        (event) => {
          emitted.push(event);
        },
        'native',
      );

      expect(mockValidation.validateTooling).toHaveBeenCalledWith(
        baseRequest,
        resolvedConfig,
      );
      expect(mockValidation.validateThinking).toHaveBeenCalledWith(
        baseRequest,
        resolvedConfig,
        expectedOptions,
      );
      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryAlias: TEST_MODEL_ALIAS,
          requestId: 'req-123',
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
        service.executeStream(oversizedRequest, 'req-123', jest.fn(), 'native'),
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
      });

      const expectedOptions = resolveProviderCallOptions(
        resolvedConfig.params,
        baseRequest.params,
      );

      await service.executeStream(baseRequest, 'req-123', jest.fn(), 'native');

      expect(mockResponseBuilder.buildStreamDoneEvent).toHaveBeenCalledWith(
        { inputTokens: 15, outputTokens: 25 },
        [{ id: 'call-1', name: 'search', arguments: { q: 'test' } }],
        'tool_use',
        'fp_stream_123',
        'Stream thinking',
        expectedOptions,
        resolvedConfig.providerType,
      );
    });

    it('should use primary fallbackAlias for streaming', async () => {
      resolvedConfig = {
        ...createMockDefaultResolvedConfig(),
        fallbackAlias: 'fallback-model',
      };
      (mockRegistry.resolve as jest.Mock).mockReturnValue(resolvedConfig);
      mockStreamExecutorSuccess();

      await service.executeStream(baseRequest, 'req-123', jest.fn(), 'native');

      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryAlias: TEST_MODEL_ALIAS,
          fallbackAlias: 'fallback-model',
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
          'req-123',
          jest.fn(),
          'native',
          'gw_key_123',
        ),
      ).rejects.toBe(error);

      expect(mockErrorHandler.handleProviderError).toHaveBeenCalledWith(
        expect.anything(),
        error,
        'anthropic',
        'gw_key_123',
      );
    });
  });
});
