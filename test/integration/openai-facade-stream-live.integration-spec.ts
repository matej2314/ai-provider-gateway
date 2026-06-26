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
import type { INestApplication } from '@nestjs/common';

function parseOpenAiSseDataLines(raw: string): Record<string, unknown>[] {
  return raw
    .split('\n\n')
    .map((block) => block.trim())
    .filter((block) => block.startsWith('data: ') && !block.includes('[DONE]'))
    .map((block) => JSON.parse(block.slice('data: '.length)));
}

describe('OpenAI facade stream live (integration)', () => {
  let app: INestApplication;

  const validBody = {
    model: INTEGRATION_MODEL_ALIAS,
    messages: [{ role: 'user' as const, content: 'say hi' }],
    stream: true,
    max_tokens: 16,
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

  it('streams OpenAI chunks and terminates with [DONE]', async () => {
    const response = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.openAiCompletions)
      .set('Authorization', `Bearer ${getIntegrationGatewayKey()}`)
      .send(validBody)
      .expect(200)
      .expect('Content-Type', /text\/event-stream/);

    expect(response.text).toContain('data: ');
    expect(response.text).toContain('chat.completion.chunk');
    expect(response.text).toContain('data: [DONE]');

    const chunks = parseOpenAiSseDataLines(response.text);
    expect(chunks.length).toBeGreaterThan(0);

    const hasContent = chunks.some((chunk) => {
      const choices = chunk.choices as Array<{
        delta?: { content?: string; role?: string };
      }>;
      return choices?.some(
        (c) =>
          (typeof c.delta?.content === 'string' &&
            c.delta.content.length > 0) ||
          c.delta?.role === 'assistant',
      );
    });
    expect(hasContent).toBe(true);
  });

  it('allows a second stream after the first completes', async () => {
    await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.openAiCompletions)
      .set('Authorization', `Bearer ${getIntegrationGatewayKey()}`)
      .send(validBody)
      .expect(200);

    await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.openAiCompletions)
      .set('Authorization', `Bearer ${getIntegrationGatewayKey()}`)
      .send(validBody)
      .expect(200);
  });
});
