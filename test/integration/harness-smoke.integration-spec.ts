import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { ProviderRegistryService } from '../../src/providers/provider-registry.service';
import { RedisConnectionService } from '../../src/cache/adapters/redis-cache/redis-connection.service';
import {
  closeIntegrationApp,
  createIntegrationApp,
} from './helpers/create-integration-app';
import {
  INTEGRATION_MODEL_ALIAS_BRANDED,
  INTEGRATION_PROVIDER_INSTANCE_BRANDED,
  INTEGRATION_ROUTES,
} from './helpers/integration-constants';

describe('Integration harness smoke', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const context = await createIntegrationApp({ cacheEnabled: true });
    app = context.app;
  });

  afterAll(async () => {
    await closeIntegrationApp(app);
  });

  it('GET /health returns 200', async () => {
    await request(app.getHttpServer())
      .get(INTEGRATION_ROUTES.health)
      .expect(200);
  });

  it('GET /health/ready returns ready with healthy redis and cache checks', async () => {
    const response = await request(app.getHttpServer())
      .get(INTEGRATION_ROUTES.healthReady)
      .expect(200);
    expect(response.body).toMatchObject({
      status: 'ready',
      checks: {
        config: { status: 'healthy' },
        redis: expect.objectContaining({ status: 'healthy' }),
        cache: expect.objectContaining({ status: 'healthy' }),
      },
    });
  });

  it('ProviderRegistryService.resolve returns live adapter', () => {
    const registry = app.get(ProviderRegistryService);
    const resolved = registry.resolve(INTEGRATION_MODEL_ALIAS_BRANDED);

    expect(resolved.providerName).toBe(INTEGRATION_PROVIDER_INSTANCE_BRANDED);
    expect(resolved.provider).toBeDefined();
    expect(typeof resolved.provider.complete).toBe('function');
    expect(typeof resolved.provider.stream).toBe('function');
    expect(
      (resolved.provider as unknown as Record<string, unknown>).complete,
    ).not.toBeInstanceOf(jest.fn());
  });

  it('RedisConnectionService.ping succeeds when cache stack is loaded', async () => {
    const redis = app.get(RedisConnectionService);
    await expect(redis.ping()).resolves.toBe(true);
  });
});
