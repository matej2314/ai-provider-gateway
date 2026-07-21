import { HttpException, HttpStatus } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { Response } from 'supertest';
import request from 'supertest';
import { ApiErrorCode } from '../../src/common/errors/api-error.code';
import { TEST_MODEL_ALIAS } from '../../src/common/mocks/test-constants';
import {
  createAnthropicRequestBody,
  E2E_API_PREFIX,
  E2E_GATEWAY_KEY,
  E2E_INVALID_GATEWAY_KEY,
  E2E_ROUTES,
} from '../e2e/helpers/e2e-constants';
import { createE2eProviderRegistry } from '../e2e/helpers/e2e-provider-registry';
import {
  closeSecurityApp,
  createSecurityApp,
  withSecurityApp,
} from './helpers/create-security-app';
import {
  expectNoSecretsDisclosed,
  expectNoSecretsInHeaders,
} from './helpers/scan-response-for-secrets';

const nativeChatBody = {
  modelAlias: TEST_MODEL_ALIAS,
  messages: [{ role: 'user' as const, content: 'disclosure probe' }],
};

const openAiBody = {
  model: TEST_MODEL_ALIAS,
  messages: [{ role: 'user' as const, content: 'disclosure probe' }],
};

const anthropicBody = createAnthropicRequestBody(TEST_MODEL_ALIAS);

function assertSafeErrorBody(response: Response): void {
  expectNoSecretsDisclosed(response.body);
  expectNoSecretsInHeaders(response.headers);
}

describe('Security: Information Disclosure', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const providerRegistry = createE2eProviderRegistry();
    const context = await createSecurityApp({ providerRegistry });
    app = context.app;
  });

  afterAll(async () => {
    await closeSecurityApp(app);
  });

  describe('Native gateway (GlobalExceptionFilter)', () => {
    it('should not leak secrets on 403 invalid x-gateway-key', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_INVALID_GATEWAY_KEY)
        .send(nativeChatBody)
        .expect(403);

      assertSafeErrorBody(response);
      expect(response.body).toMatchObject({
        statusCode: 403,
        code: ApiErrorCode.GATEWAY_KEY_INVALID,
        details: [],
      });
    });

    it('should not leak internal paths on 401 missing x-gateway-key', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .send(nativeChatBody)
        .expect(401);

      assertSafeErrorBody(response);
      expect(response.body).toMatchObject({
        statusCode: 401,
        code: ApiErrorCode.GATEWAY_KEY_MISSING,
        requestId: expect.any(String),
      });
    });

    it('should not leak stack traces on 400 validation error (forbidNonWhitelisted)', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send({
          ...nativeChatBody,
          injectedSecretField: 'ANTHROPIC_API_KEY=sk-ant-leaked',
        })
        .expect(400);

      assertSafeErrorBody(response);
      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.any(String),
        requestId: expect.any(String),
      });
      expect(response.body.details ?? []).toEqual([]);
    });

    it('should not leak provider secrets on 500 from unhandled provider error', async () => {
      await withSecurityApp(
        {
          providerRegistry: (() => {
            const registry = createE2eProviderRegistry();
            registry.provider.complete = jest
              .fn()
              .mockRejectedValue(
                new Error(
                  'Provider failure sk-test-api-key at src/providers/anthropic/secret.adapter.ts:99',
                ),
              );
            return registry;
          })(),
        },
        async ({ app: errorApp }) => {
          const response = await request(errorApp.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(nativeChatBody)
            .expect(500);

          assertSafeErrorBody(response);
          expect(response.body).toMatchObject({
            statusCode: 500,
            code: ApiErrorCode.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred',
            details: [],
          });
        },
      );
    });

    it('should keep details empty on auth errors (no provider config objects)', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_INVALID_GATEWAY_KEY)
        .send(nativeChatBody)
        .expect(403);

      expect(response.body.details).toEqual([]);
      assertSafeErrorBody(response);
    });
  });

  describe('OpenAI facade (OpenAiExceptionFilter)', () => {
    it('should not leak gateway allowList values on 401 missing Bearer token', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .send(openAiBody)
        .expect(401);

      assertSafeErrorBody(response);
      expect(response.body).toMatchObject({
        error: {
          message: expect.any(String),
          type: 'authentication_error',
          code: ApiErrorCode.GATEWAY_KEY_MISSING,
        },
      });
      expect(JSON.stringify(response.body)).not.toContain(E2E_GATEWAY_KEY);
    });

    it('may expose x-request-id without leaking provider API keys in headers', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .send(openAiBody)
        .expect(401);

      assertSafeErrorBody(response);
      if (response.headers['x-request-id']) {
        expect(typeof response.headers['x-request-id']).toBe('string');
      }
    });

    it('should not leak secrets on 500 provider server error', async () => {
      await withSecurityApp(
        {
          providerRegistry: (() => {
            const registry = createE2eProviderRegistry();
            registry.provider.complete = jest.fn().mockRejectedValue(
              new HttpException(
                {
                  code: ApiErrorCode.INTERNAL_SERVER_ERROR,
                  message: 'Internal server error',
                  details: [{ providerApiKey: 'sk-test-api-key' }],
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
              ),
            );
            return registry;
          })(),
        },
        async ({ app: errorApp }) => {
          const response = await request(errorApp.getHttpServer())
            .post(E2E_ROUTES.openAiCompletions)
            .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
            .send(openAiBody)
            .expect(500);

          assertSafeErrorBody(response);
          expect(response.body.error).toMatchObject({
            message: expect.any(String),
            type: 'server_error',
          });
        },
      );
    });
  });

  describe('Anthropic facade (AnthropicExceptionFilter)', () => {
    it('should not leak gateway allowList values on 403 invalid x-api-key', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', E2E_INVALID_GATEWAY_KEY)
        .send(anthropicBody)
        .expect(403);

      assertSafeErrorBody(response);
      expect(response.body).toMatchObject({
        type: 'error',
        error: {
          type: 'authentication_error',
          message: expect.any(String),
        },
      });
      expect(JSON.stringify(response.body)).not.toContain(E2E_GATEWAY_KEY);
    });
  });

  describe('Routing and cross-surface consistency', () => {
    it('should not disclose file paths on 404 unknown route', async () => {
      const response = await request(app.getHttpServer())
        .get(`${E2E_API_PREFIX}/nonexistent-route`)
        .expect(404);

      assertSafeErrorBody(response);
      expect(response.body).toMatchObject({
        statusCode: 404,
        message: expect.any(String),
      });
    });

    it('should apply consistent non-disclosure across native, OpenAI, and Anthropic auth errors', async () => {
      const nativeMissingKey = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .send(nativeChatBody)
        .expect(401);

      const openAiMissingAuth = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .send(openAiBody)
        .expect(401);

      const anthropicMissingKey = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .send(anthropicBody)
        .expect(401);

      for (const response of [
        nativeMissingKey,
        openAiMissingAuth,
        anthropicMissingKey,
      ]) {
        assertSafeErrorBody(response);
        expect(JSON.stringify(response.body)).not.toMatch(
          /node_modules|\.ts:\d+/,
        );
      }
    });
  });
});
