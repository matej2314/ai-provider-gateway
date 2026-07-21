import request from 'supertest';
import {
  createIntegrationApp,
  closeIntegrationApp,
} from './helpers/create-integration-app';
import {
  getIntegrationGatewayKey,
  INTEGRATION_MODEL_ALIAS,
  INTEGRATION_POST_SUCCESS_STATUS,
  INTEGRATION_ROUTES,
} from './helpers/integration-constants';
import type { INestApplication } from '@nestjs/common';

describe('Anthropic facade live (integration)', () => {
  let app: INestApplication;

  const validBody = {
    model: INTEGRATION_MODEL_ALIAS,
    max_tokens: 16,
    messages: [
      {
        role: 'user' as const,
        content: [{ type: 'text' as const, text: 'Reply OK' }],
      },
    ],
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

  it('POST /anthropic/messages returns Anthropic-compatible JSON from live SDK', async () => {
    const response = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.anthropicMessages)
      .set('x-api-key', getIntegrationGatewayKey())
      .send(validBody)
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(response.body).toMatchObject({
      id: expect.stringMatching(/^msg_/),
      type: 'message',
      role: 'assistant',
      content: [
        expect.objectContaining({
          type: 'text',
          text: expect.any(String),
        }),
      ],
      model: expect.any(String),
      stop_reason: expect.any(String),
      usage: expect.objectContaining({
        input_tokens: expect.any(Number),
        output_tokens: expect.any(Number),
      }),
    });

    expect(response.body.content[0].text.length).toBeGreaterThan(0);
    expect(response.headers['x-request-id']).toBeDefined();
  });
});
