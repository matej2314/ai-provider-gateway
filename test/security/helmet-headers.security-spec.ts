import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_MODEL_ALIAS } from '../../src/common/mocks/test-constants';
import { E2E_API_PREFIX, E2E_ROUTES } from '../e2e/helpers/e2e-constants';
import { createE2eProviderRegistry } from '../e2e/helpers/e2e-provider-registry';
import {
  closeSecurityApp,
  createSecurityApp,
} from './helpers/create-security-app';

const HEALTH_ROUTE = `${E2E_API_PREFIX}/health`;
const METRICS_ROUTE = '/metrics';
const NOT_FOUND_ROUTE = `${E2E_API_PREFIX}/nonexistent`;

const nativeChatBody = {
  modelAlias: TEST_MODEL_ALIAS,
  messages: [{ role: 'user' as const, content: 'helmet probe' }],
};

function getResponseHeaders(
  headers: request.Response['headers'],
): Record<string, string | string[] | undefined> {
  return headers;
}

function expectHelmetSecurityHeaders(
  headers: Record<string, string | string[] | undefined>,
): void {
  expect(headers['x-frame-options']).toBeDefined();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['strict-transport-security']).toMatch(/max-age=/i);
  expect(headers['x-powered-by']).toBeUndefined();
  expect(headers['content-security-policy']).toBeUndefined();
  expect(headers['cross-origin-embedder-policy']).toBeUndefined();
}

describe('Security: Helmet Headers', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const providerRegistry = createE2eProviderRegistry();
    const context = await createSecurityApp({
      applyHelmet: true,
      providerRegistry,
    });
    app = context.app;
  });

  afterAll(async () => {
    await closeSecurityApp(app);
  });

  describe('Successful responses (200)', () => {
    it('should include X-Frame-Options from helmet on GET /api/v1/health', async () => {
      const response = await request(app.getHttpServer())
        .get(HEALTH_ROUTE)
        .expect(200);

      expect(getResponseHeaders(response.headers)['x-frame-options']).toBe(
        'SAMEORIGIN',
      );
    });

    it('should include X-Content-Type-Options: nosniff on GET /api/v1/health', async () => {
      const response = await request(app.getHttpServer())
        .get(HEALTH_ROUTE)
        .expect(200);

      expect(
        getResponseHeaders(response.headers)['x-content-type-options'],
      ).toBe('nosniff');
    });

    it('should include Strict-Transport-Security on GET /api/v1/health', async () => {
      const response = await request(app.getHttpServer())
        .get(HEALTH_ROUTE)
        .expect(200);

      expect(
        getResponseHeaders(response.headers)['strict-transport-security'],
      ).toMatch(/max-age=\d+/i);
    });

    it('should omit X-Powered-By (disabled in setup.app.ts)', async () => {
      const health = await request(app.getHttpServer())
        .get(HEALTH_ROUTE)
        .expect(200);

      const metrics = await request(app.getHttpServer())
        .get(METRICS_ROUTE)
        .expect(200);

      expect(
        getResponseHeaders(health.headers)['x-powered-by'],
      ).toBeUndefined();
      expect(
        getResponseHeaders(metrics.headers)['x-powered-by'],
      ).toBeUndefined();
    });

    it('should not set Content-Security-Policy (disabled in main.ts for API)', async () => {
      const response = await request(app.getHttpServer())
        .get(HEALTH_ROUTE)
        .expect(200);

      expect(
        getResponseHeaders(response.headers)['content-security-policy'],
      ).toBeUndefined();
    });

    it('should not set Cross-Origin-Embedder-Policy (crossOriginEmbedderPolicy: false)', async () => {
      const response = await request(app.getHttpServer())
        .get(HEALTH_ROUTE)
        .expect(200);

      expect(
        getResponseHeaders(response.headers)['cross-origin-embedder-policy'],
      ).toBeUndefined();
    });
  });

  describe('Error responses (401, 404)', () => {
    it('should apply the same helmet headers on POST /api/v1/chat without gateway key (401)', async () => {
      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .send(nativeChatBody)
        .expect(401);

      expectHelmetSecurityHeaders(getResponseHeaders(response.headers));
    });

    it('should apply the same helmet headers on GET /api/v1/nonexistent (404)', async () => {
      const response = await request(app.getHttpServer())
        .get(NOT_FOUND_ROUTE)
        .expect(404);

      expectHelmetSecurityHeaders(getResponseHeaders(response.headers));
    });
  });
});
