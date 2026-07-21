import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import {
  closeOpenAiIntegrationApp,
  createOpenAiIntegrationApp,
} from './helpers/create-openai-integration-app';
import { parseGatewaySseEvents } from './helpers/parse-gateway-sse-events';
import {
  getIntegrationGatewayKey,
  INTEGRATION_ROUTES,
} from './helpers/integration-constants';
import { INTEGRATION_OPENAI_MODEL_ALIAS } from './helpers/integration-openai-constants';
import { hasOpenAiIntegrationEnv } from './helpers/require-integration-env';

const describeOpenAiLive = hasOpenAiIntegrationEnv() ? describe : describe.skip;

describeOpenAiLive(
  'Gateway chat OpenAI provider stream live (integration)',
  () => {
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

    it('POST /chat/stream emits meta, delta and done from live OpenAI SDK', async () => {
      const response = await request(app.getHttpServer())
        .post(INTEGRATION_ROUTES.chatStream)
        .set('x-gateway-key', getIntegrationGatewayKey())
        .set('Accept', 'text/event-stream')
        .send(validBody)
        .expect(200)
        .expect('Content-Type', /text\/event-stream/);

      const events = parseGatewaySseEvents(response.text);

      expect(events.some((e) => e.event === 'meta')).toBe(true);

      const deltas = events.filter((e) => e.event === 'delta');
      expect(deltas.length).toBeGreaterThan(0);
      expect(
        deltas.some(
          (e) => typeof e.data.text === 'string' && e.data.text.length > 0,
        ),
      ).toBe(true);

      const done = events.find((e) => e.event === 'done');
      expect(done).toBeDefined();
      expect(done!.data).toMatchObject({
        usage: expect.objectContaining({
          inputTokens: expect.any(Number),
          outputTokens: expect.any(Number),
        }),
        finishReason: expect.any(String),
      });

      const streamedText = deltas
        .map((e) => (typeof e.data.text === 'string' ? e.data.text : ''))
        .join('');
      expect(streamedText.length).toBeGreaterThan(0);
    });
  },
);
