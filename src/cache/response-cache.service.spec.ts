import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ResponseCacheService,
  CachedChatResponse,
} from './response-cache.service';
import { LoggingService } from '../logging/logging.service';
import { CACHE_BACKEND } from './cache.tokens';
import type { CacheBackend } from './interfaces/cache-backend-interface';
import type { ChatCacheIdentity } from './types/chat-cache-identity.type';
import type { ProviderCallOptions } from '../providers/interfaces/ai-provider.interface';
import { AppMetricsService } from '../observability/app-metrics/app-metrics.service';
import { createMockCacheBackend } from '../common/mocks/createMockCacheBackend';
import { createMockLoggingService } from '../common/mocks/createMockLoggingService';
import { createMockConfigService } from '../common/mocks/createMockConfigService';
import {
  TEST_MODEL_ALIAS_BRANDED,
  TEST_CACHED_RESPONSE_ID,
  TEST_INPUT_TOKENS,
  TEST_OUTPUT_TOKENS_SMALL,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_CACHE_TTL_CUSTOM,
  TEST_FALLBACK_MODEL_ALIAS,
  TEST_CACHE_TTL_SECONDS,
} from '../common/mocks/test-constants';
import { asClientId, asModelAlias } from '../common/types/branded.types';

const TEST_CLIENT_ID = asClientId('test-client');
const OTHER_CLIENT_ID = asClientId('other-client');

function cacheIdentity(
  overrides: Partial<ChatCacheIdentity> = {},
): ChatCacheIdentity {
  return {
    modelAlias: TEST_MODEL_ALIAS_BRANDED,
    clientId: TEST_CLIENT_ID,
    messages: [{ role: 'user', content: 'Hello' }],
    ...overrides,
  };
}

const storedReply = (): CachedChatResponse => ({
  id: TEST_CACHED_RESPONSE_ID,
  provider: TEST_PROVIDER_INSTANCE_BRANDED,
  model: TEST_MODEL_ALIAS_BRANDED,
  output: { type: 'text', text: 'Hello!' },
  usage: {
    inputTokens: TEST_INPUT_TOKENS,
    outputTokens: TEST_OUTPUT_TOKENS_SMALL,
  },
  cached: true,
  cachedAt: '2026-01-01T00:00:00.000Z',
  finishReason: 'stop',
});

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
    const identity = cacheIdentity();

    it('should return null when cache not available', async () => {
      (mockCacheBackend.isAvailable as jest.Mock).mockReturnValue(false);

      const result = await service.getCachedResponse(identity);

      expect(result).toBeNull();
      expect(mockCacheBackend.get).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordCacheAccess).not.toHaveBeenCalled();
    });

    it('should return null when cache miss', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      const result = await service.getCachedResponse(identity);

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
        cached: true,
        cachedAt: new Date().toISOString(),
        finishReason: 'stop',
      };

      (mockCacheBackend.get as jest.Mock).mockResolvedValue(
        JSON.stringify(cached),
      );

      const result = await service.getCachedResponse(identity);

      expect(result).toEqual(cached);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Cache HIT'),
      );
      expect(mockAppMetrics.recordCacheAccess).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        true,
      );
    });

    it('should delete unservable cached reply with finishReason content_filter', async () => {
      const cached: CachedChatResponse = {
        id: TEST_CACHED_RESPONSE_ID,
        provider: TEST_PROVIDER_INSTANCE_BRANDED,
        model: TEST_MODEL_ALIAS_BRANDED,
        output: { type: 'text', text: 'I cannot help with that' },
        cached: true,
        cachedAt: new Date().toISOString(),
        finishReason: 'content_filter',
      };

      (mockCacheBackend.get as jest.Mock).mockResolvedValue(
        JSON.stringify(cached),
      );
      (mockCacheBackend.delete as jest.Mock).mockResolvedValue(true);

      const result = await service.getCachedResponse(identity);

      expect(result).toBeNull();
      expect(mockCacheBackend.delete).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unservable cached reply'),
      );
    });

    it('should delete unservable cached reply with finishReason length', async () => {
      const cached: CachedChatResponse = {
        id: TEST_CACHED_RESPONSE_ID,
        provider: TEST_PROVIDER_INSTANCE_BRANDED,
        model: TEST_MODEL_ALIAS_BRANDED,
        output: { type: 'text', text: 'truncated' },
        cached: true,
        cachedAt: new Date().toISOString(),
        finishReason: 'length',
      };

      (mockCacheBackend.get as jest.Mock).mockResolvedValue(
        JSON.stringify(cached),
      );
      (mockCacheBackend.delete as jest.Mock).mockResolvedValue(true);

      const result = await service.getCachedResponse(identity);

      expect(result).toBeNull();
      expect(mockCacheBackend.delete).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unservable cached reply'),
      );
      expect(mockAppMetrics.recordCacheAccess).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        false,
      );
    });

    it('should generate same cache key for same request', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      await service.getCachedResponse(identity);
      const key1 = (mockCacheBackend.get as jest.Mock).mock.calls[0][0];

      await service.getCachedResponse(identity);
      const key2 = (mockCacheBackend.get as jest.Mock).mock.calls[1][0];

      expect(key1).toBe(key2);
    });

    it('should generate different cache key for different clientId', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      await service.getCachedResponse(identity);
      const keyA = (mockCacheBackend.get as jest.Mock).mock.calls[0][0];

      await service.getCachedResponse(
        cacheIdentity({ clientId: OTHER_CLIENT_ID }),
      );
      const keyB = (mockCacheBackend.get as jest.Mock).mock.calls[1][0];

      expect(keyA).not.toBe(keyB);
    });

    it('should generate different cache key for different messages', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      await service.getCachedResponse(identity);
      const key1 = (mockCacheBackend.get as jest.Mock).mock.calls[0][0];

      await service.getCachedResponse(
        cacheIdentity({
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      );
      const key2 = (mockCacheBackend.get as jest.Mock).mock.calls[1][0];

      expect(key1).not.toBe(key2);
    });

    it('should generate different cache key for different callParams', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      await service.getCachedResponse(
        cacheIdentity({ callParams: { temperature: 0.7 } }),
      );
      const key1 = (mockCacheBackend.get as jest.Mock).mock.calls[0][0];

      await service.getCachedResponse(
        cacheIdentity({ callParams: { temperature: 0.9 } }),
      );
      const key2 = (mockCacheBackend.get as jest.Mock).mock.calls[1][0];

      expect(key1).not.toBe(key2);
    });

    it('should delete invalid cache entry on parse error', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue('invalid json');
      (mockCacheBackend.delete as jest.Mock).mockResolvedValue(true);

      const result = await service.getCachedResponse(identity);

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

      await service.getCachedResponse(identity);

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

      const result = await service.getCachedResponse(identity);

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

      const result = await service.getCachedResponse(identity);

      expect(result).toBeNull();
      expect(mockCacheBackend.delete).toHaveBeenCalled();
      expect(mockAppMetrics.recordCacheAccess).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        false,
      );
    });
  });

  describe('setCachedResponse', () => {
    const identity = cacheIdentity();
    const response = storedReply();

    it('should generate different cache key for different modelAlias', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      await service.getCachedResponse(identity);
      const keyPrimary = (mockCacheBackend.get as jest.Mock).mock.calls[0][0];

      await service.getCachedResponse(
        cacheIdentity({ modelAlias: asModelAlias('other-model-alias') }),
      );
      const keyOther = (mockCacheBackend.get as jest.Mock).mock.calls[1][0];

      expect(keyPrimary).not.toBe(keyOther);
    });

    it('should not cache when cache not available', async () => {
      (mockCacheBackend.isAvailable as jest.Mock).mockReturnValue(false);

      await service.setCachedResponse(identity, response);

      expect(mockCacheBackend.set).not.toHaveBeenCalled();
    });

    it('should cache response with default TTL', async () => {
      (mockCacheBackend.set as jest.Mock).mockResolvedValue(true);

      await service.setCachedResponse(identity, response);

      expect(mockCacheBackend.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"cached":true'),
        TEST_CACHE_TTL_SECONDS,
      );
    });

    it('should cache response with custom TTL', async () => {
      (mockCacheBackend.set as jest.Mock).mockResolvedValue(true);

      await service.setCachedResponse(
        identity,
        response,
        TEST_CACHE_TTL_CUSTOM,
      );

      expect(mockCacheBackend.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        TEST_CACHE_TTL_CUSTOM,
      );
    });

    it('should persist the provided payload including thinkingContent', async () => {
      let stored: string | undefined;
      (mockCacheBackend.set as jest.Mock).mockImplementation(
        (_key: string, value: string) => {
          stored = value;
          return true;
        },
      );
      (mockCacheBackend.get as jest.Mock).mockImplementation(
        () => stored ?? null,
      );

      const withThinking: CachedChatResponse = {
        ...response,
        thinkingContent: 'step',
        effectiveModelAlias: TEST_FALLBACK_MODEL_ALIAS,
      };

      await service.setCachedResponse(identity, withThinking);
      const parsed = await service.getCachedResponse(identity);

      expect(parsed?.thinkingContent).toBe('step');
      expect(parsed?.finishReason).toBe('stop');
      expect(parsed?.effectiveModelAlias).toBe(TEST_FALLBACK_MODEL_ALIAS);
    });

    it('should log debug on successful cache set', async () => {
      (mockCacheBackend.set as jest.Mock).mockResolvedValue(true);

      await service.setCachedResponse(identity, response);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Cache SET'),
      );
    });

    it('should not warn Failed to cache when set returns true (NX noop path)', async () => {
      (mockCacheBackend.set as jest.Mock).mockResolvedValue(true);

      await service.setCachedResponse(identity, response);

      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to cache response'),
      );
    });

    it('should log warn when cache set fails', async () => {
      (mockCacheBackend.set as jest.Mock).mockResolvedValue(false);

      await service.setCachedResponse(identity, response);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cache response'),
      );
    });
  });

  describe('invalidateCache', () => {
    const identity = cacheIdentity();

    it('should delete cache entry', async () => {
      (mockCacheBackend.delete as jest.Mock).mockResolvedValue(true);

      await service.invalidateCache(identity);

      expect(mockCacheBackend.delete).toHaveBeenCalled();
    });

    it('should log info on successful invalidation', async () => {
      (mockCacheBackend.delete as jest.Mock).mockResolvedValue(true);

      await service.invalidateCache(identity);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Cache invalidated'),
      );
    });

    it('should not log when delete returns false', async () => {
      (mockCacheBackend.delete as jest.Mock).mockResolvedValue(false);

      await service.invalidateCache(identity);

      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('serializeCallParamsForCache', () => {
    it('should include all relevant call params', async () => {
      const callParams: ProviderCallOptions = {
        temperature: 0.7,
        maxOutputTokens: 1000,
        topP: 0.9,
        topK: 40,
        stop: ['END'],
        frequencyPenalty: 0.5,
        presencePenalty: 0.5,
        seed: 42,
        responseFormat: { type: 'json_object' },
        thinkingEnabled: true,
        thinkingBudget: 'low',
        parallelToolCalls: false,
      };

      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      const identity = cacheIdentity({ callParams });
      await service.getCachedResponse(identity);
      await service.getCachedResponse(identity);

      const key1 = (mockCacheBackend.get as jest.Mock).mock.calls[0][0];
      const key2 = (mockCacheBackend.get as jest.Mock).mock.calls[1][0];

      expect(key1).toBe(key2);
    });

    it('should handle undefined callParams', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getCachedResponse(cacheIdentity()),
      ).resolves.not.toThrow();
    });
  });

  describe('buildIdentityKey', () => {
    const params: ProviderCallOptions = { temperature: 0.7 };

    it('returns the same key for the same identity', () => {
      const identity = cacheIdentity({ callParams: params });
      const first = service.buildIdentityKey(identity);
      const second = service.buildIdentityKey(identity);

      expect(first).toBe(second);
    });

    it('returns a different key for a different clientId', () => {
      const first = service.buildIdentityKey(cacheIdentity());
      const second = service.buildIdentityKey(
        cacheIdentity({ clientId: OTHER_CLIENT_ID }),
      );

      expect(first).not.toBe(second);
    });

    it('matches the key used by getCachedResponse', async () => {
      (mockCacheBackend.get as jest.Mock).mockResolvedValue(null);

      const identity = cacheIdentity();
      const key = service.buildIdentityKey(identity);
      await service.getCachedResponse(identity);

      expect(mockCacheBackend.get).toHaveBeenCalledWith(key);
    });
  });
});
