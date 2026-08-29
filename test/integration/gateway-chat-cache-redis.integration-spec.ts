import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { ProviderRegistryService } from '../../src/providers/provider-registry.service';
import { CACHE_BACKEND } from '../../src/cache/cache.tokens';
import type { CacheBackend } from '../../src/cache/interfaces/cache-backend-interface';
import type { CacheKey } from '../../src/common/types';
import { TEST_INTEGRATION_CACHE_KEY_PREFIX } from '../../src/common/mocks/test-constants';
import {
  createIntegrationApp,
  closeIntegrationApp,
} from './helpers/create-integration-app';
import { flushIntegrationRedisDb } from './helpers/flush-integration-redis';
import {
  getIntegrationGatewayKey,
  INTEGRATION_MODEL_ALIAS,
  INTEGRATION_MODEL_ALIAS_BRANDED,
  INTEGRATION_POST_SUCCESS_STATUS,
  INTEGRATION_ROUTES,
} from './helpers/integration-constants';
import { expectGatewayUsage } from '../helpers/expect-gateway-usage';

describe('Gateway chat cache Redis (integration)', () => {
  let app: INestApplication;
  let completeSpy: jest.SpyInstance;
  let cacheGetSpy: jest.SpyInstance;

  const validBody = {
    modelAlias: INTEGRATION_MODEL_ALIAS,
    messages: [{ role: 'user' as const, content: 'integration-cache-ping' }],
    params: { maxOutputTokens: 16, temperature: 0 },
  };

  beforeAll(async () => {
    await flushIntegrationRedisDb();

    const context = await createIntegrationApp({ cacheEnabled: true });
    app = context.app;

    const registry = app.get(ProviderRegistryService);
    const resolved = registry.resolve(INTEGRATION_MODEL_ALIAS_BRANDED);
    completeSpy = jest.spyOn(resolved.provider, 'complete');

    const cacheBackend = app.get<CacheBackend>(CACHE_BACKEND);
    cacheGetSpy = jest.spyOn(cacheBackend, 'get');
  });

  afterAll(async () => {
    cacheGetSpy.mockRestore();
    completeSpy.mockRestore();
    await closeIntegrationApp(app);
  });

  it('miss then hit — provider.complete called exactly once', async () => {
    const first = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chat)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .send(validBody)
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(first.body.cached).toBeFalsy();
    expect(first.body.output.text).toEqual(expect.any(String));
    expect(first.body.output.text.length).toBeGreaterThan(0);
    expectGatewayUsage(first.body.usage);

    expect(cacheGetSpy).toHaveBeenCalled();
    const cacheKey = cacheGetSpy.mock.calls[0][0] as CacheKey;
    expect(String(cacheKey)).toMatch(
      new RegExp(
        `^${TEST_INTEGRATION_CACHE_KEY_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}cache:chat:[a-f0-9]{64}$`,
      ),
    );

    const second = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chat)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .send(validBody)
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(second.body).toMatchObject({
      cached: true,
      cachedAt: expect.any(String),
      cacheSource: 'exact',
      output: { text: first.body.output.text },
    });
    expectGatewayUsage(second.body.usage);
    expect(second.body.usage).toEqual(first.body.usage);

    expect(completeSpy).toHaveBeenCalledTimes(1);
  });
});
