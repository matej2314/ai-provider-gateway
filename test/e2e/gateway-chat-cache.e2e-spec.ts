import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../src/app.module';
import { setupApp } from '../../src/setup.app';
import { CACHE_BACKEND } from '../../src/cache/cache.tokens';
import type { CacheBackend } from '../../src/cache/interfaces/cache-backend-interface';
import { ProviderRegistryService } from '../../src/providers/provider-registry.service';
import { TEST_MODEL_ALIAS } from '../../src/common/mocks/test-constants';
import { createMockConfigService } from '../../src/common/mocks/createMockConfigService';
import {
  createE2eProviderRegistry,
  type E2eProviderRegistryMock,
} from './helpers/e2e-provider-registry';
import {
  createE2eLoggingServiceMock,
  createE2eProviderBootstrapMock,
  createE2eRedisConnectionMock,
} from './helpers/e2e-infra-mocks';
import { RedisConnectionService } from '../../src/cache/adapters/redis-cache/redis-connection.service';
import { ProviderInstancesBootstrap } from '../../src/providers/provider-instances.bootstrap';
import { LoggingService } from '../../src/logging/logging.service';
import { closeE2eApp } from './helpers/create-e2e-app';
import {
  E2E_GATEWAY_KEY,
  E2E_POST_SUCCESS_STATUS,
  E2E_ROUTES,
} from './helpers/e2e-constants';

function createInMemoryCacheBackend(): CacheBackend {
  const store = new Map<string, string>();
  return {
    isAvailable: () => true,
    get: (key: string) => Promise.resolve(store.get(key) ?? null),
    set: (key: string, value: string, ttl: number) => {
      void ttl;
      store.set(key, value);
      return Promise.resolve(true);
    },
    delete: (key: string) => Promise.resolve(store.delete(key)),
  };
}

async function createE2eAppWithCache(
  providerRegistry: E2eProviderRegistryMock,
): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ConfigService)
    .useValue(
      createMockConfigService({
        cache: { enabled: true, backend: 'memory', ttl: 3600 },
      }),
    )
    .overrideProvider(CACHE_BACKEND)
    .useValue(createInMemoryCacheBackend())
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

describe('Gateway Chat Cache (E2E)', () => {
  const validBody = {
    modelAlias: TEST_MODEL_ALIAS,
    messages: [{ role: 'user' as const, content: 'Cache me' }],
  };

  describe('Cache miss and hit', () => {
    let app: INestApplication;
    let providerRegistry: E2eProviderRegistryMock;
    let completeMock: jest.SpyInstance;

    beforeAll(async () => {
      providerRegistry = createE2eProviderRegistry();
      completeMock = jest.spyOn(providerRegistry.provider, 'complete');
      app = await createE2eAppWithCache(providerRegistry);
    });

    afterAll(async () => {
      await closeE2eApp(app);
    });

    it('should call provider on first request (cache miss)', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body.cached).toBeUndefined();
      expect(completeMock).toHaveBeenCalledTimes(1);
    });

    it('should return cached response on identical second request', async () => {
      const first = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      const second = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(second.body).toMatchObject({
        cached: true,
        cachedAt: expect.any(String),
        output: first.body.output,
      });
      expect(completeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache key sensitivity', () => {
    let app: INestApplication;
    let providerRegistry: E2eProviderRegistryMock;
    let completeMock: jest.SpyInstance;

    beforeAll(async () => {
      providerRegistry = createE2eProviderRegistry();
      completeMock = jest.spyOn(providerRegistry.provider, 'complete');
      app = await createE2eAppWithCache(providerRegistry);
    });

    afterAll(async () => {
      await closeE2eApp(app);
    });

    it('should miss cache when params differ', async () => {
      await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send({ ...validBody, params: { temperature: 0.5 } })
        .expect(E2E_POST_SUCCESS_STATUS);

      await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send({ ...validBody, params: { temperature: 0.9 } })
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(completeMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('Tooling bypasses cache', () => {
    let app: INestApplication;
    let providerRegistry: E2eProviderRegistryMock;
    let completeMock: jest.SpyInstance;

    beforeAll(async () => {
      providerRegistry = createE2eProviderRegistry();
      completeMock = jest.spyOn(providerRegistry.provider, 'complete');
      app = await createE2eAppWithCache(providerRegistry);
    });

    afterAll(async () => {
      await closeE2eApp(app);
    });

    it('should not return cached response when tooling.definitions are present', async () => {
      const toolingBody = {
        ...validBody,
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

      await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(toolingBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body.cached).toBeUndefined();
      expect(completeMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('Warnings persistence in cache', () => {
    let app: INestApplication;
    let providerRegistry: E2eProviderRegistryMock;

    beforeAll(async () => {
      providerRegistry = createE2eProviderRegistry();
      app = await createE2eAppWithCache(providerRegistry);
    });

    afterAll(async () => {
      await closeE2eApp(app);
    });

    it('should return cached warnings on cache hit', async () => {
      const body = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Cached warnings' }],
        params: { frequencyPenalty: 0.5 },
      };

      const first = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(body)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(first.body.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'params.frequencyPenalty' }),
        ]),
      );

      const second = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(body)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(second.body.cached).toBe(true);
      expect(second.body.warnings).toEqual(first.body.warnings);
    });
  });
});
