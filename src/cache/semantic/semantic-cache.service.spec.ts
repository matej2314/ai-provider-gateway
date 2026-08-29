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
  TEST_CACHED_RESPONSE_ID,
  TEST_INPUT_TOKENS,
  TEST_MODEL_ALIAS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_OUTPUT_TOKENS_SMALL,
  TEST_PROVIDER_INSTANCE_BRANDED,
} from '../../common/mocks/test-constants';
import { asClientId, asResponseId } from '../../common/types/branded.types';
import { computeSystemSignature, hashCallParams } from '../cache-identity';
import type { ChatCacheIdentity } from '../types/chat-cache-identity.type';
import type { CachedChatResponse } from '../types/cached-chat-response.type';
import type { ProviderCallOptions } from '../../providers/interfaces/ai-provider.interface';
import type { TestResolvedSystemPromptsOptions } from '../../common/mocks/createMockConfigService';

const TEST_CLIENT_ID = asClientId('test-client');
const FIXED_VECTOR = [0.1, 0.2, 0.3];
const DEFAULT_TTL_SECONDS = 3600;
const DEFAULT_K = 3;
const DEFAULT_EMBEDDING_TIMEOUT_MS = 5000;

function cacheIdentity(
  messages: ChatCacheIdentity['messages'],
  extras: Partial<ChatCacheIdentity> = {},
): ChatCacheIdentity {
  return {
    modelAlias: TEST_MODEL_ALIAS_BRANDED,
    clientId: TEST_CLIENT_ID,
    messages,
    ...extras,
  };
}

const cachedReply: CachedChatResponse = {
  id: TEST_CACHED_RESPONSE_ID,
  provider: TEST_PROVIDER_INSTANCE_BRANDED,
  model: TEST_MODEL_ALIAS_BRANDED,
  output: { type: 'text', text: 'Semantic hit' },
  usage: {
    inputTokens: TEST_INPUT_TOKENS,
    outputTokens: TEST_OUTPUT_TOKENS_SMALL,
  },
  cached: true,
  cachedAt: '2026-01-01T00:00:00.000Z',
  finishReason: 'stop',
};

describe('SemanticCacheService', () => {
  let service: SemanticCacheService;
  let mockEmbedding: { isAvailable: jest.Mock; embed: jest.Mock };
  let mockVectorStore: {
    knn: jest.Mock;
    upsert: jest.Mock;
    ensureIndex: jest.Mock;
    probeIndex: jest.Mock;
    getByTextIdentity: jest.Mock;
  };
  let mockAppMetrics: { recordSemanticCacheLookup: jest.Mock };
  let mockLogger: Partial<LoggingService>;

  const userIdentity = cacheIdentity([
    { role: 'user', content: 'Hello semantic' },
  ]);

  const noUserIdentity = cacheIdentity([{ role: 'assistant', content: 'Hi' }]);

  async function initService(
    overrides: {
      enabled?: boolean;
      minSimilarity?: number;
      embeddingTimeoutMs?: number;
      k?: number;
      ttl?: number;
      resolvedSystemPrompts?: TestResolvedSystemPromptsOptions;
    } = {},
  ) {
    mockEmbedding = {
      isAvailable: jest.fn().mockReturnValue(true),
      embed: jest.fn().mockResolvedValue(FIXED_VECTOR),
    };
    mockVectorStore = {
      knn: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue(undefined),
      ensureIndex: jest.fn().mockResolvedValue(undefined),
      probeIndex: jest.fn().mockResolvedValue({
        available: true,
        message: 'Redis Search index available',
      }),
      getByTextIdentity: jest.fn().mockResolvedValue(null),
    };
    mockAppMetrics = {
      recordSemanticCacheLookup: jest.fn(),
    };
    mockLogger = createMockLoggingService();

    const mockConfig = createMockConfigService({
      semanticCache: {
        enabled: overrides.enabled ?? true,
        minSimilarity: overrides.minSimilarity ?? 0.9,
        embeddingTimeoutMs: overrides.embeddingTimeoutMs,
        k: overrides.k,
        ttl: overrides.ttl,
      },
      ...(overrides.resolvedSystemPrompts !== undefined && {
        resolvedSystemPrompts: overrides.resolvedSystemPrompts,
      }),
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
      await service.lookup(userIdentity);
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

      const result = await service.lookup(userIdentity);

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
        systemSignature: expect.any(String),
        callParams: expect.any(String),
        k: DEFAULT_K,
      });
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'hit',
      );
    });

    it('should return hash-hit without embed when getByTextIdentity finds a reply', async () => {
      mockVectorStore.getByTextIdentity.mockResolvedValue(cachedReply);

      const result = await service.lookup(userIdentity);

      expect(result).toEqual({
        reply: cachedReply,
        vector: null,
        embedAttempted: false,
      });
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.knn).not.toHaveBeenCalled();
      expect(mockVectorStore.getByTextIdentity).toHaveBeenCalledWith({
        text: 'Hello semantic',
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        clientId: TEST_CLIENT_ID,
        systemSignature: expect.any(String),
        callParams: expect.any(String),
      });
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'hash-hit',
      );
    });

    it('should HASH lookup trimmed last-user text (P16: trailing space)', async () => {
      mockVectorStore.getByTextIdentity.mockResolvedValue(cachedReply);
      const padded = cacheIdentity([{ role: 'user', content: 'hello ' }]);

      const result = await service.lookup(padded);

      expect(result.reply).toEqual(cachedReply);
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.getByTextIdentity).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'hello' }),
      );
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'hash-hit',
      );
    });

    it('should skip embed for multi-turn request and record skip (B2)', async () => {
      const request = cacheIdentity([
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'reply' },
        { role: 'user', content: 'second' },
      ]);

      const result = await service.lookup(request);

      expect(result).toEqual({
        reply: null,
        vector: null,
        embedAttempted: false,
      });
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.knn).not.toHaveBeenCalled();
      expect(mockVectorStore.getByTextIdentity).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'skip',
      );
    });

    it('should pass configured k to knn', async () => {
      await initService({ k: 5 });

      await service.lookup(userIdentity);

      expect(mockVectorStore.knn).toHaveBeenCalledWith(
        expect.objectContaining({ k: 5 }),
      );
    });

    it('should return miss with vector and record below-threshold when similarity is 0.89', async () => {
      mockVectorStore.knn.mockResolvedValue([
        { similarity: 0.89, reply: cachedReply },
      ]);

      const result = await service.lookup(userIdentity);

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

    it('should use the first hit at or above minSimilarity among k candidates (S5)', async () => {
      const weaker = { ...cachedReply, id: asResponseId('weaker') };
      const stronger = cachedReply;
      mockVectorStore.knn.mockResolvedValue([
        { similarity: 0.85, reply: weaker },
        { similarity: 0.92, reply: stronger },
      ]);

      const result = await service.lookup(userIdentity);

      expect(result.reply).toEqual(stronger);
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'hit',
      );
    });

    it('should return vector on empty knn miss so store can reuse it', async () => {
      mockVectorStore.knn.mockResolvedValue([]);

      const result = await service.lookup(userIdentity);

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

      const result = await service.lookup(userIdentity);

      expect(result).toEqual({
        reply: null,
        vector: null,
        embedAttempted: false,
      });
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.knn).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'skip',
      );
    });

    it('should return empty without calling embed when no last user message', async () => {
      const result = await service.lookup(noUserIdentity);

      expect(result).toEqual({
        reply: null,
        vector: null,
        embedAttempted: false,
      });
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'skip',
      );
    });

    it('should return empty without calling embed when last user content is whitespace', async () => {
      const request = cacheIdentity([{ role: 'user', content: '   ' }]);

      const result = await service.lookup(request);

      expect(result).toEqual({
        reply: null,
        vector: null,
        embedAttempted: false,
      });
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'skip',
      );
    });

    it('should fail-open on embed throw and record error without calling knn', async () => {
      mockEmbedding.embed.mockRejectedValue(new Error('embed down'));

      const result = await service.lookup(userIdentity);

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

      await service.lookup(userIdentity);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('embed-string-fail'),
      );
    });

    it('should not call embed after consecutive embed failures open the circuit', async () => {
      await openCircuitViaLookup();
      mockEmbedding.embed.mockClear();
      mockAppMetrics.recordSemanticCacheLookup.mockClear();

      const result = await service.lookup(userIdentity);

      expect(result).toEqual({
        reply: null,
        vector: null,
        embedAttempted: false,
      });
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.knn).not.toHaveBeenCalled();
      expect(mockVectorStore.getByTextIdentity).toHaveBeenCalled();
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'skip',
      );
    });

    it('should still HASH-hit when the embedding circuit is open', async () => {
      await openCircuitViaLookup();
      mockEmbedding.embed.mockClear();
      mockAppMetrics.recordSemanticCacheLookup.mockClear();
      mockVectorStore.getByTextIdentity.mockResolvedValue(cachedReply);

      const result = await service.lookup(userIdentity);

      expect(result).toEqual({
        reply: cachedReply,
        vector: null,
        embedAttempted: false,
      });
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.knn).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'hash-hit',
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
        const result = await service.lookup(userIdentity);

        expect(mockEmbedding.embed).toHaveBeenCalledTimes(1);
        expect(result.embedAttempted).toBe(true);
        expect(result.vector).toEqual(FIXED_VECTOR);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should not record embed failure when knn throws (next lookup still embeds)', async () => {
      mockVectorStore.knn.mockRejectedValue(new Error('search down'));

      const first = await service.lookup(userIdentity);

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
      await service.lookup(userIdentity);

      expect(mockEmbedding.embed).toHaveBeenCalledTimes(2);
    });
  });

  describe('storeReply', () => {
    it('should upsert without embed when vector is provided', async () => {
      await service.storeReply(userIdentity, cachedReply, {
        vector: FIXED_VECTOR,
        embedAttempted: true,
      });

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).toHaveBeenCalledWith({
        vector: FIXED_VECTOR,
        text: 'Hello semantic',
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        clientId: TEST_CLIENT_ID,
        systemSignature: expect.any(String),
        callParams: expect.any(String),
        reply: cachedReply,
        ttlSeconds: DEFAULT_TTL_SECONDS,
      });
    });

    it('should upsert provided vector even when embedAttempted is false', async () => {
      await service.storeReply(userIdentity, cachedReply, {
        vector: FIXED_VECTOR,
        embedAttempted: false,
      });

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).toHaveBeenCalled();
    });

    it('should pass configured ttl to upsert', async () => {
      await initService({ ttl: 120 });

      await service.storeReply(userIdentity, cachedReply, {
        vector: FIXED_VECTOR,
        embedAttempted: true,
      });

      expect(mockVectorStore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ ttlSeconds: 120 }),
      );
    });

    it('should embed once and upsert when embedState is omitted', async () => {
      await service.storeReply(userIdentity, cachedReply);

      expect(mockEmbedding.embed).toHaveBeenCalledTimes(1);
      expect(mockEmbedding.embed).toHaveBeenCalledWith('Hello semantic');
      expect(mockVectorStore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ vector: FIXED_VECTOR }),
      );
    });

    it('should not retry embed on store after lookup embed failure', async () => {
      mockEmbedding.embed.mockRejectedValue(new Error('embed down'));
      const lookup = await service.lookup(userIdentity);
      mockEmbedding.embed.mockClear();
      mockEmbedding.embed.mockResolvedValue(FIXED_VECTOR);

      await service.storeReply(userIdentity, cachedReply, {
        vector: lookup.vector ?? undefined,
        embedAttempted: lookup.embedAttempted,
      });

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).not.toHaveBeenCalled();
    });

    it('should not call embed when lookup already attempted embed', async () => {
      await service.storeReply(userIdentity, cachedReply, {
        embedAttempted: true,
      });

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).not.toHaveBeenCalled();
    });

    it('should embed once when embed was not attempted', async () => {
      await service.storeReply(userIdentity, cachedReply, {
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

      await service.storeReply(userIdentity, cachedReply, {
        vector: FIXED_VECTOR,
        embedAttempted: true,
      });

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).not.toHaveBeenCalled();
    });

    it('should skip store when there is no last user message', async () => {
      await service.storeReply(noUserIdentity, cachedReply, {
        vector: FIXED_VECTOR,
        embedAttempted: true,
      });

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).not.toHaveBeenCalled();
    });

    it('should skip store for multi-turn request (B2)', async () => {
      const multiTurn = cacheIdentity([
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'ok' },
        { role: 'user', content: 'second' },
      ]);

      await service.storeReply(multiTurn, cachedReply, {
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

      await service.storeReply(userIdentity, cachedReply, {
        embedAttempted: false,
      });

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).not.toHaveBeenCalled();
    });

    it('should fail-open on store embed throw without upsert', async () => {
      mockEmbedding.embed.mockRejectedValue(new Error('store embed down'));

      await service.storeReply(userIdentity, cachedReply, {
        embedAttempted: false,
      });

      expect(mockVectorStore.upsert).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Semantic cache store embed failed (fail-open)',
        ),
      );
    });

    it('should not open circuit when upsert throws', async () => {
      mockVectorStore.upsert.mockRejectedValue(new Error('upsert down'));

      await service.storeReply(userIdentity, cachedReply, {
        vector: FIXED_VECTOR,
        embedAttempted: true,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Semantic cache store failed (fail-open)'),
      );

      mockEmbedding.embed.mockClear();
      await service.lookup(userIdentity);

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

    it('should not close the circuit after successful probes (S10)', async () => {
      await openCircuitViaLookup();

      mockEmbedding.embed.mockReset();
      mockEmbedding.embed.mockResolvedValue(FIXED_VECTOR);

      await expect(service.probeEmbedding()).resolves.toBe(true);
      await expect(service.probeEmbedding()).resolves.toBe(true);
      await expect(service.probeEmbedding()).resolves.toBe(true);

      mockEmbedding.embed.mockClear();
      const result = await service.lookup(userIdentity);

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(result.embedAttempted).toBe(false);
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

      mockEmbedding.embed.mockClear();
      await service.lookup(userIdentity);
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
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

      await service.lookup(userIdentity);

      expect(mockEmbedding.embed).toHaveBeenCalled();
    });
  });

  describe('partition by callParams (B1)', () => {
    const optionsA: ProviderCallOptions = { temperature: 0.2 };
    const optionsB: ProviderCallOptions = { temperature: 0.9 };

    it('should pass different callParams signatures for different ProviderCallOptions', async () => {
      await service.lookup({ ...userIdentity, callParams: optionsA });
      const callA = mockVectorStore.knn.mock.calls[0][0].callParams;

      mockVectorStore.knn.mockClear();
      await service.lookup({ ...userIdentity, callParams: optionsB });
      const callB = mockVectorStore.knn.mock.calls[0][0].callParams;

      expect(callA).not.toBe(callB);
      expect(callA).toBe(hashCallParams(optionsA));
      expect(callB).toBe(hashCallParams(optionsB));
    });

    it('should pass identical callParams when options match', async () => {
      await service.lookup({ ...userIdentity, callParams: optionsA });
      const callA = mockVectorStore.knn.mock.calls[0][0].callParams;

      mockVectorStore.knn.mockClear();
      await service.lookup({
        ...userIdentity,
        callParams: { temperature: 0.2 },
      });
      const callA2 = mockVectorStore.knn.mock.calls[0][0].callParams;

      expect(callA).toBe(callA2);
    });

    it('should miss when identical last-user text but different temperature partition', async () => {
      const optionsStore: ProviderCallOptions = { temperature: 0.2 };
      const optionsLookup: ProviderCallOptions = { temperature: 0.9 };
      const storedCallParams = hashCallParams(optionsStore);

      mockVectorStore.knn.mockImplementation((input) => {
        if (input.callParams === storedCallParams) {
          return Promise.resolve([{ similarity: 0.95, reply: cachedReply }]);
        }
        return Promise.resolve([]);
      });

      await service.storeReply(
        { ...userIdentity, callParams: optionsStore },
        cachedReply,
        { vector: FIXED_VECTOR, embedAttempted: true },
      );

      const result = await service.lookup({
        ...userIdentity,
        callParams: optionsLookup,
      });

      expect(result.reply).toBeNull();
      expect(result.embedAttempted).toBe(true);
      expect(mockVectorStore.knn).toHaveBeenLastCalledWith(
        expect.objectContaining({
          callParams: hashCallParams(optionsLookup),
        }),
      );
    });

    it('should miss when identical last-user text but different responseFormat partition', async () => {
      const optionsStore: ProviderCallOptions = {
        responseFormat: { type: 'text' },
      };
      const optionsLookup: ProviderCallOptions = {
        responseFormat: { type: 'json_object' },
      };
      const storedCallParams = hashCallParams(optionsStore);

      mockVectorStore.knn.mockImplementation((input) => {
        if (input.callParams === storedCallParams) {
          return Promise.resolve([{ similarity: 0.95, reply: cachedReply }]);
        }
        return Promise.resolve([]);
      });

      await service.storeReply(
        { ...userIdentity, callParams: optionsStore },
        cachedReply,
        { vector: FIXED_VECTOR, embedAttempted: true },
      );

      const result = await service.lookup({
        ...userIdentity,
        callParams: optionsLookup,
      });

      expect(result.reply).toBeNull();
      expect(result.embedAttempted).toBe(true);
    });

    it('should miss when identical last-user text but different systemSignature partition', async () => {
      const promptsStore = {
        master: 'master prompt A',
        main: 'main prompt',
        perModelByAlias: {},
      };
      const promptsLookup = {
        master: 'master prompt B',
        main: 'main prompt',
        perModelByAlias: {},
      };
      const storedSystemSig = computeSystemSignature(
        promptsStore,
        TEST_MODEL_ALIAS,
      );

      await initService({ resolvedSystemPrompts: promptsStore });

      mockVectorStore.knn.mockImplementation((input) => {
        if (input.systemSignature === storedSystemSig) {
          return Promise.resolve([{ similarity: 0.95, reply: cachedReply }]);
        }
        return Promise.resolve([]);
      });

      await service.storeReply(userIdentity, cachedReply, {
        vector: FIXED_VECTOR,
        embedAttempted: true,
      });

      await initService({ resolvedSystemPrompts: promptsLookup });

      mockVectorStore.knn.mockImplementation((input) => {
        if (input.systemSignature === storedSystemSig) {
          return Promise.resolve([{ similarity: 0.95, reply: cachedReply }]);
        }
        return Promise.resolve([]);
      });

      const result = await service.lookup(userIdentity);

      expect(result.reply).toBeNull();
      expect(result.embedAttempted).toBe(true);
      expect(mockVectorStore.knn).toHaveBeenLastCalledWith(
        expect.objectContaining({
          systemSignature: computeSystemSignature(
            promptsLookup,
            TEST_MODEL_ALIAS,
          ),
        }),
      );
    });

    it('should hit when params, prompt and last-user match (positive B1)', async () => {
      const options: ProviderCallOptions = { temperature: 0.2 };

      mockVectorStore.knn.mockResolvedValue([
        { similarity: 0.95, reply: cachedReply },
      ]);

      await service.storeReply(
        { ...userIdentity, callParams: options },
        cachedReply,
        { vector: FIXED_VECTOR, embedAttempted: true },
      );

      mockVectorStore.knn.mockClear();
      mockVectorStore.knn.mockResolvedValue([
        { similarity: 0.95, reply: cachedReply },
      ]);

      const result = await service.lookup({
        ...userIdentity,
        callParams: options,
      });

      expect(result.reply).toEqual(cachedReply);
      expect(result.embedAttempted).toBe(true);
    });
  });

  describe('multi-turn skip (B2)', () => {
    it('should not embed when messages contain assistant turn', async () => {
      const multiTurn = cacheIdentity([
        { role: 'user', content: 'explain X' },
        { role: 'assistant', content: 'X means…' },
        { role: 'user', content: 'continue' },
      ]);

      const result = await service.lookup(multiTurn);

      expect(result.embedAttempted).toBe(false);
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'skip',
      );
    });

    it('should not embed when messages contain tool turn', async () => {
      const toolTurn = cacheIdentity([
        { role: 'user', content: 'use the tool' },
        { role: 'tool', content: '{"ok":true}', toolCallId: 'tc_1' },
        { role: 'user', content: 'now summarise' },
      ]);

      const result = await service.lookup(toolTurn);

      expect(result.embedAttempted).toBe(false);
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'skip',
      );
    });

    it('should embed for a single user message (positive case)', async () => {
      const result = await service.lookup(userIdentity);

      expect(result.embedAttempted).toBe(true);
      expect(mockEmbedding.embed).toHaveBeenCalledWith('Hello semantic');
    });

    it.each(['kontynuuj', 'podsumuj to', 'przetłumacz'])(
      'should not embed for multi-turn anaphora phrase "%s" (B2)',
      async (phrase) => {
        const multiTurn = cacheIdentity([
          { role: 'user', content: 'first topic' },
          { role: 'assistant', content: 'long answer' },
          { role: 'user', content: phrase },
        ]);

        const result = await service.lookup(multiTurn);

        expect(result.embedAttempted).toBe(false);
        expect(result.reply).toBeNull();
        expect(mockEmbedding.embed).not.toHaveBeenCalled();
        expect(mockVectorStore.knn).not.toHaveBeenCalled();
        expect(mockVectorStore.getByTextIdentity).not.toHaveBeenCalled();
        expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
          TEST_MODEL_ALIAS_BRANDED,
          'skip',
        );
      },
    );
  });
});
