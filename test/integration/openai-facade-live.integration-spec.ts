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

describe('OpenAI facade live (integration)', () => {
  let app: INestApplication;

  const validBody = {
    model: INTEGRATION_MODEL_ALIAS,
    messages: [{ role: 'user' as const, content: 'Reply with exactly: OK' }],
    max_tokens: 16,
    temperature: 0,
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

  it('POST /openai/chat/completions returns OpenAI-compatible JSON from live SDK', async () => {
    const response = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.openAiCompletions)
      .set('Authorization', `Bearer ${getIntegrationGatewayKey()}`)
      .send(validBody)
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(response.body).toMatchObject({
      id: expect.stringMatching(/^chatcmpl_/),
      object: 'chat.completion',
      created: expect.any(Number),
      model: INTEGRATION_MODEL_ALIAS,
      choices: [
        expect.objectContaining({
          index: 0,
          message: expect.objectContaining({
            role: 'assistant',
            content: expect.any(String),
          }),
          finish_reason: expect.any(String),
        }),
      ],
      usage: expect.objectContaining({
        prompt_tokens: expect.any(Number),
        completion_tokens: expect.any(Number),
        total_tokens: expect.any(Number),
      }),
    });

    expect(response.body.warnings).toBeUndefined();
    expect(response.body.choices[0].message.content.length).toBeGreaterThan(0);
    expect(response.headers['x-request-id']).toBeDefined();
  });
});
