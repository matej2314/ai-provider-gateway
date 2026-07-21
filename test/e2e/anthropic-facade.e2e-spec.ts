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
  createAnthropicRequestBody,
  E2E_GATEWAY_KEY,
  E2E_INVALID_GATEWAY_KEY,
  E2E_POST_SUCCESS_STATUS,
  E2E_ROUTES,
} from './helpers/e2e-constants';

describe('Anthropic Facade API (E2E)', () => {
  let app: INestApplication;
  let providerRegistry: ReturnType<typeof createE2eProviderRegistry>;

  const anthropicModel = 'claude-3-opus-20240229';
  const validBody = createAnthropicRequestBody(anthropicModel);

  beforeAll(async () => {
    providerRegistry = createE2eProviderRegistry({
      modelAlias: anthropicModel,
    });
    const context = await createE2eApp({ providerRegistry });
    app = context.app;
  });

  afterAll(async () => {
    await closeE2eApp(app);
  });

  describe('Authentication (x-api-key)', () => {
    it('should return 401 when x-api-key header is missing', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .send(validBody)
        .expect(401);

      expect(response.body).toMatchObject({
        type: 'error',
        error: {
          type: expect.any(String),
          message: expect.any(String),
        },
      });
    });

    it('should return 403 when x-api-key is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_INVALID_GATEWAY_KEY)
        .send(validBody)
        .expect(403);

      expect(response.body).toMatchObject({
        type: 'error',
        error: {
          type: expect.any(String),
          message: expect.any(String),
        },
      });
    });

    it('should return 200 when x-api-key is valid', async () => {
      await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(E2E_POST_SUCCESS_STATUS);
    });
  });

  describe('POST /anthropic/messages (non-streaming)', () => {
    it('should return Anthropic-compatible response structure', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body).toMatchObject({
        id: expect.stringMatching(/^msg_/),
        type: 'message',
        role: 'assistant',
        content: expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: expect.any(String),
          }),
        ]),
        model: expect.any(String),
        stop_reason: expect.any(String),
        usage: expect.objectContaining({
          input_tokens: expect.any(Number),
          output_tokens: expect.any(Number),
        }),
      });
    });

    it('should include x-request-id in response headers', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('POST /anthropic/messages (streaming)', () => {
    it('should return SSE events in Anthropic format', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .send({ ...validBody, stream: true })
        .expect(200)
        .expect('Content-Type', /text\/event-stream/);

      const body = response.text;
      expect(body).toContain('event: message_start');
      expect(body).toContain('event: content_block_start');
      expect(body).toContain('event: content_block_delta');
      expect(body).toContain('event: message_stop');
    });

    it('should include anthropic-version header in streaming response', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .send({ ...validBody, stream: true })
        .expect(200);

      expect(response.headers['anthropic-version']).toBe('2023-06-01');
    });

    it('should include x-request-id in SSE headers', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .send({ ...validBody, stream: true })
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Validation errors', () => {
    it('should return 400 in Anthropic format when model is missing', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .send({
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 1024,
        })
        .expect(400);

      expect(response.body).toMatchObject({
        type: 'error',
        error: {
          type: expect.any(String),
          message: expect.stringMatching(/model/i),
        },
      });
    });

    it('should return 400 when max_tokens is below minimum', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .send(createAnthropicRequestBody(anthropicModel, { max_tokens: 0 }))
        .expect(400);

      expect(response.body.type).toBe('error');
      expect(response.body.error.message).toMatch(/max_tokens/i);
    });

    it('should return 400 when messages is not an array', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .send({
          model: anthropicModel,
          messages: 'not an array',
          max_tokens: 1024,
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Rate limiting (concurrent streams)', () => {
    it('should return 429 in Anthropic format when concurrent stream limit is exceeded', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            modelAlias: anthropicModel,
          }),
          rateLimiter: createE2eSaturatedConcurrentStreamLimiter(),
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.anthropicMessages)
            .set('x-api-key', E2E_GATEWAY_KEY)
            .send(
              createAnthropicRequestBody(anthropicModel, {
                stream: true,
                messages: [
                  {
                    role: 'user',
                    content: [{ type: 'text', text: 'Stream 4' }],
                  },
                ],
              }),
            )
            .expect(429);

          expect(response.body).toMatchObject({
            type: 'error',
            error: {
              type: expect.any(String),
              message: expect.any(String),
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
      errorRegistry = createE2eProviderRegistry({ modelAlias: anthropicModel });
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

    it('should return 400 in Anthropic format when provider returns invalid_request_error', async () => {
      const response = await request(errorApp.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(400);

      expect(response.body).toMatchObject({
        type: 'error',
        error: {
          type: expect.any(String),
          message: expect.any(String),
        },
      });
    });

    it('should return 500 in Anthropic format when provider returns server error', async () => {
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
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(500);

      expect(response.body.type).toBe('error');
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Ingress profile (facade-anthropic)', () => {
    it('should accept request with 200 messages (facade profile)', async () => {
      const messages = Array(200)
        .fill(null)
        .map((_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: [{ type: 'text' as const, text: 'test' }],
        }));

      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .send({
          model: anthropicModel,
          messages,
          max_tokens: 1024,
        })
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body.content).toBeDefined();
    });
  });

  describe('Thinking capability enforcement', () => {
    it('should return 400 in Anthropic format when thinking is sent without capability', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            modelAlias: anthropicModel,
            capabilities: { thinking: false },
          }),
        },
        async ({ app: thinkingApp }) => {
          const response = await request(thinkingApp.getHttpServer())
            .post(E2E_ROUTES.anthropicMessages)
            .set('x-api-key', E2E_GATEWAY_KEY)
            .send(
              createAnthropicRequestBody(anthropicModel, {
                thinking: { type: 'enabled', budget_tokens: 1024 },
              }),
            )
            .expect(400);

          expect(response.body.error.type).toBe('invalid_request_error');
        },
      );
    });
  });

  describe('Contract compliance', () => {
    it('should map gateway response to Anthropic format correctly', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .send(
          createAnthropicRequestBody(anthropicModel, {
            messages: [
              {
                role: 'user',
                content: [{ type: 'text', text: 'Test mapping' }],
              },
            ],
          }),
        )
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(/^msg_/),
          type: 'message',
          role: 'assistant',
          content: expect.arrayContaining([
            expect.objectContaining({
              type: 'text',
              text: expect.any(String),
            }),
          ]),
          model: expect.any(String),
          stop_reason: expect.stringMatching(
            /^(end_turn|max_tokens|stop_sequence|tool_use)$/,
          ),
          usage: expect.objectContaining({
            input_tokens: expect.any(Number),
            output_tokens: expect.any(Number),
          }),
        }),
      );
    });

    it('should include stop_sequence when provided', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .send(
          createAnthropicRequestBody(anthropicModel, {
            stop_sequences: ['END'],
          }),
        )
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body).toMatchObject({
        type: 'message',
        stop_reason: expect.any(String),
      });
    });
  });
});
