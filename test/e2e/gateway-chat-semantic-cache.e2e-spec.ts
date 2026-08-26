import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { CacheBackend } from '../../src/cache/interfaces/cache-backend-interface';
import type { EmbeddingBackend } from '../../src/cache/semantic/embedding-backend.interface';
import type {
  VectorSearchHit,
  VectorStore,
  VectorStoreKnnInput,
  VectorStoreUpsertInput,
} from '../../src/cache/semantic/vector-store.interface';
import { TEST_MODEL_ALIAS } from '../../src/common/mocks/test-constants';
import {
  createE2eProviderRegistry,
  type E2eProviderRegistryMock,
} from './helpers/e2e-provider-registry';
import { createE2eGatewayKeyRuntime } from './helpers/create-e2e-app';
import {
  E2E_GATEWAY_KEY,
  E2E_POST_SUCCESS_STATUS,
  E2E_ROUTES,
} from './helpers/e2e-constants';

const EMBEDDING_DIM = 1024;
const FIXED_VECTOR = Array.from(
  { length: EMBEDDING_DIM },
  (_, i) => ((i % 17) + 1) / 17,
);

function createFixedEmbeddingBackend(): EmbeddingBackend {
  return {
    isAvailable: () => true,
    embed: () => Promise.resolve([...FIXED_VECTOR]),
  };
}

/** In-memory KNN — constant fake vector ⇒ similarity 1.0; filters by TAG. */
function createInMemoryVectorStore(): VectorStore {
  const entries: VectorStoreUpsertInput[] = [];

  return {
    async upsert(input: VectorStoreUpsertInput): Promise<void> {
      const idx = entries.findIndex(
        (e) =>
          e.clientId === input.clientId &&
          e.modelAlias === input.modelAlias &&
          e.text === input.text,
      );
      if (idx >= 0) {
        entries[idx] = input;
      } else {
        entries.push(input);
      }
    },

    async knn(input: VectorStoreKnnInput): Promise<VectorSearchHit[]> {
      return entries
        .filter(
          (e) =>
            e.clientId === input.clientId && e.modelAlias === input.modelAlias,
        )
        .map((e) => ({ similarity: 1, reply: { ...e.reply, cached: true } }))
        .slice(0, input.k);
    },
  };
}

function createNoopExactCacheBackend(): CacheBackend {
  return {
    isAvailable: () => true,
    get: () => Promise.resolve(null),
    set: () => Promise.resolve(true),
    delete: () => Promise.resolve(false),
  };
}

/**
 * Loads AppModule with SEMANTIC_CACHE_ENABLED so CacheModule registers
 * SemanticCacheModule, then swaps embedding + vector ports for fakes (no Stack/Ollama).
 */
async function createE2eAppWithSemanticCache(
  providerRegistry: E2eProviderRegistryMock,
): Promise<INestApplication> {
  process.env.SEMANTIC_CACHE_ENABLED = 'true';
  jest.resetModules();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Test } = require('@nestjs/testing') as typeof import('@nestjs/testing');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ConfigService } = require('@nestjs/config') as typeof import('@nestjs/config');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AppModule } = require('../../src/app.module') as typeof import('../../src/app.module');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { setupApp } = require('../../src/setup.app') as typeof import('../../src/setup.app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CACHE_BACKEND } = require('../../src/cache/cache.tokens') as typeof import('../../src/cache/cache.tokens');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EMBEDDING_BACKEND, VECTOR_STORE } =
    require('../../src/cache/semantic/semantic-cache.tokens') as typeof import('../../src/cache/semantic/semantic-cache.tokens');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { OllamaEmbeddingAdapter } =
    require('../../src/cache/semantic/adapters/ollama-embedding.adapter') as typeof import('../../src/cache/semantic/adapters/ollama-embedding.adapter');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { RedisVectorStoreAdapter } =
    require('../../src/cache/semantic/adapters/redis-vector-store.adapter') as typeof import('../../src/cache/semantic/adapters/redis-vector-store.adapter');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ProviderRegistryService } =
    require('../../src/providers/provider-registry.service') as typeof import('../../src/providers/provider-registry.service');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { RedisConnectionService } =
    require('../../src/cache/adapters/redis-cache/redis-connection.service') as typeof import('../../src/cache/adapters/redis-cache/redis-connection.service');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ProviderInstancesBootstrap } =
    require('../../src/providers/provider-instances.bootstrap') as typeof import('../../src/providers/provider-instances.bootstrap');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LoggingService } =
    require('../../src/logging/logging.service') as typeof import('../../src/logging/logging.service');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createMockConfigService } =
    require('../../src/common/mocks/createMockConfigService') as typeof import('../../src/common/mocks/createMockConfigService');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    createE2eLoggingServiceMock,
    createE2eProviderBootstrapMock,
    createE2eRedisConnectionMock,
  } = require('./helpers/e2e-infra-mocks') as typeof import('./helpers/e2e-infra-mocks');

  const fakeEmbedding = createFixedEmbeddingBackend();
  const fakeVectorStore = createInMemoryVectorStore();

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ConfigService)
    .useValue(
      createMockConfigService({
        cache: { enabled: false, backend: 'noop' },
        semanticCache: {
          enabled: true,
          embeddingDim: EMBEDDING_DIM,
          minSimilarity: 0.9,
          ttl: 3600,
          k: 3,
        },
        gatewayKey: createE2eGatewayKeyRuntime(),
      }),
    )
    .overrideProvider(CACHE_BACKEND)
    .useValue(createNoopExactCacheBackend())
    .overrideProvider(EMBEDDING_BACKEND)
    .useValue(fakeEmbedding)
    .overrideProvider(OllamaEmbeddingAdapter)
    .useValue(fakeEmbedding)
    .overrideProvider(VECTOR_STORE)
    .useValue(fakeVectorStore)
    .overrideProvider(RedisVectorStoreAdapter)
    .useValue(fakeVectorStore)
    .overrideProvider(ProviderRegistryService)
    .useValue(providerRegistry)
    .overrideProvider(RedisConnectionService)
    .useValue(createE2eRedisConnectionMock())
    .overrideProvider(ProviderInstancesBootstrap)
    .useValue(createE2eProviderBootstrapMock())
    .overrideProvider(LoggingService)
    .useValue(createE2eLoggingServiceMock())
    .compile();

  const app = moduleFixture.createNestApplication();
  setupApp(app);
  await app.init();
  return app;
}

describe('Gateway Chat Semantic Cache (E2E)', () => {
  let app: INestApplication;
  let providerRegistry: E2eProviderRegistryMock;
  let completeMock: jest.SpyInstance;

  beforeAll(async () => {
    providerRegistry = createE2eProviderRegistry();
    completeMock = jest.spyOn(providerRegistry.provider, 'complete');
    app = await createE2eAppWithSemanticCache(providerRegistry);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    process.env.SEMANTIC_CACHE_ENABLED = 'false';
  });

  beforeEach(() => {
    completeMock.mockClear();
  });

  it('miss then semantic hit on different text (exact off, same fake embedding)', async () => {
    const first = await request(app.getHttpServer())
      .post(E2E_ROUTES.chat)
      .set('x-gateway-key', E2E_GATEWAY_KEY)
      .send({
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Semantic e2e first' }],
      })
      .expect(E2E_POST_SUCCESS_STATUS);

    expect(first.body.cached).toBeUndefined();
    expect(completeMock).toHaveBeenCalledTimes(1);

    const second = await request(app.getHttpServer())
      .post(E2E_ROUTES.chat)
      .set('x-gateway-key', E2E_GATEWAY_KEY)
      .send({
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Semantic e2e second' }],
      })
      .expect(E2E_POST_SUCCESS_STATUS);

    expect(second.body).toMatchObject({
      cached: true,
      cachedAt: expect.any(String),
      output: first.body.output,
    });
    expect(completeMock).toHaveBeenCalledTimes(1);
  });

  it('skips semantic cache when tooling.definitions are present', async () => {
    const toolingBody = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [
        { role: 'user' as const, content: 'Semantic e2e tooling query' },
      ],
      tooling: {
        definitions: [
          {
            name: 'get_weather',
            description: 'Get weather',
            parameters: { type: 'object', properties: {} },
          },
        ],
      },
    };

    const first = await request(app.getHttpServer())
      .post(E2E_ROUTES.chat)
      .set('x-gateway-key', E2E_GATEWAY_KEY)
      .send(toolingBody)
      .expect(E2E_POST_SUCCESS_STATUS);

    expect(first.body.cached).toBeUndefined();
    expect(completeMock).toHaveBeenCalledTimes(1);

    const second = await request(app.getHttpServer())
      .post(E2E_ROUTES.chat)
      .set('x-gateway-key', E2E_GATEWAY_KEY)
      .send(toolingBody)
      .expect(E2E_POST_SUCCESS_STATUS);

    expect(second.body.cached).toBeUndefined();
    expect(completeMock).toHaveBeenCalledTimes(2);
  });
});
