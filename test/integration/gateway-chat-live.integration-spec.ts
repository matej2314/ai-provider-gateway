import request from 'supertest';
import {
  createIntegrationApp,
  closeIntegrationApp,
} from './helpers/create-integration-app';
import {
  getIntegrationGatewayKey,
  INTEGRATION_MODEL_ALIAS,
  INTEGRATION_MODEL_ALIAS_BRANDED,
  INTEGRATION_POST_SUCCESS_STATUS,
  INTEGRATION_PROVIDER_INSTANCE_BRANDED,
  INTEGRATION_ROUTES,
} from './helpers/integration-constants';
import type { INestApplication } from '@nestjs/common';
import { ProviderRegistryService } from '../../src/providers/provider-registry.service';
import {
  TEST_MAX_ATTEMPTS,
  TEST_TIMEOUT_MS,
} from '../../src/common/mocks/test-constants';
import { expectGatewayUsage } from '../helpers/expect-gateway-usage';

describe('Gateway chat live (integration)', () => {
  let app: INestApplication;

  const validBody = {
    modelAlias: INTEGRATION_MODEL_ALIAS,
    messages: [{ role: 'user' as const, content: 'Reply with exactly: OK' }],
    params: { maxOutputTokens: 16, temperature: 0 },
  };

  beforeAll(async () => {
    const context = await createIntegrationApp({
      cacheEnabled: false,
      rateLimitEnabled: false,
    });
    app = context.app;
  });

  afterAll(async () => {
    await closeIntegrationApp(app);
  });

  it('resolves model policy with branded timeout and retry limits', () => {
    const registry = app.get(ProviderRegistryService);
    const resolved = registry.resolve(INTEGRATION_MODEL_ALIAS_BRANDED);

    expect(resolved.policy?.timeoutMs).toBe(TEST_TIMEOUT_MS);
    expect(resolved.policy?.retry?.maxAttempts).toBe(TEST_MAX_ATTEMPTS);
    expect(resolved.providerName).toBe(INTEGRATION_PROVIDER_INSTANCE_BRANDED);
  });

  it('POST /chat returns live SDK response', async () => {
    const response = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chat)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .send(validBody)
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(response.body).toMatchObject({
      id: expect.stringMatching(/^gw_/),
      conversationId: expect.any(String),
      model: INTEGRATION_MODEL_ALIAS,
      provider: INTEGRATION_PROVIDER_INSTANCE_BRANDED,
      output: {
        type: 'text',
        text: expect.any(String),
      },
      usage: {
        inputTokens: expect.any(Number),
        outputTokens: expect.any(Number),
      },
      finishReason: expect.any(String),
      requestId: expect.any(String),
    });

    expectGatewayUsage(response.body.usage);
    expect(response.body.output.text.length).toBeGreaterThan(0);
    expect(response.body.cached).toBeUndefined();
  });

  it('echoes X-Request-Id when provided', async () => {
    const requestId = 'it-req-001';

    const response = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chat)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .set('x-request-id', requestId)
      .send(validBody)
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(response.body.requestId).toBe(requestId);
    expect(response.headers['x-request-id']).toBe(requestId);
  });
});
