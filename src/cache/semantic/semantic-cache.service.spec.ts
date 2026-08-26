import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SemanticCacheService } from './semantic-cache.service';
import {
  EMBEDDING_CIRCUIT_COOLDOWN_MS,
  EMBEDDING_CIRCUIT_OPEN_AFTER,
  embeddingProbeTimeoutMs,
} from './semantic-cache.constants';
import { EMBEDDING_BACKEND, VECTOR_STORE } from './semantic-cache.tokens';
import { LoggingService } from '../../logging/logging.service';
import { AppMetricsService } from '../../observability/app-metrics/app-metrics.service';
import { createMockConfigService } from '../../common/mocks/createMockConfigService';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';
import {
  TEST_CACHED_REQUEST_ID,
  TEST_CACHED_RESPONSE_ID,
  TEST_INPUT_TOKENS,
  TEST_MODEL_ALIAS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_OUTPUT_TOKENS_SMALL,
  TEST_PROVIDER_INSTANCE_BRANDED,
} from '../../common/mocks/test-constants';
import { asClientId } from '../../common/types/branded.types';
import type { ChatRequestDto } from '../../chat/dto/chat-request.dto';
import type { CachedChatResponse } from '../types/cached-chat-response.type';

const TEST_CLIENT_ID = asClientId('test-client');
const FIXED_VECTOR = [0.1, 0.2, 0.3];
const DEFAULT_TTL_SECONDS = 3600;
const DEFAULT_K = 3;
const DEFAULT_EMBEDDING_TIMEOUT_MS = 5000;

const cachedReply: CachedChatResponse = {
  id: TEST_CACHED_RESPONSE_ID,
  provider: TEST_PROVIDER_INSTANCE_BRANDED,
  model: TEST_MODEL_ALIAS_BRANDED,
  output: { type: 'text', text: 'Semantic hit' },
  usage: {
    inputTokens: TEST_INPUT_TOKENS,
    outputTokens: TEST_OUTPUT_TOKENS_SMALL,
  },
  requestId: TEST_CACHED_REQUEST_ID,
  cached: true,
  cachedAt: '2026-01-01T00:00:00.000Z',
};

describe('SemanticCacheService', () => {
  let service: SemanticCacheService;
  let mockEmbedding: { isAvailable: jest.Mock; embed: jest.Mock };
  let mockVectorStore: { knn: jest.Mock; upsert: jest.Mock };
  let mockAppMetrics: { recordSemanticCacheLookup: jest.Mock };
  let mockLogger: Partial<LoggingService>;

  const userRequest: ChatRequestDto = {
    modelAlias: TEST_MODEL_ALIAS,
    messages: [{ role: 'user', content: 'Hello semantic' }],
  };

  const noUserRequest: ChatRequestDto = {
    modelAlias: TEST_MODEL_ALIAS,
    messages: [{ role: 'assistant', content: 'Hi' }],
  };

  async function initService(
    semanticOverrides: {
      enabled?: boolean;
      minSimilarity?: number;
      embeddingTimeoutMs?: number;
      k?: number;
      ttl?: number;
    } = {},
  ) {
    mockEmbedding = {
      isAvailable: jest.fn().mockReturnValue(true),
      embed: jest.fn().mockResolvedValue(FIXED_VECTOR),
    };
    mockVectorStore = {
      knn: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue(undefined),
    };
    mockAppMetrics = {
      recordSemanticCacheLookup: jest.fn(),
    };
    mockLogger = createMockLoggingService();

    const mockConfig = createMockConfigService({
      semanticCache: {
        enabled: semanticOverrides.enabled ?? true,
        minSimilarity: semanticOverrides.minSimilarity ?? 0.9,
        embeddingTimeoutMs: semanticOverrides.embeddingTimeoutMs,
        k: semanticOverrides.k,
        ttl: semanticOverrides.ttl,
      },
    });

    const module = await Test.createTestingModule({
      providers: [
        SemanticCacheService,
        { provide: EMBEDDING_BACKEND, useValue: mockEmbedding },
        { provide: VECTOR_STORE, useValue: mockVectorStore },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AppMetricsService, useValue: mockAppMetrics },
        { provide: LoggingService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(SemanticCacheService);
  }

  async function openCircuitViaLookup(): Promise<void> {
    mockEmbedding.embed.mockRejectedValue(new Error('embed down'));
    for (let i = 0; i < EMBEDDING_CIRCUIT_OPEN_AFTER; i += 1) {
      await service.lookup(userRequest, TEST_CLIENT_ID);
    }
  }

  beforeEach(async () => {
    await initService();
  });

  describe('lookup', () => {
    it('should return hit with vector when similarity is 0.90', async () => {
      mockVectorStore.knn.mockResolvedValue([
        { similarity: 0.9, reply: cachedReply },
      ]);

      const result = await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(result).toEqual({
        reply: cachedReply,
        vector: FIXED_VECTOR,
        embedAttempted: true,
      });
      expect(mockEmbedding.embed).toHaveBeenCalledWith('Hello semantic');
      expect(mockVectorStore.knn).toHaveBeenCalledWith({
        vector: FIXED_VECTOR,
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        clientId: TEST_CLIENT_ID,
        k: DEFAULT_K,
      });
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'hit',
      );
    });

    it('should embed the last non-empty user message without a search_query prefix', async () => {
      const request: ChatRequestDto = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [
          { role: 'user', content: 'first' },
          { role: 'assistant', content: 'reply' },
          { role: 'user', content: 'second' },
        ],
      };

      await service.lookup(request, TEST_CLIENT_ID);

      expect(mockEmbedding.embed).toHaveBeenCalledWith('second');
      expect(mockEmbedding.embed).not.toHaveBeenCalledWith(
        expect.stringMatching(/^search_query:/),
      );
    });

    it('should pass configured k to knn', async () => {
      await initService({ k: 5 });

      await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(mockVectorStore.knn).toHaveBeenCalledWith(
        expect.objectContaining({ k: 5 }),
      );
    });

    it('should return miss with vector and record below-threshold when similarity is 0.89', async () => {
      mockVectorStore.knn.mockResolvedValue([
        { similarity: 0.89, reply: cachedReply },
      ]);

      const result = await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(result).toEqual({
        reply: null,
        vector: FIXED_VECTOR,
        embedAttempted: true,
      });
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'below-threshold',
      );
    });

    it('should return vector on empty knn miss so store can reuse it', async () => {
      mockVectorStore.knn.mockResolvedValue([]);

      const result = await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(result).toEqual({
        reply: null,
        vector: FIXED_VECTOR,
        embedAttempted: true,
      });
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'below-threshold',
      );
    });

    it('should return empty without calling embed when semantic cache is disabled', async () => {
      await initService({ enabled: false });

      const result = await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(result).toEqual({
        reply: null,
        vector: null,
        embedAttempted: false,
      });
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.knn).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordSemanticCacheLookup).not.toHaveBeenCalled();
    });

    it('should return empty without calling embed when no last user message', async () => {
      const result = await service.lookup(noUserRequest, TEST_CLIENT_ID);

      expect(result).toEqual({
        reply: null,
        vector: null,
        embedAttempted: false,
      });
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordSemanticCacheLookup).not.toHaveBeenCalled();
    });

    it('should return empty without calling embed when last user content is whitespace', async () => {
      const request: ChatRequestDto = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user', content: '   ' }],
      };

      const result = await service.lookup(request, TEST_CLIENT_ID);

      expect(result).toEqual({
        reply: null,
        vector: null,
        embedAttempted: false,
      });
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
    });

    it('should fail-open on embed throw and record error without calling knn', async () => {
      mockEmbedding.embed.mockRejectedValue(new Error('embed down'));

      const result = await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(result).toEqual({
        reply: null,
        vector: null,
        embedAttempted: true,
      });
      expect(mockVectorStore.knn).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'error',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Semantic cache lookup failed (fail-open)'),
      );
    });

    it('should stringify non-Error embed failures in the warn log', async () => {
      mockEmbedding.embed.mockRejectedValue('embed-string-fail');

      await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('embed-string-fail'),
      );
    });

    it('should not call embed after consecutive embed failures open the circuit', async () => {
      await openCircuitViaLookup();
      mockEmbedding.embed.mockClear();
      mockAppMetrics.recordSemanticCacheLookup.mockClear();

      const result = await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(result).toEqual({
        reply: null,
        vector: null,
        embedAttempted: false,
      });
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.knn).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'error',
      );
    });

    it('should allow a lookup trial after circuit cooldown', async () => {
      jest.useFakeTimers();
      try {
        await openCircuitViaLookup();
        mockEmbedding.embed.mockReset();
        mockEmbedding.embed.mockResolvedValue(FIXED_VECTOR);
        mockVectorStore.knn.mockResolvedValue([]);

        jest.advanceTimersByTime(EMBEDDING_CIRCUIT_COOLDOWN_MS);
        const result = await service.lookup(userRequest, TEST_CLIENT_ID);

        expect(mockEmbedding.embed).toHaveBeenCalledTimes(1);
        expect(result.embedAttempted).toBe(true);
        expect(result.vector).toEqual(FIXED_VECTOR);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should not record embed failure when knn throws (next lookup still embeds)', async () => {
      mockVectorStore.knn.mockRejectedValue(new Error('search down'));

      const first = await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(first).toEqual({
        reply: null,
        vector: FIXED_VECTOR,
        embedAttempted: true,
      });
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'error',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Semantic cache KNN failed (fail-open)'),
      );
      expect(mockEmbedding.embed).toHaveBeenCalledTimes(1);

      mockVectorStore.knn.mockResolvedValue([]);
      await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(mockEmbedding.embed).toHaveBeenCalledTimes(2);
    });
  });

  describe('storeReply', () => {
    it('should upsert without embed when vector is provided', async () => {
      await service.storeReply(userRequest, cachedReply, TEST_CLIENT_ID, {
        vector: FIXED_VECTOR,
        embedAttempted: true,
      });

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).toHaveBeenCalledWith({
        vector: FIXED_VECTOR,
        text: 'Hello semantic',
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        clientId: TEST_CLIENT_ID,
        reply: cachedReply,
        ttlSeconds: DEFAULT_TTL_SECONDS,
      });
    });

    it('should upsert provided vector even when embedAttempted is false', async () => {
      await service.storeReply(userRequest, cachedReply, TEST_CLIENT_ID, {
        vector: FIXED_VECTOR,
        embedAttempted: false,
      });

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).toHaveBeenCalled();
    });

    it('should pass configured ttl to upsert', async () => {
      await initService({ ttl: 120 });

      await service.storeReply(userRequest, cachedReply, TEST_CLIENT_ID, {
        vector: FIXED_VECTOR,
        embedAttempted: true,
      });

      expect(mockVectorStore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ ttlSeconds: 120 }),
      );
    });

    it('should embed once and upsert when the fourth argument is omitted', async () => {
      await service.storeReply(userRequest, cachedReply, TEST_CLIENT_ID);

      expect(mockEmbedding.embed).toHaveBeenCalledTimes(1);
      expect(mockEmbedding.embed).toHaveBeenCalledWith('Hello semantic');
      expect(mockVectorStore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ vector: FIXED_VECTOR }),
      );
    });

    it('should not retry embed on store after lookup embed failure', async () => {
      mockEmbedding.embed.mockRejectedValue(new Error('embed down'));
      const lookup = await service.lookup(userRequest, TEST_CLIENT_ID);
      mockEmbedding.embed.mockClear();
      mockEmbedding.embed.mockResolvedValue(FIXED_VECTOR);

      await service.storeReply(userRequest, cachedReply, TEST_CLIENT_ID, {
        vector: lookup.vector ?? undefined,
        embedAttempted: lookup.embedAttempted,
      });

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).not.toHaveBeenCalled();
    });

    it('should not call embed when lookup already attempted embed', async () => {
      await service.storeReply(userRequest, cachedReply, TEST_CLIENT_ID, {
        embedAttempted: true,
      });

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).not.toHaveBeenCalled();
    });

    it('should embed once when embed was not attempted', async () => {
      await service.storeReply(userRequest, cachedReply, TEST_CLIENT_ID, {
        embedAttempted: false,
      });

      expect(mockEmbedding.embed).toHaveBeenCalledTimes(1);
      expect(mockVectorStore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          vector: FIXED_VECTOR,
          text: 'Hello semantic',
        }),
      );
    });

    it('should skip store when semantic cache is disabled', async () => {
      await initService({ enabled: false });

      await service.storeReply(userRequest, cachedReply, TEST_CLIENT_ID, {
        vector: FIXED_VECTOR,
        embedAttempted: true,
      });

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).not.toHaveBeenCalled();
    });

    it('should skip store when there is no last user message', async () => {
      await service.storeReply(noUserRequest, cachedReply, TEST_CLIENT_ID, {
        vector: FIXED_VECTOR,
        embedAttempted: true,
      });

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).not.toHaveBeenCalled();
    });

    it('should not embed on store after circuit opens when embed was not attempted', async () => {
      await openCircuitViaLookup();
      mockEmbedding.embed.mockClear();
      mockEmbedding.embed.mockResolvedValue(FIXED_VECTOR);

      await service.storeReply(userRequest, cachedReply, TEST_CLIENT_ID, {
        embedAttempted: false,
      });

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).not.toHaveBeenCalled();
    });

    it('should fail-open on store embed throw without upsert', async () => {
      mockEmbedding.embed.mockRejectedValue(new Error('store embed down'));

      await service.storeReply(userRequest, cachedReply, TEST_CLIENT_ID, {
        embedAttempted: false,
      });

      expect(mockVectorStore.upsert).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Semantic cache store embed failed (fail-open)'),
      );
    });

    it('should not open circuit when upsert throws', async () => {
      mockVectorStore.upsert.mockRejectedValue(new Error('upsert down'));

      await service.storeReply(userRequest, cachedReply, TEST_CLIENT_ID, {
        vector: FIXED_VECTOR,
        embedAttempted: true,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Semantic cache store failed (fail-open)'),
      );

      mockEmbedding.embed.mockClear();
      await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(mockEmbedding.embed).toHaveBeenCalled();
    });
  });

  describe('probeEmbedding', () => {
    it('should ping with the default probe budget and return true', async () => {
      await expect(service.probeEmbedding()).resolves.toBe(true);

      expect(mockEmbedding.embed).toHaveBeenCalledWith(
        'ping',
        embeddingProbeTimeoutMs(DEFAULT_EMBEDDING_TIMEOUT_MS),
      );
      expect(mockVectorStore.knn).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).not.toHaveBeenCalled();
    });

    it('should close the circuit after success following consecutive embed failures', async () => {
      await openCircuitViaLookup();

      mockEmbedding.embed.mockReset();
      mockEmbedding.embed.mockResolvedValue(FIXED_VECTOR);

      await expect(service.probeEmbedding()).resolves.toBe(true);

      mockEmbedding.embed.mockClear();
      await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(mockEmbedding.embed).toHaveBeenCalled();
    });

    it('should probe even when the circuit is open (does not use shouldSkipEmbed)', async () => {
      await openCircuitViaLookup();
      mockEmbedding.embed.mockReset();
      mockEmbedding.embed.mockResolvedValue(FIXED_VECTOR);

      await expect(service.probeEmbedding()).resolves.toBe(true);
      expect(mockEmbedding.embed).toHaveBeenCalledWith(
        'ping',
        embeddingProbeTimeoutMs(DEFAULT_EMBEDDING_TIMEOUT_MS),
      );
    });

    it('should not exceed hot-path timeout when EMBEDDING_TIMEOUT_MS is 1000', async () => {
      await initService({ embeddingTimeoutMs: 1000 });

      await expect(service.probeEmbedding()).resolves.toBe(true);
      expect(mockEmbedding.embed).toHaveBeenCalledWith('ping', 1000);
    });

    it('should not open the circuit when probe fails', async () => {
      mockEmbedding.embed.mockRejectedValue(new Error('probe down'));

      await expect(service.probeEmbedding()).resolves.toBe(false);
      await expect(service.probeEmbedding()).resolves.toBe(false);
      await expect(service.probeEmbedding()).resolves.toBe(false);
      expect(mockLogger.warn).not.toHaveBeenCalled();

      mockEmbedding.embed.mockReset();
      mockEmbedding.embed.mockResolvedValue(FIXED_VECTOR);

      await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(mockEmbedding.embed).toHaveBeenCalled();
    });
  });
});
