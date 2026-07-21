import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import {
  closeOpenAiIntegrationApp,
  createOpenAiIntegrationApp,
} from './helpers/create-openai-integration-app';
import {
  getIntegrationGatewayKey,
  INTEGRATION_POST_SUCCESS_STATUS,
  INTEGRATION_ROUTES,
} from './helpers/integration-constants';
import {
  INTEGRATION_OPENAI_MODEL_ALIAS,
  INTEGRATION_OPENAI_PROVIDER_INSTANCE,
} from './helpers/integration-openai-constants';
import { hasOpenAiIntegrationEnv } from './helpers/require-integration-env';

const describeOpenAiLive = hasOpenAiIntegrationEnv() ? describe : describe.skip;

describeOpenAiLive('Gateway chat OpenAI provider live (integration)', () => {
  let app: INestApplication;

  const validBody = {
    modelAlias: INTEGRATION_OPENAI_MODEL_ALIAS,
    messages: [{ role: 'user' as const, content: 'Reply with exactly: OK' }],
    params: { maxOutputTokens: 16, temperature: 0 },
  };

  beforeAll(async () => {
    const context = await createOpenAiIntegrationApp({
      cacheEnabled: false,
      rateLimitEnabled: false,
    });
    app = context.app;
  });

  afterAll(async () => {
    await closeOpenAiIntegrationApp(app);
  });

  it('POST /chat returns live OpenAI SDK response', async () => {
    const response = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chat)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .send(validBody)
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(response.body).toMatchObject({
      id: expect.stringMatching(/^gw_/),
      conversationId: expect.any(String),
      model: INTEGRATION_OPENAI_MODEL_ALIAS,
      provider: INTEGRATION_OPENAI_PROVIDER_INSTANCE,
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

    expect(response.body.output.text.length).toBeGreaterThan(0);
    expect(response.body.cached).toBeUndefined();
  });

  it('echoes X-Request-Id when provided', async () => {
    const requestId = 'it-openai-req-001';

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
