import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createMockConfigService } from '../../src/common/mocks/createMockConfigService';
import { createMockLoggingService } from '../../src/common/mocks/createMockLoggingService';
import {
  TEST_CACHED_RESPONSE_ID,
  TEST_INPUT_TOKENS,
  TEST_MODEL_ALIAS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_OUTPUT_TOKENS_SMALL,
  TEST_PROVIDER_INSTANCE_BRANDED,
} from '../../src/common/mocks/test-constants';
import {
  asClientId,
  asModelAlias,
  asPort,
  asSemanticCacheTtlSeconds,
} from '../../src/common/types/branded.types';
import { RedisConnectionService } from '../../src/cache/adapters/redis-cache/redis-connection.service';
import { RedisVectorStoreAdapter } from '../../src/cache/semantic/adapters/redis-vector-store.adapter';
import { SemanticCacheService } from '../../src/cache/semantic/semantic-cache.service';
import { semanticIndexName } from '../../src/cache/semantic/index-name';
import {
  EMBEDDING_BACKEND,
  VECTOR_STORE,
} from '../../src/cache/semantic/semantic-cache.tokens';
import {
  computeSystemSignature,
  hashCallParams,
} from '../../src/cache/cache-identity';
import { LoggingService } from '../../src/logging/logging.service';
import { AppMetricsService } from '../../src/observability/app-metrics/app-metrics.service';
import type { ChatCacheIdentity } from '../../src/cache/types/chat-cache-identity.type';
import type { CachedChatResponse } from '../../src/cache/types/cached-chat-response.type';
import type { EmbeddingBackend } from '../../src/cache/semantic/embedding-backend.interface';
import type { ProviderCallOptions } from '../../src/providers/interfaces/ai-provider.interface';
import type { ResolvedSystemPrompts } from '../../src/config/configuration.types';
import { flushIntegrationRedisDb } from './helpers/flush-integration-redis';
import { getRedisConnectionOptions } from './helpers/wait-for-redis';

const EMBEDDING_DIM = 1024;
const EMBEDDING_MODEL = 'qwen3-embedding:0.6b';
const EXPECTED_INDEX = semanticIndexName(EMBEDDING_MODEL, EMBEDDING_DIM);
const MIN_SIMILARITY = 0.9;

/** Same constant vector for store + lookup — no live Ollama. */
const FIXED_VECTOR = Array.from(
  { length: EMBEDDING_DIM },
  (_, i) => ((i % 17) + 1) / 17,
);

/**
 * Unit vector with known cosine similarity to `[1, 0, 0, …]`.
 * Redis COSINE distance ≈ `1 - cos`; adapter exposes `similarity = 1 - dist`.
 */
function unitVectorAtCosine(cosine: number): number[] {
  const v = new Array<number>(EMBEDDING_DIM).fill(0);
  v[0] = cosine;
  v[1] = Math.sqrt(Math.max(0, 1 - cosine * cosine));
  return v;
}

const BASIS_VECTOR = unitVectorAtCosine(1);
/** Above minSimilarity 0.9 → expect semantic hit. */
const ABOVE_THRESHOLD_VECTOR = unitVectorAtCosine(0.95);
/** Below minSimilarity 0.9 → expect miss (below-threshold). */
const BELOW_THRESHOLD_VECTOR = unitVectorAtCosine(0.85);

const CLIENT_A = asClientId('sem-client-a');
const CLIENT_B = asClientId('sem-client-b');
const CLIENT_TEAM_A = asClientId('Team-A');
const CLIENT_TEAM_A_LOWER = asClientId('team-a');

const OPTIONS_LOW_TEMP: ProviderCallOptions = { temperature: 0.2 };
const OPTIONS_HIGH_TEMP: ProviderCallOptions = { temperature: 0.9 };

/** Optional per-text override; defaults to FIXED_VECTOR (existing cases). */
const embeddingByText = new Map<string, number[]>();

function cachedReply(text: string): CachedChatResponse {
  return {
    id: TEST_CACHED_RESPONSE_ID,
    provider: TEST_PROVIDER_INSTANCE_BRANDED,
    model: TEST_MODEL_ALIAS_BRANDED,
    output: { type: 'text', text },
    usage: {
      inputTokens: TEST_INPUT_TOKENS,
      outputTokens: TEST_OUTPUT_TOKENS_SMALL,
    },
    cached: true,
    cachedAt: '2026-01-01T00:00:00.000Z',
    finishReason: 'stop',
  };
}

function createRoutableEmbeddingBackend(): EmbeddingBackend {
  return {
    isAvailable: () => true,
    embed: (text: string) => {
      const mapped = embeddingByText.get(text);
      return Promise.resolve([...(mapped ?? FIXED_VECTOR)]);
    },
  };
}

function cacheIdentity(
  content: string,
  extras: Partial<ChatCacheIdentity> = {},
): ChatCacheIdentity {
  return {
    modelAlias: TEST_MODEL_ALIAS_BRANDED,
    clientId: CLIENT_A,
    messages: [{ role: 'user', content }],
    ...extras,
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

    beforeAll(async () => {
      await flushIntegrationRedisDb();

      const { host, port, password, db } = getRedisConnectionOptions();
      const mockConfig = createMockConfigService({
        semanticCache: {
          enabled: true,
          embeddingModel: EMBEDDING_MODEL,
          embeddingDim: EMBEDDING_DIM,
          embeddingBaseUrl: 'http://127.0.0.1:9',
          minSimilarity: MIN_SIMILARITY,
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

      const fakeEmbedding = createRoutableEmbeddingBackend();

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

    beforeEach(async () => {
      embeddingByText.clear();
      await flushIntegrationRedisDb();
    });

    afterAll(async () => {
      await moduleRef?.close();
    });

    it('creates Redis Search index (project prefix + model + DIM + schema hash)', async () => {
      const store = moduleRef.get(RedisVectorStoreAdapter);
      await store.ensureIndex();

      const client = redis.getClient();
      expect(client).not.toBeNull();
      expect(EXPECTED_INDEX.startsWith('ai-provider-gateway:sem:idx:')).toBe(
        true,
      );
      expect(EXPECTED_INDEX).toMatch(
        /^ai-provider-gateway:sem:idx:qwen3-embedding-0-6b-1024-[a-f0-9]{8}$/,
      );
      const info = await client!.call('FT.INFO', EXPECTED_INDEX);
      expect(info).toBeDefined();
      const flat = Array.isArray(info) ? info.map(String) : [];
      expect(flat).toEqual(expect.arrayContaining([EXPECTED_INDEX]));
      // HASH documents use PREFIX `{index}:` (no legacy `aigw:sem:` wrapper)
      expect(flat.join(' ')).toContain(`${EXPECTED_INDEX}:`);
    });

    it('recreates index after FLUSHDB without process restart (B5)', async () => {
      const store = moduleRef.get(RedisVectorStoreAdapter);
      await store.ensureIndex();

      const client = redis.getClient();
      expect(client).not.toBeNull();
      await client!.flushdb();

      const request = cacheIdentity('semantic-integration-flushdb-recover');
      await semanticCache.storeReply(
        request,
        cachedReply('Recovered after FLUSHDB'),
        { embedAttempted: false },
      );

      const result = await semanticCache.lookup(request);

      expect(result.reply).toMatchObject({
        cached: true,
        output: { text: 'Recovered after FLUSHDB' },
      });
      await expect(
        client!.call('FT.INFO', EXPECTED_INDEX),
      ).resolves.toBeDefined();
    });

    it('SET → KNN hit at similarity threshold 0.90', async () => {
      const request = cacheIdentity('semantic-integration-ping');

      await semanticCache.storeReply(
        request,
        cachedReply('Semantic integration hit'),
        { embedAttempted: false },
      );

      const result = await semanticCache.lookup(request);

      expect(result.embedAttempted).toBe(true);
      expect(result.vector).toHaveLength(EMBEDDING_DIM);
      expect(result.reply).toMatchObject({
        cached: true,
        output: { text: 'Semantic integration hit' },
      });
    });

    it('different clientId → KNN miss (TAG partition)', async () => {
      const request = cacheIdentity('semantic-integration-client-partition');

      await semanticCache.storeReply(
        request,
        cachedReply('Semantic integration hit'),
        { embedAttempted: false },
      );

      const result = await semanticCache.lookup({
        ...request,
        clientId: CLIENT_B,
      });

      expect(result.embedAttempted).toBe(true);
      expect(result.vector).toHaveLength(EMBEDDING_DIM);
      expect(result.reply).toBeNull();
    });

    it('different callParams → KNN miss despite identical embedding vector (B1)', async () => {
      const request = cacheIdentity('semantic-integration-params-partition');

      await semanticCache.storeReply(
        { ...request, callParams: OPTIONS_LOW_TEMP },
        cachedReply('Stored at temperature 0.2'),
        { embedAttempted: false },
      );

      const result = await semanticCache.lookup({
        ...request,
        callParams: OPTIONS_HIGH_TEMP,
      });

      expect(result.embedAttempted).toBe(true);
      expect(result.vector).toHaveLength(EMBEDDING_DIM);
      expect(result.reply).toBeNull();
    });

    it('matching callParams → KNN hit with same fake embedding (B1 positive)', async () => {
      const request = cacheIdentity('semantic-integration-params-hit');

      await semanticCache.storeReply(
        { ...request, callParams: OPTIONS_LOW_TEMP },
        cachedReply('Params partition hit'),
        { embedAttempted: false },
      );

      const result = await semanticCache.lookup({
        ...request,
        callParams: OPTIONS_LOW_TEMP,
      });

      expect(result.embedAttempted).toBe(true);
      expect(result.reply).toMatchObject({
        cached: true,
        output: { text: 'Params partition hit' },
      });
    });

    it('multi-turn request skips lookup embed (B2)', async () => {
      const multiTurn: ChatCacheIdentity = {
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        clientId: CLIENT_A,
        messages: [
          { role: 'user', content: 'Explain topic A' },
          { role: 'assistant', content: 'Topic A is…' },
          { role: 'user', content: 'kontynuuj' },
        ],
      };

      await semanticCache.storeReply(
        cacheIdentity('semantic-integration-seed'),
        cachedReply('Should not be returned to multi-turn'),
        { embedAttempted: false },
      );

      const result = await semanticCache.lookup(multiTurn);

      expect(result).toEqual({
        reply: null,
        vector: null,
        embedAttempted: false,
      });
    });

    it('same-family embedding model at same DIM → separate index; KNN does not cross (B3)', async () => {
      const otherModel = 'qwen3-embedding:4b';
      const otherIndex = semanticIndexName(otherModel, EMBEDDING_DIM);
      expect(otherIndex).not.toBe(EXPECTED_INDEX);

      const { host, port, password, db } = getRedisConnectionOptions();
      const otherConfig = createMockConfigService({
        semanticCache: {
          enabled: true,
          embeddingModel: otherModel,
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

      const otherModule = await Test.createTestingModule({
        providers: [
          {
            provide: RedisConnectionService,
            useValue: redis,
          },
          RedisVectorStoreAdapter,
          {
            provide: ConfigService,
            useValue: otherConfig,
          },
          {
            provide: LoggingService,
            useValue: createMockLoggingService(),
          },
        ],
      }).compile();

      const otherStore = otherModule.get(RedisVectorStoreAdapter);
      await otherStore.ensureIndex();

      const client = redis.getClient();
      expect(client).not.toBeNull();
      await expect(client!.call('FT.INFO', otherIndex)).resolves.toBeDefined();

      const request = cacheIdentity('semantic-integration-embedding-model');
      await semanticCache.storeReply(
        request,
        cachedReply('Stored under 0.6b index'),
        { embedAttempted: false },
      );

      const prompts = otherConfig.get!(
        'resolvedSystemPrompts',
      ) as ResolvedSystemPrompts;
      const hits = await otherStore.knn({
        vector: [...FIXED_VECTOR],
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        clientId: CLIENT_A,
        systemSignature: computeSystemSignature(prompts, TEST_MODEL_ALIAS),
        callParams: hashCallParams(undefined),
        k: 3,
      });

      expect(hits).toEqual([]);

      await otherModule.close();
    });

    it('entry expires after TTL and disappears from KNN (B8)', async () => {
      const store = moduleRef.get(RedisVectorStoreAdapter);
      await store.ensureIndex();

      const prompts = moduleRef
        .get(ConfigService)
        .get('resolvedSystemPrompts') as ResolvedSystemPrompts;
      const systemSignature = computeSystemSignature(prompts, TEST_MODEL_ALIAS);
      const callParams = hashCallParams(undefined);
      const text = 'semantic-integration-ttl-expiry';

      await store.upsert({
        vector: [...FIXED_VECTOR],
        text,
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        clientId: CLIENT_A,
        systemSignature,
        callParams,
        reply: cachedReply('TTL will expire'),
        ttlSeconds: asSemanticCacheTtlSeconds(1),
      });

      const knnInput = {
        vector: [...FIXED_VECTOR],
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        clientId: CLIENT_A,
        systemSignature,
        callParams,
        k: 3,
      };

      await expect(store.knn(knnInput)).resolves.toEqual([
        expect.objectContaining({
          reply: expect.objectContaining({
            output: { type: 'text', text: 'TTL will expire' },
          }),
        }),
      ]);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      await expect(store.knn(knnInput)).resolves.toEqual([]);
    });

    it('KNN hit above minSimilarity 0.9 and miss below (L4/L6)', async () => {
      const seedText = 'semantic-integration-threshold-seed';
      const hitText = 'semantic-integration-threshold-hit';
      const missText = 'semantic-integration-threshold-miss';

      embeddingByText.set(seedText, BASIS_VECTOR);
      embeddingByText.set(hitText, ABOVE_THRESHOLD_VECTOR);
      embeddingByText.set(missText, BELOW_THRESHOLD_VECTOR);

      await semanticCache.storeReply(
        cacheIdentity(seedText),
        cachedReply('Threshold seed reply'),
        { embedAttempted: false },
      );

      const hit = await semanticCache.lookup(cacheIdentity(hitText));
      expect(hit.embedAttempted).toBe(true);
      expect(hit.reply).toMatchObject({
        cached: true,
        output: { text: 'Threshold seed reply' },
      });

      const miss = await semanticCache.lookup(cacheIdentity(missText));
      expect(miss.embedAttempted).toBe(true);
      expect(miss.vector).toHaveLength(EMBEDDING_DIM);
      expect(miss.reply).toBeNull();
    });

    it('different modelAlias → KNN miss (TAG partition)', async () => {
      const text = 'semantic-integration-model-partition';
      await semanticCache.storeReply(
        cacheIdentity(text),
        cachedReply('Stored under test-model'),
        { embedAttempted: false },
      );

      const otherAliasRequest = cacheIdentity(text, {
        modelAlias: asModelAlias('other-model'),
      });
      const result = await semanticCache.lookup(otherAliasRequest);

      expect(result.embedAttempted).toBe(true);
      expect(result.reply).toBeNull();
    });

    it('Team-A vs team-a are distinct CASESENSITIVE client partitions (S16)', async () => {
      const text = 'semantic-integration-case-sensitive-client';
      await semanticCache.storeReply(
        cacheIdentity(text, { clientId: CLIENT_TEAM_A }),
        cachedReply('Stored for Team-A'),
        { embedAttempted: false },
      );

      const lower = await semanticCache.lookup(
        cacheIdentity(text, { clientId: CLIENT_TEAM_A_LOWER }),
      );
      expect(lower.embedAttempted).toBe(true);
      expect(lower.reply).toBeNull();

      const sameCase = await semanticCache.lookup(
        cacheIdentity(text, { clientId: CLIENT_TEAM_A }),
      );
      expect(sameCase.reply).toMatchObject({
        output: { text: 'Stored for Team-A' },
      });
    });

    it('different systemSignature → KNN miss despite identical vector (B1)', async () => {
      const store = moduleRef.get(RedisVectorStoreAdapter);
      await store.ensureIndex();

      const callParams = hashCallParams(undefined);
      const text = 'semantic-integration-system-sig';

      await store.upsert({
        vector: [...FIXED_VECTOR],
        text,
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        clientId: CLIENT_A,
        systemSignature: 'sys-sig-a',
        callParams,
        reply: cachedReply('Stored under sys-sig-a'),
        ttlSeconds: asSemanticCacheTtlSeconds(3600),
      });

      const hits = await store.knn({
        vector: [...FIXED_VECTOR],
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        clientId: CLIENT_A,
        systemSignature: 'sys-sig-b',
        callParams,
        k: 3,
      });

      expect(hits).toEqual([]);
    });

    it('damaged reply JSON is skipped by KNN parse (Zod fail-closed)', async () => {
      const store = moduleRef.get(RedisVectorStoreAdapter);
      await store.ensureIndex();

      const prompts = moduleRef
        .get(ConfigService)
        .get('resolvedSystemPrompts') as ResolvedSystemPrompts;
      const systemSignature = computeSystemSignature(prompts, TEST_MODEL_ALIAS);
      const callParams = hashCallParams(undefined);
      const text = 'semantic-integration-damaged-json';

      await store.upsert({
        vector: [...FIXED_VECTOR],
        text,
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        clientId: CLIENT_A,
        systemSignature,
        callParams,
        reply: cachedReply('Will be corrupted'),
        ttlSeconds: asSemanticCacheTtlSeconds(3600),
      });

      const client = redis.getClient();
      expect(client).not.toBeNull();
      const keys = await client!.keys(`${EXPECTED_INDEX}:*`);
      expect(keys.length).toBeGreaterThanOrEqual(1);
      expect(keys[0].startsWith('aigw:sem:')).toBe(false);
      await client!.hset(keys[0], 'reply', '{not-valid-json');

      const hits = await store.knn({
        vector: [...FIXED_VECTOR],
        modelAlias: TEST_MODEL_ALIAS_BRANDED,
        clientId: CLIENT_A,
        systemSignature,
        callParams,
        k: 3,
      });

      expect(hits).toEqual([]);
    });
  },
);
