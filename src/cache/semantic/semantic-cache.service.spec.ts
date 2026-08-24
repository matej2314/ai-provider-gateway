import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SemanticCacheService } from './semantic-cache.service';
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

  async function initService(
    semanticOverrides: { enabled?: boolean; minSimilarity?: number } = {},
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

  beforeEach(async () => {
    await initService();
  });

  describe('lookup', () => {
    it('should return null and record below-threshold when similarity is 0.89', async () => {
      mockVectorStore.knn.mockResolvedValue([
        { similarity: 0.89, reply: cachedReply },
      ]);

      const result = await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(result).toBeNull();
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'below-threshold',
      );
    });

    it('should return hit when similarity is 0.90', async () => {
      mockVectorStore.knn.mockResolvedValue([
        { similarity: 0.9, reply: cachedReply },
      ]);

      const result = await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(result).toEqual(cachedReply);
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'hit',
      );
    });

    it('should return null without calling embed when no last user message', async () => {
      const request: ChatRequestDto = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'assistant', content: 'Hi' }],
      };

      const result = await service.lookup(request, TEST_CLIENT_ID);

      expect(result).toBeNull();
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordSemanticCacheLookup).not.toHaveBeenCalled();
    });

    it('should fail-open on embed throw and record error', async () => {
      mockEmbedding.embed.mockRejectedValue(new Error('embed down'));

      const result = await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(result).toBeNull();
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'error',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('fail-open'),
      );
    });

    it('should not call embed after three embed failures open the circuit', async () => {
      mockEmbedding.embed.mockRejectedValue(new Error('embed down'));

      await service.lookup(userRequest, TEST_CLIENT_ID);
      await service.lookup(userRequest, TEST_CLIENT_ID);
      await service.lookup(userRequest, TEST_CLIENT_ID);
      expect(mockEmbedding.embed).toHaveBeenCalledTimes(3);

      mockEmbedding.embed.mockClear();
      mockAppMetrics.recordSemanticCacheLookup.mockClear();

      const result = await service.lookup(userRequest, TEST_CLIENT_ID);

      expect(result).toBeNull();
      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockAppMetrics.recordSemanticCacheLookup).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS_BRANDED,
        'error',
      );
    });
  });

  describe('storeReply', () => {
    it('should not call embed when reusedVector is provided', async () => {
      await service.storeReply(
        userRequest,
        cachedReply,
        TEST_CLIENT_ID,
        FIXED_VECTOR,
      );

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
      expect(mockVectorStore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          vector: FIXED_VECTOR,
          text: 'Hello semantic',
          clientId: TEST_CLIENT_ID,
          reply: cachedReply,
        }),
      );
    });
  });
});
