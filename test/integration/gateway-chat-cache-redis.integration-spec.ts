import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { ProviderRegistryService } from '../../src/providers/provider-registry.service';
import {
  createIntegrationApp,
  closeIntegrationApp,
} from './helpers/create-integration-app';
import { flushIntegrationRedisDb } from './helpers/flush-integration-redis';
import {
  getIntegrationGatewayKey,
  INTEGRATION_MODEL_ALIAS,
  INTEGRATION_POST_SUCCESS_STATUS,
  INTEGRATION_ROUTES,
} from './helpers/integration-constants';

describe('Gateway chat cache Redis (integration)', () => {
  let app: INestApplication;
  let completeSpy: jest.SpyInstance;

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
    const resolved = registry.resolve(INTEGRATION_MODEL_ALIAS);
    completeSpy = jest.spyOn(resolved.provider, 'complete');
  });

  afterAll(async () => {
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

    const second = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chat)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .send(validBody)
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(second.body).toMatchObject({
      cached: true,
      cachedAt: expect.any(String),
      output: { text: first.body.output.text },
    });

    expect(completeSpy).toHaveBeenCalledTimes(1);
  });
});
