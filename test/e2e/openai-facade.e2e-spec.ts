import { HttpException, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { ApiErrorCode } from '../../src/common/errors/api-error.code';
import {
  closeE2eApp,
  createE2eApp,
  withE2eApp,
} from './helpers/create-e2e-app';
import { createE2eProviderRegistry } from './helpers/e2e-provider-registry';
import { createE2eSaturatedConcurrentStreamLimiter } from './helpers/e2e-rate-limiter';
import {
  E2E_GATEWAY_KEY,
  E2E_INVALID_GATEWAY_KEY,
  E2E_POST_SUCCESS_STATUS,
  E2E_ROUTES,
} from './helpers/e2e-constants';

describe('OpenAI Facade API (E2E)', () => {
  let app: INestApplication;
  let providerRegistry: ReturnType<typeof createE2eProviderRegistry>;

  const openAiModel = 'gpt-4';
  const validBody = {
    model: openAiModel,
    messages: [{ role: 'user' as const, content: 'Hello' }],
  };

  beforeAll(async () => {
    providerRegistry = createE2eProviderRegistry({ modelAlias: openAiModel });
    const context = await createE2eApp({ providerRegistry });
    app = context.app;
  });

  afterAll(async () => {
    await closeE2eApp(app);
  });

  describe('Authentication (Bearer token)', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .send(validBody)
        .expect(401);

      expect(response.body).toMatchObject({
        error: {
          message: expect.any(String),
          type: expect.any(String),
          code: expect.any(String),
        },
      });
    });

    it('should return 403 when Bearer token is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer ${E2E_INVALID_GATEWAY_KEY}`)
        .send(validBody)
        .expect(403);

      expect(response.body).toMatchObject({
        error: {
          message: expect.any(String),
          type: expect.any(String),
        },
      });
    });

    it('should return 200 when Bearer token is valid', async () => {
      await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .send(validBody)
        .expect(E2E_POST_SUCCESS_STATUS);
    });
  });

  describe('POST /openai/chat/completions (non-streaming)', () => {
    it('should return OpenAI-compatible response structure', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .send(validBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body).toMatchObject({
        id: expect.stringMatching(/^chatcmpl_/),
        object: 'chat.completion',
        created: expect.any(Number),
        model: openAiModel,
        choices: expect.arrayContaining([
          expect.objectContaining({
            index: 0,
            message: expect.objectContaining({
              role: 'assistant',
              content: expect.any(String),
            }),
            finish_reason: expect.any(String),
          }),
        ]),
        usage: expect.objectContaining({
          prompt_tokens: expect.any(Number),
          completion_tokens: expect.any(Number),
          total_tokens: expect.any(Number),
        }),
      });
    });

    it('should include x-request-id in response headers', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .send(validBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('POST /openai/chat/completions (streaming)', () => {
    it('should return SSE chunks in OpenAI format and terminate with [DONE]', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .send({ ...validBody, stream: true })
        .expect(200)
        .expect('Content-Type', /text\/event-stream/);

      const body = response.text;
      expect(body).toContain('data: ');
      expect(body).toContain('chat.completion.chunk');
      expect(body).toContain('data: [DONE]');
    });

    it('should return x-request-id in SSE headers', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .send({ ...validBody, stream: true })
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should respect stream_options.include_usage = true', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .send({
          ...validBody,
          stream: true,
          stream_options: { include_usage: true },
        })
        .expect(200);

      const usageLines = response.text
        .split('\n\n')
        .filter((line) => line.startsWith('data: ') && !line.includes('[DONE]'))
        .map((line) => JSON.parse(line.slice(6)));

      expect(usageLines.some((chunk) => chunk.usage != null)).toBe(true);
    });
  });

  describe('Validation errors', () => {
    it('should return 400 in OpenAI format when model is missing', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .send({
          messages: [{ role: 'user', content: 'Test' }],
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          message: expect.stringMatching(/model/i),
          type: expect.any(String),
        },
      });
    });

    it('should return 400 when messages is not an array', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .send({
          model: openAiModel,
          messages: 'not an array',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Rate limiting (concurrent streams)', () => {
    it('should return 429 in OpenAI format when concurrent stream limit is exceeded', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            modelAlias: openAiModel,
          }),
          rateLimiter: createE2eSaturatedConcurrentStreamLimiter(),
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.openAiCompletions)
            .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
            .send({
              model: openAiModel,
              messages: [{ role: 'user', content: 'Stream 4' }],
              stream: true,
            })
            .expect(429);

          expect(response.body).toMatchObject({
            error: {
              message: expect.any(String),
              type: expect.any(String),
              code: expect.any(String),
            },
          });
        },
      );
    });
  });

  describe('Error mapping', () => {
    // Dedicated app: provider.complete is mocked to reject for the whole describe.
    let errorApp: INestApplication;
    let errorRegistry: ReturnType<typeof createE2eProviderRegistry>;

    beforeAll(async () => {
      errorRegistry = createE2eProviderRegistry({ modelAlias: openAiModel });
      errorRegistry.provider.complete = jest.fn().mockRejectedValue(
        new HttpException(
          {
            code: ApiErrorCode.VALIDATION_FAILED,
            message: 'Invalid parameter',
            details: [],
          },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const context = await createE2eApp({ providerRegistry: errorRegistry });
      errorApp = context.app;
    });

    afterAll(async () => {
      await closeE2eApp(errorApp);
    });

    it('should return 400 in OpenAI format when provider returns invalid_request_error', async () => {
      const response = await request(errorApp.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .send(validBody)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          message: expect.any(String),
          type: expect.any(String),
          code: expect.any(String),
        },
      });
    });

    it('should return 500 in OpenAI format when provider returns server error', async () => {
      (errorRegistry.provider.complete as jest.Mock).mockRejectedValueOnce(
        new HttpException(
          {
            code: ApiErrorCode.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
            details: [],
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );

      const response = await request(errorApp.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .send(validBody)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Ingress profile (facade-openai)', () => {
    it('should accept request with 200 messages (facade profile)', async () => {
      const messages = Array(200)
        .fill(null)
        .map((_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: 'test',
        }));

      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .send({
          model: openAiModel,
          messages,
        })
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body.choices).toBeDefined();
    });
  });

  describe('Thinking capability enforcement', () => {
    it('should return 400 in OpenAI format when reasoning_effort is sent without capability', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            modelAlias: openAiModel,
            capabilities: { thinking: false },
          }),
        },
        async ({ app: thinkingApp }) => {
          const response = await request(thinkingApp.getHttpServer())
            .post(E2E_ROUTES.openAiCompletions)
            .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
            .send({
              model: openAiModel,
              messages: [{ role: 'user', content: 'Think' }],
              reasoning_effort: 'medium',
            })
            .expect(400);

          expect(response.body.error.type).toBe('invalid_request_error');
        },
      );
    });
  });

  describe('Warnings not exposed on facade', () => {
    it('should not include warnings in OpenAI completion response', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .send({
          model: openAiModel,
          messages: [{ role: 'user', content: 'test' }],
          frequency_penalty: 0.5,
        })
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body.warnings).toBeUndefined();
    });
  });

  describe('Contract compliance', () => {
    it('should map gateway response to OpenAI format correctly', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .send({
          model: openAiModel,
          messages: [{ role: 'user', content: 'Test mapping' }],
        })
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(/^chatcmpl_/),
          object: 'chat.completion',
          created: expect.any(Number),
          model: expect.any(String),
          choices: expect.arrayContaining([
            expect.objectContaining({
              index: expect.any(Number),
              message: expect.objectContaining({
                role: 'assistant',
                content: expect.any(String),
              }),
              finish_reason: expect.stringMatching(
                /^(stop|length|tool_calls|content_filter)$/,
              ),
            }),
          ]),
          usage: expect.objectContaining({
            prompt_tokens: expect.any(Number),
            completion_tokens: expect.any(Number),
            total_tokens: expect.any(Number),
          }),
        }),
      );
    });
  });
});
