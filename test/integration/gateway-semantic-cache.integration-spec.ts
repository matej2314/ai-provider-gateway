import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createMockConfigService } from '../../src/common/mocks/createMockConfigService';
import { createMockLoggingService } from '../../src/common/mocks/createMockLoggingService';
import {
  TEST_CACHED_REQUEST_ID,
  TEST_CACHED_RESPONSE_ID,
  TEST_INPUT_TOKENS,
  TEST_MODEL_ALIAS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_OUTPUT_TOKENS_SMALL,
  TEST_PROVIDER_INSTANCE_BRANDED,
} from '../../src/common/mocks/test-constants';
import { asClientId, asPort } from '../../src/common/types';
import { RedisConnectionService } from '../../src/cache/adapters/redis-cache/redis-connection.service';
import { RedisVectorStoreAdapter } from '../../src/cache/semantic/adapters/redis-vector-store.adapter';
import { SemanticCacheService } from '../../src/cache/semantic/semantic-cache.service';
import { semanticIndexName } from '../../src/cache/semantic/index-name';
import {
  EMBEDDING_BACKEND,
  VECTOR_STORE,
} from '../../src/cache/semantic/semantic-cache.tokens';
import { LoggingService } from '../../src/logging/logging.service';
import { AppMetricsService } from '../../src/observability/app-metrics/app-metrics.service';
import type { ChatRequestDto } from '../../src/chat/dto/chat-request.dto';
import type { CachedChatResponse } from '../../src/cache/types/cached-chat-response.type';
import type { EmbeddingBackend } from '../../src/cache/semantic/embedding-backend.interface';
import { flushIntegrationRedisDb } from './helpers/flush-integration-redis';
import { getRedisConnectionOptions } from './helpers/wait-for-redis';

const EMBEDDING_DIM = 1024;
const EMBEDDING_MODEL = 'qwen3-embedding:0.6b';
const EXPECTED_INDEX = semanticIndexName(EMBEDDING_MODEL, EMBEDDING_DIM);

/** Same constant vector for store + lookup — no live Ollama. */
const FIXED_VECTOR = Array.from(
  { length: EMBEDDING_DIM },
  (_, i) => ((i % 17) + 1) / 17,
);

const CLIENT_A = asClientId('sem-client-a');
const CLIENT_B = asClientId('sem-client-b');

const cachedReply: CachedChatResponse = {
  id: TEST_CACHED_RESPONSE_ID,
  provider: TEST_PROVIDER_INSTANCE_BRANDED,
  model: TEST_MODEL_ALIAS_BRANDED,
  output: { type: 'text', text: 'Semantic integration hit' },
  usage: {
    inputTokens: TEST_INPUT_TOKENS,
    outputTokens: TEST_OUTPUT_TOKENS_SMALL,
  },
  requestId: TEST_CACHED_REQUEST_ID,
  cached: true,
  cachedAt: '2026-01-01T00:00:00.000Z',
};

function createFixedEmbeddingBackend(): EmbeddingBackend {
  return {
    isAvailable: () => true,
    embed: (text: string) => {
      void text;
      return Promise.resolve([...FIXED_VECTOR]);
    },
  };
}

/**
 * Live Redis Search (Stack on :6381). Skipped when the alpine KV suite runs
 * (`npm run test:integration` → REDIS_PORT=6380).
 */
const shouldRunSemanticVector =
  process.env.SEMANTIC_CACHE_ENABLED === 'true' &&
  Number(process.env.REDIS_PORT ?? 0) === 6381;

(shouldRunSemanticVector ? describe : describe.skip)(
  'Gateway semantic cache (Redis Search integration)',
  () => {
    let moduleRef: TestingModule;
    let semanticCache: SemanticCacheService;
    let redis: RedisConnectionService;

    const userRequest: ChatRequestDto = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'user', content: 'semantic-integration-ping' }],
    };

    beforeAll(async () => {
      await flushIntegrationRedisDb();

      const { host, port, password, db } = getRedisConnectionOptions();
      const mockConfig = createMockConfigService({
        semanticCache: {
          enabled: true,
          embeddingModel: EMBEDDING_MODEL,
          embeddingDim: EMBEDDING_DIM,
          embeddingBaseUrl: 'http://127.0.0.1:9',
          minSimilarity: 0.9,
          ttl: 3600,
          k: 3,
        },
        redis: {
          host,
          port: asPort(port),
          password: password ?? '',
          db,
          keyPrefix: 'it-sem:',
        },
        cache: { enabled: false, backend: 'noop' },
      });

      const fakeEmbedding = createFixedEmbeddingBackend();

      moduleRef = await Test.createTestingModule({
        providers: [
          RedisConnectionService,
          RedisVectorStoreAdapter,
          SemanticCacheService,
          { provide: ConfigService, useValue: mockConfig },
          { provide: LoggingService, useValue: createMockLoggingService() },
          {
            provide: AppMetricsService,
            useValue: { recordSemanticCacheLookup: jest.fn() },
          },
          { provide: EMBEDDING_BACKEND, useValue: fakeEmbedding },
          {
            provide: VECTOR_STORE,
            useExisting: RedisVectorStoreAdapter,
          },
        ],
      }).compile();

      await moduleRef.init();

      semanticCache = moduleRef.get(SemanticCacheService);
      redis = moduleRef.get(RedisConnectionService);

      expect(redis.isReady()).toBe(true);
    });

    afterAll(async () => {
      await moduleRef?.close();
    });

    it('creates Redis Search index (FT.INFO qwen3-1024)', async () => {
      const client = redis.getClient();
      expect(client).not.toBeNull();
      const info = await client!.call('FT.INFO', EXPECTED_INDEX);
      expect(info).toBeDefined();
      const flat = Array.isArray(info) ? info.map(String) : [];
      expect(flat).toEqual(expect.arrayContaining([EXPECTED_INDEX]));
    });

    it('SET → KNN hit at similarity threshold 0.90', async () => {
      await semanticCache.storeReply(userRequest, cachedReply, CLIENT_A, {
        embedAttempted: false,
      });

      const result = await semanticCache.lookup(userRequest, CLIENT_A);

      expect(result.embedAttempted).toBe(true);
      expect(result.vector).toHaveLength(EMBEDDING_DIM);
      expect(result.reply).toMatchObject({
        cached: true,
        output: { text: 'Semantic integration hit' },
      });
    });

    it('different clientId → KNN miss (TAG partition)', async () => {
      await semanticCache.storeReply(userRequest, cachedReply, CLIENT_A, {
        embedAttempted: false,
      });

      const result = await semanticCache.lookup(userRequest, CLIENT_B);

      expect(result.embedAttempted).toBe(true);
      expect(result.vector).toHaveLength(EMBEDDING_DIM);
      expect(result.reply).toBeNull();
    });
  },
);
