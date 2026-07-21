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
} from './helpers/integration-constants';
import { expectGatewayUsage } from '../helpers/expect-gateway-usage';

describe('Gateway chat cache tooling bypass (integration)', () => {
  let app: INestApplication;
  let completeSpy: jest.SpyInstance;

  const baseBody = {
    modelAlias: INTEGRATION_MODEL_ALIAS,
    messages: [
      { role: 'user' as const, content: 'integration-tooling-cache-ping' },
    ],
    params: { maxOutputTokens: 16, temperature: 0 },
  };

  const toolingBody = {
    ...baseBody,
    tooling: {
      definitions: [
        {
          name: 'get_weather',
          description: 'Get weather for a city',
          parameters: { type: 'object', properties: {} },
        },
      ],
    },
  };

  beforeAll(async () => {
    await flushIntegrationRedisDb();

    const context = await createIntegrationApp({
      cacheEnabled: true,
      toolsEnabled: true,
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

  it('miss then tooling request bypasses cache — provider.complete called twice', async () => {
    const first = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chat)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .send(baseBody)
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(first.body.cached).toBeFalsy();
    expectGatewayUsage(first.body.usage);

    const withTooling = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chat)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .send(toolingBody)
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(withTooling.body.cached).toBeUndefined();
    expectGatewayUsage(withTooling.body.usage);
    expect(completeSpy).toHaveBeenCalledTimes(2);
  });
});
