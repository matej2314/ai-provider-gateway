import type { INestApplication } from '@nestjs/common';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { setupApp } from '../../src/setup.app';
import { CACHE_BACKEND } from '../../src/cache/cache.tokens';
import type { CacheBackend } from '../../src/cache/interfaces/cache-backend-interface';
import { OllamaEmbeddingAdapter } from '../../src/cache/semantic/adapters/ollama-embedding.adapter';
import { RedisVectorStoreAdapter } from '../../src/cache/semantic/adapters/redis-vector-store.adapter';
import type { EmbeddingBackend } from '../../src/cache/semantic/embedding-backend.interface';
import { SemanticCacheModule } from '../../src/cache/semantic/semantic-cache.module';
import {
  EMBEDDING_BACKEND,
  VECTOR_STORE,
} from '../../src/cache/semantic/semantic-cache.tokens';
import type {
  VectorSearchHit,
  VectorStore,
  VectorStoreKnnInput,
  VectorStoreUpsertInput,
} from '../../src/cache/semantic/vector-store.interface';
import { createMockConfigService } from '../../src/common/mocks/createMockConfigService';
import { TEST_MODEL_ALIAS } from '../../src/common/mocks/test-constants';
import { RedisConnectionService } from '../../src/cache/adapters/redis-cache/redis-connection.service';
import { LoggingService } from '../../src/logging/logging.service';
import { ProviderInstancesBootstrap } from '../../src/providers/provider-instances.bootstrap';
import { ProviderRegistryService } from '../../src/providers/provider-registry.service';
import { createE2eGatewayKeyRuntime } from './helpers/create-e2e-app';
import {
  E2E_GATEWAY_KEY,
  E2E_POST_SUCCESS_STATUS,
  E2E_ROUTES,
} from './helpers/e2e-constants';
import {
  createE2eLoggingServiceMock,
  createE2eProviderBootstrapMock,
  createE2eRedisConnectionMock,
} from './helpers/e2e-infra-mocks';
import {
  createE2eProviderRegistry,
  type E2eProviderRegistryMock,
} from './helpers/e2e-provider-registry';

/**
 * E2E setup leaves SEMANTIC_CACHE_ENABLED=false so CacheModule skips SemanticCacheModule.
 * Import it here as global so ChatCacheGuardService can resolve SemanticCacheService
 * without jest.resetModules() / dynamic import (unsupported under Jest CJS).
 */
@Global()
@Module({
  imports: [SemanticCacheModule],
  exports: [SemanticCacheModule],
})
class E2eSemanticCacheModule {}

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
    upsert(input: VectorStoreUpsertInput): Promise<void> {
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
      return Promise.resolve();
    },

    knn(input: VectorStoreKnnInput): Promise<VectorSearchHit[]> {
      return Promise.resolve(
        entries
          .filter(
            (e) =>
              e.clientId === input.clientId &&
              e.modelAlias === input.modelAlias,
          )
          .map((e): VectorSearchHit => ({
            similarity: 1,
            reply: { ...e.reply, cached: true as const },
          }))
          .slice(0, input.k),
      );
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
 * AppModule + SemanticCacheModule (fakes for embedding/vector — no Stack/Ollama).
 */
async function createE2eAppWithSemanticCache(
  providerRegistry: E2eProviderRegistryMock,
): Promise<INestApplication> {
  const fakeEmbedding = createFixedEmbeddingBackend();
  const fakeVectorStore = createInMemoryVectorStore();

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule, E2eSemanticCacheModule],
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
