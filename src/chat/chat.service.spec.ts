jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { LoggingService } from '../logging/logging.service';
import { ChatProviderCallService } from './chat-provider-call.service';
import { SmartRateLimiterService } from '../rate-limit/smart-rate-limiter.service';
import { ResponseCacheService } from '../cache/response-cache.service';
import { ResilientExecutor } from '../common/resilience/resilient-executor';
import { createMockLoggingService } from '../common/mocks/createMockLoggingService';
import { createMockResponseCacheService } from '../common/mocks/createMockResponseCacheService';
import { createMockSmartRateLimiter } from '../common/mocks/createMockSmartRateLimiter';
import { createMockResilientExecutor } from '../common/mocks/createMockResilientExecutor';
import { createMockProviderRegistryService } from '../common/mocks/createMockProviderRegistryService';
import type { ResolvedProviderConfig } from '../providers/provider-registry.service';
import {
  VALID_CONVERSATION_ID,
  TEST_MODEL_ALIAS,
} from '../common/mocks/test-constants';
import { createMockDefaultResolvedConfig } from '../common/mocks/createMockResolvedProviderConfig';

const CACHE_ENABLED_GATEWAY = {
  models: {
    [TEST_MODEL_ALIAS]: {
      providerInstance: 'anthropic-primary',
      modelId: 'claude-sonnet-4-5',
    },
  },
  providers: {
    'anthropic-primary': {
      type: 'anthropic',
      apiKeyRef: 'ANTHROPIC_API_KEY',
      enabled: true,
    },
  },
};

describe('ChatService', () => {
  let service: ChatService;
  let mockRegistry: Partial<ProviderRegistryService>;
  let mockConfig: Partial<ConfigService>;
  let mockProviderCall: Partial<ChatProviderCallService>;
  let mockCache: Partial<ResponseCacheService>;
  let mockRateLimiter: Partial<SmartRateLimiterService>;
  let mockLogger: Partial<LoggingService>;
  let mockExecutor: Partial<ResilientExecutor>;
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

  beforeEach(async () => {
    resolvedConfig = createMockDefaultResolvedConfig();
    mockRegistry = createMockProviderRegistryService();
    (mockRegistry.resolve as jest.Mock).mockReturnValue(resolvedConfig);

    mockConfig = {
      get: jest.fn((key) => {
        if (key === 'gateway') return { models: {}, providers: {} };
        if (key === 'resolvedSystemPrompts')
          return { master: 'you are helpful', perModelByAlias: {} };
        return undefined;
      }),
    };

    mockProviderCall = {
      completeOnce: jest.fn().mockResolvedValue({
        id: 'resp-123',
        output: { text: 'Response text' },
        usage: { inputTokens: 10, outputTokens: 20 },
        finishReason: 'stop',
      }),
    };

    mockCache = createMockResponseCacheService();
    mockRateLimiter = createMockSmartRateLimiter();
    mockLogger = createMockLoggingService();
    mockExecutor = createMockResilientExecutor();

    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ProviderRegistryService, useValue: mockRegistry },
        { provide: ConfigService, useValue: mockConfig },
        { provide: ChatProviderCallService, useValue: mockProviderCall },
        { provide: ResponseCacheService, useValue: mockCache },
        { provide: SmartRateLimiterService, useValue: mockRateLimiter },
        { provide: LoggingService, useValue: mockLogger },
        { provide: ResilientExecutor, useValue: mockExecutor },
      ],
    }).compile();

    service = module.get(ChatService);
  });

  describe('executeChat', () => {
    it('should execute non-streaming chat', async () => {
      mockExecutorChatSuccess({ text: 'Hello!' });

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };

      const result = await service.executeChat(
        request,
        'req-123',
        'gw_key_123',
      );

      expect(result.output.text).toBe('Hello!');
      expect(result.id).toBe('gw_test-uuid');
    });

    it('should check rate limit cooldown', async () => {
      mockExecutorChatSuccess({ text: 'Ok' });

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };

      await service.executeChat(request, 'req-123', 'gw_key_123');

      expect(mockRateLimiter.checkCooldown).toHaveBeenCalledWith(
        'gw_key_123',
        'anthropic',
      );
    });

    it('should throw when rate limited', async () => {
      (mockRateLimiter.checkCooldown as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: 'Cooldown active',
      });

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };

      await expect(
        service.executeChat(request, 'req-123', 'gw_key_123'),
      ).rejects.toThrow(HttpException);
    });

    it('should check cache before provider call', async () => {
      const cachedResponse = {
        id: 'cached-123',
        output: { type: 'text', text: 'Cached response' },
        cached: true,
      };
      (mockCache.getCachedResponse as jest.Mock).mockResolvedValue(
        cachedResponse,
      );
      (mockConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'gateway') return CACHE_ENABLED_GATEWAY;
        if (key === 'resolvedSystemPrompts')
          return { master: 'you are helpful', perModelByAlias: {} };
        return undefined;
      });

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };

      const result = await service.executeChat(
        request,
        'req-123',
        'gw_key_123',
      );

      expect(result).toEqual(cachedResponse);
      expect(mockExecutor.executeWithRetryAndFallback).not.toHaveBeenCalled();
    });

    it('should skip cache for tooling requests', async () => {
      mockExecutorChatSuccess({ text: 'Ok' });

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
        tooling: {
          definitions: [{ name: 'test', parameters: {} }],
        },
      };

      await service.executeChat(request, 'req-123', 'gw_key_123');

      expect(mockCache.getCachedResponse).not.toHaveBeenCalled();
    });

    it('should validate tooling support', async () => {
      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
        tooling: {
          definitions: [{ name: 'test', parameters: {} }],
        },
      };

      mockExecutorChatSuccess({
        text: 'Ok',
        stopReason: 'tool_use',
        toolCalls: [{ id: 'call-1', name: 'test', arguments: {} }],
      });

      await service.executeChat(request, 'req-123', 'gw_key_123');

      expect(mockRegistry.resolve).toHaveBeenCalledWith(TEST_MODEL_ALIAS);
      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalled();
    });

    it('should throw when tooling is not supported by model', async () => {
      resolvedConfig = {
        ...createMockDefaultResolvedConfig(),
        capabilities: { tools: false },
      };
      (mockRegistry.resolve as jest.Mock).mockReturnValue(resolvedConfig);

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
        tooling: {
          definitions: [{ name: 'test', parameters: {} }],
        },
      };

      await expect(
        service.executeChat(request, 'req-123', 'gw_key_123'),
      ).rejects.toThrow(HttpException);
    });

    it('should resolve provider call options', async () => {
      mockExecutorChatSuccess({ text: 'Ok' });

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
        params: { temperature: 0.9 },
      };

      await service.executeChat(request, 'req-123', 'gw_key_123');

      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalled();
    });

    it('should add conversationId to response', async () => {
      mockExecutorChatSuccess({ text: 'Ok' });

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
        conversationId: VALID_CONVERSATION_ID,
      };

      const result = await service.executeChat(
        request,
        'req-123',
        'gw_key_123',
      );

      expect(result).toMatchObject({
        conversationId: VALID_CONVERSATION_ID,
      });
    });

    it('should cache response after successful execution', async () => {
      mockExecutorChatSuccess({ text: 'Cached later' });
      (mockConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'gateway') return CACHE_ENABLED_GATEWAY;
        if (key === 'resolvedSystemPrompts')
          return { master: 'you are helpful', perModelByAlias: {} };
        return undefined;
      });

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };

      await service.executeChat(request, 'req-123', 'gw_key_123');

      expect(mockCache.setCachedResponse).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          id: 'gw_test-uuid',
          output: { type: 'text', text: 'Cached later' },
        }),
        expect.any(Object),
      );
    });

    it('should skip rate limit and cache when gatewayKey is empty', async () => {
      mockExecutorChatSuccess({ text: 'No key' });

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };

      await service.executeChat(request, 'req-123', '');

      expect(mockRateLimiter.checkCooldown).not.toHaveBeenCalled();
      expect(mockCache.getCachedResponse).not.toHaveBeenCalled();
    });

    it('should map full response with toolCalls and thinkingContent', async () => {
      mockExecutorChatSuccess({
        text: 'Thinking...',
        stopReason: 'tool_use',
        toolCalls: [
          { id: 'call-1', name: 'search', arguments: { query: 'test' } },
        ],
        thinkingContent: 'Let me search for that',
        usageDetails: { cache_read: 100, cache_write: 50 },
        systemFingerprint: 'fp_abc123',
      });

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
        tooling: {
          definitions: [{ name: 'search', parameters: {} }],
        },
      };

      const result = await service.executeChat(
        request,
        'req-123',
        'gw_key_123',
      );

      expect(result).toMatchObject({
        id: 'gw_test-uuid',
        provider: 'anthropic',
        model: TEST_MODEL_ALIAS,
        output: { type: 'text', text: 'Thinking...' },
        requestId: 'req-123',
        toolCalls: [
          { id: 'call-1', name: 'search', arguments: { query: 'test' } },
        ],
        thinkingContent: 'Let me search for that',
        usageDetails: { cache_read: 100, cache_write: 50 },
        systemFingerprint: 'fp_abc123',
        finishReason: 'tool_calls',
      });
    });

    it('should include effectiveModelAlias when fallback occurs', async () => {
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockResolvedValue(
        {
          value: {
            response: {
              text: 'Fallback response',
              usage: { inputTokens: 5, outputTokens: 10 },
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

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };

      const result = await service.executeChat(
        request,
        'req-123',
        'gw_key_123',
      );

      expect(result.model).toBe(TEST_MODEL_ALIAS);
      expect(result).toMatchObject({
        model: TEST_MODEL_ALIAS,
        effectiveModelAlias: 'fallback-model',
      });
    });

    it('should not set fallbackAlias for tooling requests', async () => {
      mockExecutorChatSuccess({
        text: 'Ok',
        stopReason: 'tool_use',
        toolCalls: [{ id: 'call-1', name: 'test', arguments: {} }],
      });

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
        tooling: {
          definitions: [{ name: 'test', parameters: {} }],
        },
      };

      await service.executeChat(request, 'req-123', 'gw_key_123');

      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryAlias: TEST_MODEL_ALIAS,
          fallbackAlias: undefined,
        }),
      );
    });
  });

  describe('executeStream', () => {
    it('should complete stream and emit done event', async () => {
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockResolvedValue(
        {
          value: {
            resolved: resolvedConfig,
            assembledText: 'Hello',
            usageMetadata: { inputTokens: 5, outputTokens: 10 },
            toolCalls: [],
            stopReason: 'end_turn',
          },
          usedAlias: TEST_MODEL_ALIAS,
          attempts: 1,
          didFallback: false,
        },
      );

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };
      const emitted: Array<{ name: string; data: unknown }> = [];

      await service.executeStream(request, 'req-123', (event) => {
        emitted.push(event);
      });

      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalled();
      expect(emitted.some((event) => event.name === 'done')).toBe(true);
    });

    it('should invoke resilient executor for streaming', async () => {
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockResolvedValue(
        {
          value: {
            resolved: resolvedConfig,
            assembledText: 'Ok',
            usageMetadata: { inputTokens: 1, outputTokens: 2 },
            toolCalls: [],
            stopReason: 'end_turn',
          },
          usedAlias: TEST_MODEL_ALIAS,
          attempts: 1,
          didFallback: false,
        },
      );

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };

      await service.executeStream(request, 'req-123', jest.fn());

      expect(mockRegistry.resolve).toHaveBeenCalledWith(TEST_MODEL_ALIAS);
      expect(mockExecutor.executeWithRetryAndFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryAlias: TEST_MODEL_ALIAS,
          requestId: 'req-123',
        }),
      );
    });

    it('should emit done event with full metadata', async () => {
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockResolvedValue(
        {
          value: {
            resolved: resolvedConfig,
            assembledText: 'Complete',
            usageMetadata: { inputTokens: 15, outputTokens: 25 },
            toolCalls: [
              { id: 'call-1', name: 'search', arguments: { q: 'test' } },
            ],
            stopReason: 'tool_use',
            systemFingerprint: 'fp_stream_123',
            thinkingContent: 'Stream thinking',
          },
          usedAlias: TEST_MODEL_ALIAS,
          attempts: 1,
          didFallback: false,
        },
      );

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
        tooling: {
          definitions: [{ name: 'search', parameters: {} }],
        },
      };
      const emitted: Array<{ name: string; data: unknown }> = [];

      await service.executeStream(request, 'req-123', (event) => {
        emitted.push(event);
      });

      const doneEvent = emitted.find((e) => e.name === 'done');
      expect(doneEvent).toBeDefined();
      expect(doneEvent?.data).toMatchObject({
        usage: {
          inputTokens: 15,
          outputTokens: 25,
          totalTokens: 40,
        },
        toolCalls: [{ id: 'call-1', name: 'search', arguments: { q: 'test' } }],
        finishReason: 'tool_calls',
        systemFingerprint: 'fp_stream_123',
        thinkingContent: 'Stream thinking',
      });
    });

    it('should validate tooling support for streaming', async () => {
      resolvedConfig = {
        ...createMockDefaultResolvedConfig(),
        capabilities: { tools: false, streaming: true },
      };
      (mockRegistry.resolve as jest.Mock).mockReturnValue(resolvedConfig);

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
        tooling: {
          definitions: [{ name: 'test', parameters: {} }],
        },
      };

      await expect(
        service.executeStream(request, 'req-123', jest.fn()),
      ).rejects.toThrow(HttpException);
    });

    it('should handle stream errors', async () => {
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockRejectedValue(
        new Error('Stream failed'),
      );

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };

      await expect(
        service.executeStream(request, 'req-123', jest.fn()),
      ).rejects.toThrow('Stream failed');
    });
  });

  describe('validateForStreaming', () => {
    it('should pass when streaming is fully supported', () => {
      resolvedConfig = {
        ...createMockDefaultResolvedConfig(),
        capabilities: { streaming: true, tools: true },
      };
      (mockRegistry.resolve as jest.Mock).mockReturnValue(resolvedConfig);

      expect(() =>
        service.validateForStreaming(TEST_MODEL_ALIAS),
      ).not.toThrow();
    });

    it('should throw when streaming capability is disabled', () => {
      resolvedConfig = {
        ...createMockDefaultResolvedConfig(),
        capabilities: { streaming: false },
      };
      (mockRegistry.resolve as jest.Mock).mockReturnValue(resolvedConfig);

      expect(() => service.validateForStreaming(TEST_MODEL_ALIAS)).toThrow(
        HttpException,
      );
    });

    it('should throw when provider stream adapter is missing', () => {
      const baseConfig = createMockDefaultResolvedConfig();
      resolvedConfig = {
        ...baseConfig,
        provider: {
          ...baseConfig.provider,
          stream: undefined,
        },
      };
      (mockRegistry.resolve as jest.Mock).mockReturnValue(resolvedConfig);

      expect(() => service.validateForStreaming(TEST_MODEL_ALIAS)).toThrow(
        HttpException,
      );
    });
  });

  describe('handleProviderError', () => {
    it('should set cooldown on 429 error with gatewayKey', async () => {
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockRejectedValue(
        new HttpException('Rate limited', 429),
      );

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };

      await expect(
        service.executeChat(request, 'req-123', 'gw_key_123'),
      ).rejects.toThrow();

      expect(mockRateLimiter.setCooldown).toHaveBeenCalledWith(
        'gw_key_123',
        'anthropic',
      );
    });

    it('should not set cooldown on 429 error without gatewayKey', async () => {
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockRejectedValue(
        new HttpException('Rate limited', 429),
      );

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };

      await expect(
        service.executeChat(request, 'req-123', ''),
      ).rejects.toThrow();

      expect(mockRateLimiter.setCooldown).not.toHaveBeenCalled();
    });

    it('should log warning on 4xx client errors', async () => {
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockRejectedValue(
        new HttpException('Bad request', 400),
      );

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };

      await expect(
        service.executeChat(request, 'req-123', 'gw_key_123'),
      ).rejects.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Chat provider request failed',
        expect.objectContaining({
          provider: 'anthropic',
          status: 400,
        }),
      );
    });

    it('should not log warning on 5xx server errors', async () => {
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockRejectedValue(
        new HttpException('Internal server error', 500),
      );

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };

      await expect(
        service.executeChat(request, 'req-123', 'gw_key_123'),
      ).rejects.toThrow();

      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        'Chat provider request failed',
        expect.anything(),
      );
    });

    it('should log warning on generic Error', async () => {
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockRejectedValue(
        new Error('Connection timeout'),
      );

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };

      await expect(
        service.executeChat(request, 'req-123', 'gw_key_123'),
      ).rejects.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Chat provider call failed',
        expect.objectContaining({
          provider: 'anthropic',
          message: 'Connection timeout',
        }),
      );
    });

    it('should handle 429 with error code in response body', async () => {
      const error = new HttpException(
        {
          code: 'rate_limit_exceeded',
          message: 'Too many requests',
        },
        429,
      );
      (mockExecutor.executeWithRetryAndFallback as jest.Mock).mockRejectedValue(
        error,
      );

      const request = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };

      await expect(
        service.executeChat(request, 'req-123', 'gw_key_123'),
      ).rejects.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Chat provider rate limited',
        expect.objectContaining({
          provider: 'anthropic',
          status: 429,
          code: 'rate_limit_exceeded',
        }),
      );
    });
  });
});
