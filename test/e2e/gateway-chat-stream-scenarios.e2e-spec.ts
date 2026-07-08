import request from 'supertest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../../src/common/errors/api-error.code';
import {
  TEST_MODEL_ALIAS,
  TEST_MODEL_ID,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_INPUT_TOKENS_SMALL,
  TEST_OUTPUT_TOKENS_SMALL,
} from '../../src/common/mocks/test-constants';
import { withE2eApp } from './helpers/create-e2e-app';
import {
  createE2eFallbackProviderRegistry,
  createE2eProviderRegistry,
} from './helpers/e2e-provider-registry';
import { createE2eSaturatedConcurrentStreamLimiter } from './helpers/e2e-rate-limiter';
import { E2E_GATEWAY_KEY, E2E_ROUTES } from './helpers/e2e-constants';

describe('Gateway Chat Stream Scenarios (E2E)', () => {
  const validBody = {
    modelAlias: TEST_MODEL_ALIAS,
    messages: [{ role: 'user' as const, content: 'Stream please' }],
  };

  describe('SSE headers and events', () => {
    it('should set no-cache streaming headers', async () => {
      await withE2eApp(
        { providerRegistry: createE2eProviderRegistry() },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chatStream)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(validBody)
            .expect(200)
            .expect('Content-Type', /text\/event-stream/);

          expect(response.headers['cache-control']).toMatch(/no-cache/i);
          expect(response.headers['connection']).toMatch(/keep-alive/i);
        },
      );
    });

    it('should include usage and finishReason in done event', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            streamChunks: ['Done'],
          }),
        },
        async ({ app, providerRegistry }) => {
          providerRegistry.provider.stream = jest.fn().mockReturnValue({
            textStream: (function* () {
              yield 'Done';
            })(),
            getUsageMetadata: jest.fn().mockResolvedValue({
              inputTokens: TEST_INPUT_TOKENS_SMALL,
              outputTokens: TEST_OUTPUT_TOKENS_SMALL,
            }),
            getStopReason: jest.fn().mockResolvedValue('end_turn'),
            getSystemFingerprint: jest.fn().mockResolvedValue('fp_test_123'),
          });

          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chatStream)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(validBody)
            .expect(200);

          expect(response.text).toContain('event: done');
          expect(response.text).toMatch(/"usage"/);
          expect(response.text).toMatch(/"finishReason"/);
          expect(response.text).toContain('fp_test_123');
        },
      );
    });

    it('should include warnings in done event when ignored params are sent', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({
            streamChunks: ['Hi'],
          }),
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chatStream)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              modelAlias: TEST_MODEL_ALIAS,
              messages: [{ role: 'user', content: 'Stream' }],
              params: { frequencyPenalty: 0.5 },
            })
            .expect(200);

          expect(response.text).toContain('event: done');
          expect(response.text).toMatch(/"warnings"/);
          expect(response.text).toMatch(/params\.frequencyPenalty/);
        },
      );
    });
  });

  describe('meta with effectiveModelAlias after fallback', () => {
    const primaryAlias = TEST_MODEL_ALIAS;
    const fallbackAlias = 'claude-sonnet';

    it('should emit effectiveModelAlias in meta when fallback is used', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eFallbackProviderRegistry({
            primaryAlias,
            fallbackAlias,
          }),
          config: {
            gatewayOptions: {
              models: {
                [primaryAlias]: { fallback: fallbackAlias },
                [fallbackAlias]: {
                  providerInstance: TEST_PROVIDER_INSTANCE_BRANDED,
                  modelId: TEST_MODEL_ID,
                  capabilities: { tools: true, streaming: true },
                },
              },
            },
          },
        },
        async ({ app, providerRegistry }) => {
          // stream() is invoked synchronously and meta is emitted before textStream
          // is consumed. mockRejectedValue returns a Promise, so meta for the primary
          // alias is sent first and blocks fallback from re-emitting meta with
          // effectiveModelAlias. A synchronous throw fails before meta emission.
          providerRegistry.provider.stream = jest
            .fn()
            .mockImplementation(() => {
              throw new HttpException(
                {
                  code: 'PROVIDER_ERROR',
                  message: 'Server error',
                  details: [],
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
              );
            });

          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chatStream)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({ ...validBody, modelAlias: primaryAlias })
            .expect(200);

          expect(response.text).toContain('event: meta');
          expect(response.text).toMatch(/"effectiveModelAlias"/);
          expect(response.text).toContain(fallbackAlias);
        },
      );
    });
  });

  describe('STREAMING_NOT_SUPPORTED', () => {
    it('should return 400 when model has streaming disabled', async () => {
      await withE2eApp(
        { providerRegistry: createE2eProviderRegistry() },
        async ({ app, providerRegistry }) => {
          const originalResolve =
            providerRegistry.resolveMock.getMockImplementation()!;

          providerRegistry.resolveMock.mockImplementation((alias: string) => ({
            ...originalResolve(alias),
            capabilities: { tools: true, streaming: false },
          }));

          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chatStream)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(validBody)
            .expect(400);

          expect(response.body).toMatchObject({
            statusCode: 400,
            code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
          });
        },
      );
    });
  });

  describe('Concurrent stream rate limit', () => {
    it('should return 429 when concurrent streams are saturated', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eProviderRegistry({ hangStream: true }),
          rateLimiter: createE2eSaturatedConcurrentStreamLimiter(),
          config: { extra: { RATE_LIMIT_SMART_ENABLED: true } },
        },
        async ({ app }) => {
          const agent = request(app.getHttpServer());
          const first = agent
            .post(E2E_ROUTES.chatStream)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(validBody);

          const second = agent
            .post(E2E_ROUTES.chatStream)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(validBody);

          await Promise.all([first, second]);

          const response = await agent
            .post(E2E_ROUTES.chatStream)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(validBody)
            .expect(429);

          expect(response.body.code).toBe(ApiErrorCode.RATE_LIMITED);
        },
      );
    });
  });
});
