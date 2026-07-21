import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { ProviderRegistryService } from '../../src/providers/provider-registry.service';
import {
  closeOpenAiIntegrationApp,
  createOpenAiIntegrationApp,
} from './helpers/create-openai-integration-app';
import {
  INTEGRATION_OPENAI_MODEL_ALIAS_BRANDED,
  INTEGRATION_OPENAI_MODEL_ID_BRANDED,
  INTEGRATION_OPENAI_PROVIDER_INSTANCE_BRANDED,
} from './helpers/integration-openai-constants';
import { INTEGRATION_ROUTES } from './helpers/integration-constants';
import { hasOpenAiIntegrationEnv } from './helpers/require-integration-env';

const describeOpenAiLive = hasOpenAiIntegrationEnv() ? describe : describe.skip;

describeOpenAiLive('OpenAI provider harness smoke (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const context = await createOpenAiIntegrationApp({ cacheEnabled: false });
    app = context.app;
  });

  afterAll(async () => {
    await closeOpenAiIntegrationApp(app);
  });

  it('ProviderRegistryService.resolve returns live OpenAI adapter', () => {
    const registry = app.get(ProviderRegistryService);
    const resolved = registry.resolve(INTEGRATION_OPENAI_MODEL_ALIAS_BRANDED);

    expect(resolved.providerName).toBe(
      INTEGRATION_OPENAI_PROVIDER_INSTANCE_BRANDED,
    );
    expect(resolved.modelId).toBe(INTEGRATION_OPENAI_MODEL_ID_BRANDED);
    expect(resolved.openAiApiSurface).toBe('responses');
    expect(resolved.provider).toBeDefined();
    expect(typeof resolved.provider.complete).toBe('function');
    expect(typeof resolved.provider.stream).toBe('function');
    expect(
      (resolved.provider as unknown as Record<string, unknown>).complete,
    ).not.toBeInstanceOf(jest.fn());
  });

  it('GET /health/ready returns ready', async () => {
    const response = await request(app.getHttpServer())
      .get(INTEGRATION_ROUTES.healthReady)
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ready',
      checks: {
        config: { status: 'healthy' },
        redis: expect.objectContaining({ status: 'healthy', required: false }),
        cache: expect.objectContaining({ status: 'healthy' }),
      },
    });
  });
});
