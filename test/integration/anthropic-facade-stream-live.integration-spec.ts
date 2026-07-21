import request from 'supertest';
import {
  createIntegrationApp,
  closeIntegrationApp,
} from './helpers/create-integration-app';
import {
  getIntegrationGatewayKey,
  INTEGRATION_MODEL_ALIAS,
  INTEGRATION_ROUTES,
} from './helpers/integration-constants';
import { parseAnthropicSseEvents } from './helpers/parse-anthropic-sse-events';
import type { INestApplication } from '@nestjs/common';

describe('Anthropic facade stream live (integration)', () => {
  let app: INestApplication;

  const validBody = {
    model: INTEGRATION_MODEL_ALIAS,
    max_tokens: 16,
    stream: true,
    messages: [
      {
        role: 'user' as const,
        content: [{ type: 'text' as const, text: 'Say hi' }],
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

  it('streams Anthropic SSE events from live SDK', async () => {
    const response = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.anthropicMessages)
      .set('x-api-key', getIntegrationGatewayKey())
      .send(validBody)
      .expect(200)
      .expect('Content-Type', /text\/event-stream/);

    expect(response.headers['anthropic-version']).toBe('2023-06-01');

    const events = parseAnthropicSseEvents(response.text);
    const types = events.map((e) => e.type);

    expect(types).toContain('message_start');
    expect(types).toContain('content_block_delta');
    expect(types).toContain('message_stop');

    const text = events
      .filter((e) => e.type === 'content_block_delta')
      .map((e) => {
        const delta = e.data.delta as { text?: string } | undefined;
        return delta?.text ?? '';
      })
      .join('');

    expect(text.length).toBeGreaterThan(0);
  });
});
