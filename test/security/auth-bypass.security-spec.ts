import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApiErrorCode } from '../../src/common/errors/api-error.code';
import { TEST_MODEL_ALIAS } from '../../src/common/mocks/test-constants';
import {
  createAnthropicRequestBody,
  E2E_GATEWAY_KEY,
  E2E_INVALID_GATEWAY_KEY,
  E2E_POST_SUCCESS_STATUS,
  E2E_ROUTES,
} from '../e2e/helpers/e2e-constants';
import { createE2eProviderRegistry } from '../e2e/helpers/e2e-provider-registry';
import {
  closeSecurityApp,
  createSecurityApp,
} from './helpers/create-security-app';

describe('Security: Auth Bypass Attempts', () => {
  let app: INestApplication;

  const nativeChatBody = {
    modelAlias: TEST_MODEL_ALIAS,
    messages: [{ role: 'user' as const, content: 'test' }],
  };

  const openAiBody = {
    model: TEST_MODEL_ALIAS,
    messages: [{ role: 'user' as const, content: 'test' }],
  };

  const anthropicBody = createAnthropicRequestBody(TEST_MODEL_ALIAS);

  beforeAll(async () => {
    const providerRegistry = createE2eProviderRegistry();
    const context = await createSecurityApp({ providerRegistry });
    app = context.app;
  });

  afterAll(async () => {
    await closeSecurityApp(app);
  });

  describe('Gateway Chat API (x-gateway-key)', () => {
    it('should reject array injection with valid key at index 1', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', [E2E_INVALID_GATEWAY_KEY, E2E_GATEWAY_KEY] as any)
        .send(nativeChatBody)
        .expect(403);

      expect(response.body.code).toBe(ApiErrorCode.GATEWAY_KEY_INVALID);
    });

    it('should reject array injection when Express coalesces values (comma-joined)', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', [E2E_GATEWAY_KEY, E2E_INVALID_GATEWAY_KEY] as any)
        .send(nativeChatBody)
        .expect(403);

      expect(response.body.code).toBe(ApiErrorCode.GATEWAY_KEY_INVALID);
    });

    it('should handle case-insensitive header names (X-Gateway-Key vs x-gateway-key)', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('X-GATEWAY-KEY', E2E_GATEWAY_KEY)
        .send(nativeChatBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body).toHaveProperty('id');
    });

    it('should trim whitespace from x-gateway-key value', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', `  ${E2E_GATEWAY_KEY}  `)
        .send(nativeChatBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body).toHaveProperty('id');
    });

    it('should reject percent-encoded gateway key (no URL decoding in guard)', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', 'gw%5fkey%5f123')
        .send(nativeChatBody)
        .expect(403);

      expect(response.body.code).toBe(ApiErrorCode.GATEWAY_KEY_INVALID);
    });

    it('should reject empty string as x-gateway-key', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', '')
        .send(nativeChatBody)
        .expect(401);

      expect(response.body.code).toBe(ApiErrorCode.GATEWAY_KEY_MISSING);
    });

    it('should reject whitespace-only string as x-gateway-key', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', '   ')
        .send(nativeChatBody)
        .expect(401);

      expect(response.body.code).toBe(ApiErrorCode.GATEWAY_KEY_MISSING);
    });
  });

  describe('OpenAI Integration (Authorization: Bearer)', () => {
    it('should reject Bearer token as array when first value is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', [
          `Bearer ${E2E_INVALID_GATEWAY_KEY}`,
          `Bearer ${E2E_GATEWAY_KEY}`,
        ] as any)
        .send(openAiBody)
        .expect(403);

      expect(response.body.error).toMatchObject({
        type: 'authentication_error',
        code: ApiErrorCode.GATEWAY_KEY_INVALID,
      });
    });

    it('should reject Bearer token without "Bearer " prefix', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', E2E_GATEWAY_KEY)
        .send(openAiBody)
        .expect(401);

      expect(response.body.error).toMatchObject({
        type: 'authentication_error',
        code: ApiErrorCode.GATEWAY_KEY_MISSING,
      });
    });

    it('should trim whitespace in Bearer token', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `Bearer   ${E2E_GATEWAY_KEY}  `)
        .send(openAiBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body).toHaveProperty('id');
    });

    it('should accept case-insensitive Bearer prefix (bearer vs Bearer)', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('Authorization', `bearer ${E2E_GATEWAY_KEY}`)
        .send(openAiBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body).toHaveProperty('id');
    });
  });

  describe('Anthropic Integration (x-api-key)', () => {
    it('should reject x-api-key as array when first value is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', [E2E_INVALID_GATEWAY_KEY, E2E_GATEWAY_KEY] as any)
        .send(anthropicBody)
        .expect(403);

      expect(response.body).toMatchObject({
        type: 'error',
        error: {
          type: 'authentication_error',
        },
      });
    });

    it('should trim whitespace in x-api-key', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', `  ${E2E_GATEWAY_KEY}  `)
        .send(anthropicBody)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(response.body).toHaveProperty('id');
    });

    it('should reject empty x-api-key', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.anthropicMessages)
        .set('x-api-key', '')
        .send(anthropicBody)
        .expect(401);

      expect(response.body).toMatchObject({
        type: 'error',
        error: {
          type: 'authentication_error',
        },
      });
    });
  });

  describe('Cross-auth bypass attempts', () => {
    it('should NOT accept x-gateway-key on OpenAI endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.openAiCompletions)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(openAiBody)
        .expect(401);

      expect(response.body.error).toMatchObject({
        type: 'authentication_error',
        code: ApiErrorCode.GATEWAY_KEY_MISSING,
      });
    });

    it('should NOT accept Bearer token on Gateway endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .send(nativeChatBody)
        .expect(401);

      expect(response.body.code).toBe(ApiErrorCode.GATEWAY_KEY_MISSING);
    });

    it('should NOT accept x-api-key on Gateway endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .send(nativeChatBody)
        .expect(401);

      expect(response.body.code).toBe(ApiErrorCode.GATEWAY_KEY_MISSING);
    });
  });
});
