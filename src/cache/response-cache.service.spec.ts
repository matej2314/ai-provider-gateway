import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ResponseCacheService,
  CachedChatResponse,
} from './response-cache.service';
import { LoggingService } from '../logging/logging.service';
import { CACHE_BACKEND } from './cache.tokens';
import type { CacheBackend } from './interfaces/cache-backend-interface';
import type { ChatRequestDto } from '../chat/dto/chat-request.dto';
import type { ChatResponseData } from '../chat/services/chat-response-builder.service';
import type { ProviderCallOptions } from '../providers/interfaces/ai-provider.interface';
import { AppMetricsService } from '../observability/app-metrics/app-metrics.service';
import { createMockCacheBackend } from '../common/mocks/createMockCacheBackend';
import { createMockLoggingService } from '../common/mocks/createMockLoggingService';
import { createMockConfigService } from '../common/mocks/createMockConfigService';
import {
  TEST_MODEL_ALIAS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_CACHED_RESPONSE_ID,
  TEST_CACHED_REQUEST_ID,
  TEST_CACHED_CONVERSATION_ID,
  TEST_INPUT_TOKENS,
  TEST_OUTPUT_TOKENS_SMALL,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_CACHE_TTL_CUSTOM,
  TEST_FALLBACK_MODEL_ALIAS,
  TEST_TOOL_CALL_ID_CACHED,
  TEST_CACHE_TTL_SECONDS,
} from '../common/mocks/test-constants';

describe('ResponseCacheService', () => {
  let service: ResponseCacheService;
  let mockCacheBackend: Partial<CacheBackend>;
  let mockConfig: Partial<ConfigService>;
  let mockLogger: Partial<LoggingService>;
  let mockAppMetrics: Partial<AppMetricsService>;

  beforeEach(async () => {
    mockCacheBackend = createMockCacheBackend();
    mockConfig = createMockConfigService({
      resolvedSystemPrompts: { master: 'master prompt', main: 'main prompt' },
      cache: { keyPrefix: 'aigw:', ttl: 3600 },
    });

    mockLogger = createMockLoggingService();
    mockAppMetrics = {
      recordCacheAccess: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ResponseCacheService,
        { provide: CACHE_BACKEND, useValue: mockCacheBackend },
        { provide: ConfigService, useValue: mockConfig },
        { provide: LoggingService, useValue: mockLogger },
        { provide: AppMetricsService, useValue: mockAppMetrics },
      ],
    }).compile();

    service = module.get(ResponseCacheService);
  });

  describe('getCachedResponse', () => {
    const request: ChatRequestDto = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'user', content: 'Hello' }],
    };

    it('should return null when cache not available', async () => {
      (mockCacheBackend.isAvailable as jest.Mock).mockReturnValue(false);

      const result = await service.getCachedResponse(request);

      expect(result).toBeNull();
      expect(mockCacheBackend.get).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordCacheAccess).not.toHaveBeenCalled();
    });

    it('should return null when cache miss', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      const result = await service.getCachedResponse(request);

      expect(result).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Cache MISS'),
      );
      expect(mockAppMetrics.recordCacheAccess).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        false,
      );
    });

    it('should return parsed response on cache hit', async () => {
      const cached: CachedChatResponse = {
        id: TEST_CACHED_RESPONSE_ID,
        provider: TEST_PROVIDER_INSTANCE_BRANDED,
        model: TEST_MODEL_ALIAS_BRANDED,
        output: { type: 'text', text: 'Hello!' },
        usage: {
          inputTokens: TEST_INPUT_TOKENS,
          outputTokens: TEST_OUTPUT_TOKENS_SMALL,
        },
        requestId: TEST_CACHED_REQUEST_ID,
        cached: true,
        cachedAt: new Date().toISOString(),
      };

      (mockCacheBackend.get as jest.Mock).mockResolvedValue(
        JSON.stringify(cached),
      );

      const result = await service.getCachedResponse(request);

      expect(result).toEqual(cached);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Cache HIT'),
      );
      expect(mockAppMetrics.recordCacheAccess).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        true,
      );
    });

    it('should generate same cache key for same request', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      await service.getCachedResponse(request);
      const key1 = (mockCacheBackend.get as jest.Mock).mock.calls[0][0];

      await service.getCachedResponse(request);
      const key2 = (mockCacheBackend.get as jest.Mock).mock.calls[1][0];

      expect(key1).toBe(key2);
    });

    it('should generate different cache key for different messages', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      await service.getCachedResponse(request);
      const key1 = (mockCacheBackend.get as jest.Mock).mock.calls[0][0];

      const request2 = {
        ...request,
        messages: [{ role: 'user' as const, content: 'Hi' }],
      };
      await service.getCachedResponse(request2);
      const key2 = (mockCacheBackend.get as jest.Mock).mock.calls[1][0];

      expect(key1).not.toBe(key2);
    });

    it('should generate different cache key for different callParams', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      const callParams1: ProviderCallOptions = { temperature: 0.7 };
      await service.getCachedResponse(request, callParams1);
      const key1 = (mockCacheBackend.get as jest.Mock).mock.calls[0][0];

      const callParams2: ProviderCallOptions = { temperature: 0.9 };
      await service.getCachedResponse(request, callParams2);
      const key2 = (mockCacheBackend.get as jest.Mock).mock.calls[1][0];

      expect(key1).not.toBe(key2);
    });

    it('should delete invalid cache entry on parse error', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue('invalid json');
      (mockCacheBackend.delete as jest.Mock).mockResolvedValue(true);

      const result = await service.getCachedResponse(request);

      expect(result).toBeNull();
      expect(mockCacheBackend.delete).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse cached response'),
        expect.any(Error),
      );
      expect(mockAppMetrics.recordCacheAccess).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        false,
      );
    });

    it('should include cache key prefix from config', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      await service.getCachedResponse(request);

      const key = (mockCacheBackend.get as jest.Mock).mock.calls[0][0];
      expect(key).toMatch(/^aigw:cache:chat:/);
    });

    it('should delete cache entry when payload fails schema validation', async () => {
      const invalidShape = {
        id: 'msg-123',
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        output: { type: 'text', text: 'Hello!' },
        requestId: 'req-123',
        // ZMIANA: brak cached: true — parseCachedChatResponse zwróci null
        cachedAt: new Date().toISOString(),
      };

      (mockCacheBackend.get as jest.Mock).mockResolvedValue(
        JSON.stringify(invalidShape),
      );
      (mockCacheBackend.delete as jest.Mock).mockResolvedValue(true);

      const result = await service.getCachedResponse(request);

      expect(result).toBeNull();
      expect(mockCacheBackend.delete).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid cached response shape'),
      );
      expect(mockAppMetrics.recordCacheAccess).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        false,
      );
    });

    it('should delete cache entry when output.type is not text', async () => {
      const invalidOutput = {
        id: 'msg-123',
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        output: { type: 'json', text: '{}' }, // ZMIANA: type !== 'text'
        requestId: 'req-123',
        cached: true,
        cachedAt: new Date().toISOString(),
      };

      (mockCacheBackend.get as jest.Mock).mockResolvedValue(
        JSON.stringify(invalidOutput),
      );
      (mockCacheBackend.delete as jest.Mock).mockResolvedValue(true);

      const result = await service.getCachedResponse(request);

      expect(result).toBeNull();
      expect(mockCacheBackend.delete).toHaveBeenCalled();
      expect(mockAppMetrics.recordCacheAccess).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        false,
      );
    });
  });

  describe('setCachedResponse', () => {
    const request: ChatRequestDto = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const response: ChatResponseData = {
      id: TEST_CACHED_RESPONSE_ID,
      provider: TEST_PROVIDER_INSTANCE_BRANDED,
      model: TEST_MODEL_ALIAS_BRANDED,
      output: { type: 'text', text: 'Hello!' },
      usage: {
        inputTokens: TEST_INPUT_TOKENS,
        outputTokens: TEST_OUTPUT_TOKENS_SMALL,
      },
      requestId: TEST_CACHED_REQUEST_ID,
      conversationId: TEST_CACHED_CONVERSATION_ID,
    };

    it('should generate different cache key for different modelAlias', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      await service.getCachedResponse(request);
      const keyPrimary = (mockCacheBackend.get as jest.Mock).mock.calls[0][0];

      const requestOtherAlias = {
        ...request,
        modelAlias: 'other-model-alias',
      };
      await service.getCachedResponse(requestOtherAlias);
      const keyOther = (mockCacheBackend.get as jest.Mock).mock.calls[1][0];

      expect(keyPrimary).not.toBe(keyOther);
    });

    it('should not cache when cache not available', async () => {
      (mockCacheBackend.isAvailable as jest.Mock).mockReturnValue(false);

      await service.setCachedResponse(request, response);

      expect(mockCacheBackend.set).not.toHaveBeenCalled();
    });

    it('should cache response with default TTL', async () => {
      (mockCacheBackend.set as jest.Mock).mockResolvedValue(true);

      await service.setCachedResponse(request, response);

      expect(mockCacheBackend.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"cached":true'),
        TEST_CACHE_TTL_SECONDS,
      );
    });

    it('should cache response with custom TTL', async () => {
      (mockCacheBackend.set as jest.Mock).mockResolvedValue(true);

      await service.setCachedResponse(
        request,
        response,
        undefined,
        TEST_CACHE_TTL_CUSTOM,
      );

      expect(mockCacheBackend.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        TEST_CACHE_TTL_CUSTOM,
      );
    });

    it('should add cached flag and cachedAt timestamp', async () => {
      (mockCacheBackend.set as jest.Mock).mockResolvedValue(true);

      await service.setCachedResponse(request, response);

      const serialized = (mockCacheBackend.set as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(serialized);

      expect(parsed.cached).toBe(true);
      expect(parsed.cachedAt).toBeDefined();
      expect(new Date(parsed.cachedAt).getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
    });

    it('should cache only CacheableChatResponse fields', async () => {
      (mockCacheBackend.set as jest.Mock).mockResolvedValue(true);

      const fullResponse: ChatResponseData = {
        ...response,
        conversationId: TEST_CACHED_CONVERSATION_ID,
        toolCalls: [
          {
            id: TEST_TOOL_CALL_ID_CACHED,
            name: 'search',
            arguments: '{}',
          },
        ],
        finishReason: 'stop',
        effectiveModelAlias: TEST_FALLBACK_MODEL_ALIAS,
      };

      await service.setCachedResponse(request, fullResponse);

      const parsed = JSON.parse(
        (mockCacheBackend.set as jest.Mock).mock.calls[0][1],
      );

      expect(parsed).toEqual({
        id: fullResponse.id,
        provider: fullResponse.provider,
        model: fullResponse.model,
        output: fullResponse.output,
        usage: fullResponse.usage,
        requestId: fullResponse.requestId,
        cached: true,
        cachedAt: expect.any(String),
      });
      expect(parsed.conversationId).toBeUndefined();
      expect(parsed.toolCalls).toBeUndefined();
      expect(parsed.finishReason).toBeUndefined();
      expect(parsed.effectiveModelAlias).toBeUndefined();
    });

    it('should log debug on successful cache set', async () => {
      (mockCacheBackend.set as jest.Mock).mockResolvedValue(true);

      await service.setCachedResponse(request, response);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Cache SET'),
      );
    });

    it('should log warn when cache set fails', async () => {
      (mockCacheBackend.set as jest.Mock).mockResolvedValue(false);

      await service.setCachedResponse(request, response);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cache response'),
      );
    });
  });

  describe('invalidateCache', () => {
    const request: ChatRequestDto = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'user', content: 'Hello' }],
    };

    it('should delete cache entry', async () => {
      (mockCacheBackend.delete as jest.Mock).mockResolvedValue(true);

      await service.invalidateCache(request);

      expect(mockCacheBackend.delete).toHaveBeenCalled();
    });

    it('should log info on successful invalidation', async () => {
      (mockCacheBackend.delete as jest.Mock).mockResolvedValue(true);

      await service.invalidateCache(request);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Cache invalidated'),
      );
    });

    it('should not log when delete returns false', async () => {
      (mockCacheBackend.delete as jest.Mock).mockResolvedValue(false);

      await service.invalidateCache(request);

      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('serializeCallParamsForCache', () => {
    it('should include all relevant call params', async () => {
      const request: ChatRequestDto = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const callParams: ProviderCallOptions = {
        temperature: 0.7,
        maxOutputTokens: 1000,
        topP: 0.9,
        stop: ['END'],
        frequencyPenalty: 0.5,
        presencePenalty: 0.5,
        seed: 42,
        responseFormat: { type: 'json_object' },
      };

      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      await service.getCachedResponse(request, callParams);
      await service.getCachedResponse(request, callParams);

      const key1 = (mockCacheBackend.get as jest.Mock).mock.calls[0][0];
      const key2 = (mockCacheBackend.get as jest.Mock).mock.calls[1][0];

      expect(key1).toBe(key2);
    });

    it('should handle undefined callParams', async () => {
      const request: ChatRequestDto = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: 'Hello' }],
      };

      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getCachedResponse(request, undefined),
      ).resolves.not.toThrow();
    });
  });
});
