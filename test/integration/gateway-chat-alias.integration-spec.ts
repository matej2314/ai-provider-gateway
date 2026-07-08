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
  INTEGRATION_MODEL_ALIAS_BRANDED,
  INTEGRATION_POST_SUCCESS_STATUS,
  INTEGRATION_ROUTES,
  INTEGRATION_SECOND_MODEL_ALIAS,
} from './helpers/integration-constants';

describe('Gateway chat cache model alias isolation (integration)', () => {
  let app: INestApplication;
  let completeSpy: jest.SpyInstance;

  const sharedMessages = [
    { role: 'user' as const, content: 'integration-alias-cache-ping' },
  ];
  const sharedParams = { maxOutputTokens: 16, temperature: 0 };

  beforeAll(async () => {
    await flushIntegrationRedisDb();

    const context = await createIntegrationApp({
      cacheEnabled: true,
      dualModel: true,
    });
    app = context.app;

    const registry = app.get(ProviderRegistryService);
    const resolved = registry.resolve(INTEGRATION_MODEL_ALIAS_BRANDED);
    completeSpy = jest.spyOn(resolved.provider, 'complete');
  });

  afterAll(async () => {
    completeSpy.mockRestore();
    await closeIntegrationApp(app);
  });

  it('same messages under different modelAlias use separate cache entries', async () => {
    const firstAlias = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chat)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .send({
        modelAlias: INTEGRATION_MODEL_ALIAS,
        messages: sharedMessages,
        params: sharedParams,
      })
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(firstAlias.body.cached).toBeFalsy();
    expect(firstAlias.body.model).toBe(INTEGRATION_MODEL_ALIAS);

    const secondAlias = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chat)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .send({
        modelAlias: INTEGRATION_SECOND_MODEL_ALIAS,
        messages: sharedMessages,
        params: sharedParams,
      })
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(secondAlias.body.cached).toBeFalsy();
    expect(secondAlias.body.model).toBe(INTEGRATION_SECOND_MODEL_ALIAS);
    expect(completeSpy).toHaveBeenCalledTimes(2);

    const hitFirstAlias = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chat)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .send({
        modelAlias: INTEGRATION_MODEL_ALIAS,
        messages: sharedMessages,
        params: sharedParams,
      })
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(hitFirstAlias.body).toMatchObject({
      cached: true,
      cachedAt: expect.any(String),
      model: INTEGRATION_MODEL_ALIAS,
      output: { text: firstAlias.body.output.text },
    });
    expect(completeSpy).toHaveBeenCalledTimes(2);

    const hitSecondAlias = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chat)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .send({
        modelAlias: INTEGRATION_SECOND_MODEL_ALIAS,
        messages: sharedMessages,
        params: sharedParams,
      })
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(hitSecondAlias.body).toMatchObject({
      cached: true,
      cachedAt: expect.any(String),
      model: INTEGRATION_SECOND_MODEL_ALIAS,
      output: { text: secondAlias.body.output.text },
    });
    expect(completeSpy).toHaveBeenCalledTimes(2);
  });
});
