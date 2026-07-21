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
import { INTEGRATION_OPENAI_MODEL_ALIAS } from './helpers/integration-openai-constants';
import { hasOpenAiIntegrationEnv } from './helpers/require-integration-env';

const describeOpenAiLive = hasOpenAiIntegrationEnv() ? describe : describe.skip;

describeOpenAiLive(
  'OpenAI facade via OpenAI provider live (integration)',
  () => {
    let app: INestApplication;

    const validBody = {
      model: INTEGRATION_OPENAI_MODEL_ALIAS,
      messages: [{ role: 'user' as const, content: 'Reply with exactly: OK' }],
      max_tokens: 16,
      temperature: 0,
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

    it('POST /openai/chat/completions returns OpenAI-compatible JSON from live OpenAI adapter', async () => {
      const response = await request(app.getHttpServer())
        .post(INTEGRATION_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer ${getIntegrationGatewayKey()}`)
        .send(validBody)
        .expect(INTEGRATION_POST_SUCCESS_STATUS);

      expect(response.body).toMatchObject({
        id: expect.stringMatching(/^chatcmpl_/),
        object: 'chat.completion',
        created: expect.any(Number),
        model: INTEGRATION_OPENAI_MODEL_ALIAS,
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

      expect(response.body.choices[0].message.content.length).toBeGreaterThan(
        0,
      );
      expect(response.headers['x-request-id']).toBeDefined();
    });
  },
);
