import { HttpException, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { ApiErrorCode } from '../../src/common/errors/api-error.code';
import {
  TEST_MODEL_ALIAS,
  TEST_MODEL_ID,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_INPUT_TOKENS,
  TEST_OUTPUT_TOKENS,
  TEST_MAX_ATTEMPTS,
  TEST_RETRY_ON_STATUS,
  TEST_TIMEOUT_MS,
} from '../../src/common/mocks/test-constants';
import { RETRY_POLICY_DEFAULTS } from '../../src/common/retry-policy-defaults';
import { expectGatewayUsage } from '../helpers/expect-gateway-usage';
import {
  closeE2eApp,
  createE2eApp,
  withE2eApp,
} from './helpers/create-e2e-app';
import {
  createE2eFallbackProviderRegistry,
  createE2eProviderRegistry,
} from './helpers/e2e-provider-registry';
import { createE2eBurstRateLimiter } from './helpers/e2e-rate-limiter';
import {
  E2E_GATEWAY_KEY,
  E2E_INVALID_GATEWAY_KEY,
  E2E_POST_SUCCESS_STATUS,
  E2E_ROUTES,
} from './helpers/e2e-constants';

describe('Gateway Chat API (E2E)', () => {
  let app: INestApplication;
  let providerRegistry: ReturnType<typeof createE2eProviderRegistry>;

  const validBody = {
    modelAlias: TEST_MODEL_ALIAS,
    messages: [{ role: 'user' as const, content: 'Hello' }],
  };

  beforeAll(async () => {
    providerRegistry = createE2eProviderRegistry();
    const context = await createE2eApp({ providerRegistry });
    app = context.app;
  });

  afterAll(async () => {
    await closeE2eApp(app);
  });

  describe('Authentication (x-gateway-key)', () => {
    it('should return 401 when x-gateway-key header is missing', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .send(validBody)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        code: expect.any(String),
        message: expect.stringMatching(/gateway-key/i),
      });
    });

    it('should return 403 when x-gateway-key is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_INVALID_GATEWAY_KEY)
        .send(validBody)
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        code: expect.any(String),
      });
    });

    it('should return 200 when x-gateway-key is valid', async () => {
      await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(E2E_POST_SUCCESS_STATUS);
    });
  });

  describe('POST /chat (non-streaming)', () => {
    it('should return gateway-format response for valid request', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body).toMatchObject({
        id: expect.stringMatching(/^gw_/),
        conversationId: expect.any(String),
        model: TEST_MODEL_ALIAS,
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

      expectGatewayUsage(response.body.usage, {
        inputTokens: TEST_INPUT_TOKENS,
        outputTokens: TEST_OUTPUT_TOKENS,
      });

      expect(providerRegistry.resolveMock).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS,
      );
    });

    it('should include x-request-id in response headers', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^req_/);
    });
  });

  describe('POST /chat/stream (streaming)', () => {
    it('should return SSE stream for valid request', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chatStream)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(200)
        .expect('Content-Type', /text\/event-stream/);

      const body = response.text;
      expect(body).toContain('event: meta');
      expect(body).toContain('event: delta');
      expect(body).toContain('event: done');
    });

    it('should return x-request-id in SSE headers', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chatStream)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when modelAlias is missing', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: expect.any(String),
        message: expect.stringMatching(/modelAlias/i),
      });
    });

    it('should return 400 when messages array is empty', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send({
          modelAlias: TEST_MODEL_ALIAS,
          messages: [],
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: expect.any(String),
      });
    });

    it('should reject request with more than 150 messages', async () => {
      const messages = Array(151).fill({ role: 'user', content: 'test' });

      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send({
          modelAlias: TEST_MODEL_ALIAS,
          messages,
        })
        .expect(400);

      expect(response.body.code).toBe(ApiErrorCode.VALIDATION_FAILED);
      expect(response.body.message).toMatch(/150|Too many messages/i);
    });

    it('should reject request when user content exceeds 3000 characters', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send({
          modelAlias: TEST_MODEL_ALIAS,
          messages: [{ role: 'user', content: 'a'.repeat(3001) }],
        })
        .expect(400);

      expect(response.body.code).toBe(ApiErrorCode.VALIDATION_FAILED);
      expect(response.body.message).toMatch(/content too long/i);
    });

    it('should return 400 when tool message is missing toolCallId', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send({
          modelAlias: TEST_MODEL_ALIAS,
          messages: [{ role: 'tool', content: 'result' }],
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: ApiErrorCode.VALIDATION_FAILED,
        requestId: expect.any(String),
      });
      expect(response.body.message).toMatch(/toolCallId/i);
    });

    it('should return 400 when tool message has empty toolCallId', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send({
          modelAlias: TEST_MODEL_ALIAS,
          messages: [{ role: 'tool', toolCallId: '', content: 'result' }],
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: ApiErrorCode.VALIDATION_FAILED,
        requestId: expect.any(String),
      });
      expect(response.body.message).toMatch(/toolCallId/i);
    });

    it('should return THINKING_NOT_SUPPORTED when thinkingEnabled is true without capability', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            capabilities: { thinking: false },
          }),
        },
        async ({ app: thinkingApp }) => {
          const response = await request(thinkingApp.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              modelAlias: TEST_MODEL_ALIAS,
              messages: [{ role: 'user', content: 'Think hard' }],
              params: { thinkingEnabled: true },
            })
            .expect(400);

          expect(response.body.code).toBe(ApiErrorCode.THINKING_NOT_SUPPORTED);
        },
      );
    });
  });

  describe('Rate limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry(),
          rateLimiter: createE2eBurstRateLimiter(2),
          config: {
            extra: { RATE_LIMIT_SMART_ENABLED: true },
          },
        },
        async ({ app }) => {
          const send = () =>
            request(app.getHttpServer())
              .post(E2E_ROUTES.chat)
              .set('x-gateway-key', E2E_GATEWAY_KEY)
              .send(validBody);

          await send().expect(E2E_POST_SUCCESS_STATUS);
          await send().expect(E2E_POST_SUCCESS_STATUS);

          const response = await send().expect(429);
          expect(response.body).toMatchObject({
            statusCode: 429,
            code: ApiErrorCode.RATE_LIMITED,
            requestId: expect.any(String),
          });
        },
      );
    });
  });

  describe('Error mapping', () => {
    // Dedicated app: provider.complete is mocked to reject for the whole describe.
    let errorApp: INestApplication;

    beforeAll(async () => {
      const registry = createE2eProviderRegistry();
      registry.provider.complete = jest.fn().mockRejectedValue(
        new HttpException(
          {
            code: ApiErrorCode.VALIDATION_FAILED,
            message: 'Invalid model',
            details: [],
          },
          HttpStatus.BAD_REQUEST,
        ),
      );

      const context = await createE2eApp({ providerRegistry: registry });
      errorApp = context.app;
    });

    afterAll(async () => {
      await closeE2eApp(errorApp);
    });

    it('should return 400 in gateway format when provider returns client error', async () => {
      const response = await request(errorApp.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: expect.any(String),
        message: expect.any(String),
        requestId: expect.any(String),
      });
    });
  });

  describe('Generation warnings (D5)', () => {
    it('should return warnings when frequencyPenalty is used with Anthropic provider', async () => {
      await withE2eApp(
        { providerRegistry: createE2eProviderRegistry() },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              modelAlias: TEST_MODEL_ALIAS,
              messages: [{ role: 'user', content: 'test' }],
              params: {
                frequencyPenalty: 0.5,
              },
            })
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(response.body.warnings).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                code: 'PARAM_IGNORED_BY_PROVIDER',
                field: 'params.frequencyPenalty',
              }),
            ]),
          );
        },
      );
    });

    it('should return warnings for presencePenalty and seed with Anthropic provider', async () => {
      await withE2eApp(
        { providerRegistry: createE2eProviderRegistry() },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              modelAlias: TEST_MODEL_ALIAS,
              messages: [{ role: 'user', content: 'test' }],
              params: {
                presencePenalty: 0.3,
                seed: 42,
              },
            })
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(response.body.warnings).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ field: 'params.presencePenalty' }),
              expect.objectContaining({ field: 'params.seed' }),
            ]),
          );
        },
      );
    });
  });

  describe('Fallback chain (smoke test)', () => {
    const primaryAlias = TEST_MODEL_ALIAS;
    const fallbackAlias = 'claude-sonnet';
    const brandedModelPolicy = {
      timeoutMs: TEST_TIMEOUT_MS,
      retry: {
        maxAttempts: TEST_MAX_ATTEMPTS,
        onStatus: [...TEST_RETRY_ON_STATUS],
      },
      params: {
        defaults: {},
        allowOverrides: [] as string[],
        bounds: {},
      },
    };

    it('should include effectiveModelAlias when fallback occurs', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eFallbackProviderRegistry({
            primaryAlias,
            fallbackAlias,
          }),
          config: {
            gatewayOptions: {
              models: {
                [primaryAlias]: {
                  fallback: fallbackAlias,
                  policy: brandedModelPolicy,
                },
                [fallbackAlias]: {
                  providerInstance: TEST_PROVIDER_INSTANCE_BRANDED,
                  modelId: TEST_MODEL_ID,
                  capabilities: { tools: true, streaming: true },
                  policy: brandedModelPolicy,
                },
              },
            },
          },
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              modelAlias: primaryAlias,
              messages: [{ role: 'user', content: 'Test' }],
            })
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(response.body.effectiveModelAlias).toBe(fallbackAlias);
          expect(response.body.output.text).toBe('Response from fallback');
        },
      );
    });
  });

  describe('Retry policy configuration (smoke)', () => {
    it('should use branded retry defaults when model policy omits explicit values', async () => {
      await withE2eApp(
        { providerRegistry: createE2eProviderRegistry() },
        async ({ app }) => {
          await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(validBody)
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(RETRY_POLICY_DEFAULTS.maxAttempts).toBe(TEST_MAX_ATTEMPTS);
          expect(RETRY_POLICY_DEFAULTS.timeoutMs).toBe(TEST_TIMEOUT_MS);
        },
      );
    });
  });
});
