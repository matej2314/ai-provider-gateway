import request from 'supertest';
import {
  createE2eApp,
  closeE2eApp,
  withE2eApp,
} from './helpers/create-e2e-app';
import {
  E2E_GATEWAY_KEY,
  E2E_INVALID_GATEWAY_KEY,
  E2E_ROUTES,
} from './helpers/e2e-constants';
import {
  createE2eDualModelGatewayConfig,
  E2E_SECOND_MODEL_ALIAS,
} from './helpers/e2e-gateway-config';
import { TEST_MODEL_ALIAS } from '../../src/common/mocks/test-constants';
import type { INestApplication } from '@nestjs/common';

describe('Facade Models API (E2E)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const context = await createE2eApp({
      config: createE2eDualModelGatewayConfig(),
    });
    app = context.app;
  });
  afterAll(async () => {
    await closeE2eApp(app);
  });
  describe('OpenAI — GET /openai/models', () => {
    it('should return 401 when Authorization header is missing', async () => {
      await request(app.getHttpServer())
        .get(E2E_ROUTES.openAiModels)
        .expect(401)
        .expect((res) => {
          expect(res.body.error).toMatchObject({
            type: expect.stringMatching(/authentication/i),
          });
        });
    });
    it('should return 403 when Bearer token is invalid', async () => {
      await request(app.getHttpServer())
        .get(E2E_ROUTES.openAiModels)
        .set('Authorization', `Bearer ${E2E_INVALID_GATEWAY_KEY}`)
        .expect(403);
    });
    it('should list both model aliases in OpenAI list format', async () => {
      const response = await request(app.getHttpServer())
        .get(E2E_ROUTES.openAiModels)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .expect(200);
      expect(response.body).toMatchObject({
        object: 'list',
        data: expect.any(Array),
      });
      const ids = response.body.data.map((row: { id: string }) => row.id);
      expect(ids).toEqual(
        expect.arrayContaining([TEST_MODEL_ALIAS, E2E_SECOND_MODEL_ALIAS]),
      );
      const anthropicRow = response.body.data.find(
        (row: { id: string; owned_by: string }) => row.id === TEST_MODEL_ALIAS,
      );
      const googleRow = response.body.data.find(
        (row: { id: string; owned_by: string }) =>
          row.id === E2E_SECOND_MODEL_ALIAS,
      );
      expect(anthropicRow.owned_by).toBe('anthropic');
      expect(googleRow.owned_by).toBe('google');
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });
  describe('OpenAI — GET /openai/models/:model', () => {
    it('should return model details for known alias', async () => {
      const response = await request(app.getHttpServer())
        .get(`${E2E_ROUTES.openAiModels}/${TEST_MODEL_ALIAS}`)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .expect(200);
      expect(response.body).toMatchObject({
        id: TEST_MODEL_ALIAS,
        object: 'model',
        owned_by: 'anthropic',
        created: expect.any(Number),
      });
    });
    it('should return 404 in OpenAI error shape for unknown alias', async () => {
      const response = await request(app.getHttpServer())
        .get(`${E2E_ROUTES.openAiModels}/does-not-exist`)
        .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
        .expect(404);
      expect(response.body.error.message).toMatch(
        /Model does-not-exist does not exist/,
      );
    });
  });
  describe('Anthropic — GET /anthropic/models', () => {
    it('should return 401 when x-api-key header is missing', async () => {
      await request(app.getHttpServer())
        .get(E2E_ROUTES.anthropicModels)
        .expect(401);
    });
    it('should return 403 when x-api-key is invalid', async () => {
      await request(app.getHttpServer())
        .get(E2E_ROUTES.anthropicModels)
        .set('x-api-key', E2E_INVALID_GATEWAY_KEY)
        .expect(403);
    });
    it('should list both aliases with Anthropic list shape', async () => {
      const response = await request(app.getHttpServer())
        .get(E2E_ROUTES.anthropicModels)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .expect(200);
      expect(response.body).toMatchObject({
        data: expect.any(Array),
        has_more: false,
      });
      const ids = response.body.data.map((row: { id: string }) => row.id);
      expect(ids).toEqual(
        expect.arrayContaining([TEST_MODEL_ALIAS, E2E_SECOND_MODEL_ALIAS]),
      );
      const row = response.body.data.find(
        (m: { id: string }) => m.id === E2E_SECOND_MODEL_ALIAS,
      );
      expect(row).toMatchObject({
        type: 'model',
        display_name: expect.any(String),
        created_at: expect.any(String),
      });
    });
  });
  describe('Anthropic — GET /anthropic/models/:model', () => {
    it('should return model dto for known alias', async () => {
      const response = await request(app.getHttpServer())
        .get(`${E2E_ROUTES.anthropicModels}/${E2E_SECOND_MODEL_ALIAS}`)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .expect(200);
      expect(response.body).toMatchObject({
        id: E2E_SECOND_MODEL_ALIAS,
        type: 'model',
        display_name: 'Fast Chat',
      });
    });
    it('should return 404 with Anthropic message for unknown alias', async () => {
      const response = await request(app.getHttpServer())
        .get(`${E2E_ROUTES.anthropicModels}/missing-alias`)
        .set('x-api-key', E2E_GATEWAY_KEY)
        .expect(404);
      expect(response.body.error.message).toMatch(
        /model missing-alias not found/,
      );
    });
  });
  describe('Cross-facade alias parity (config-driven)', () => {
    it('should expose the same alias set on OpenAI and Anthropic list endpoints', async () => {
      await withE2eApp(
        { config: createE2eDualModelGatewayConfig() },
        async ({ app }) => {
          const openAi = await request(app.getHttpServer())
            .get(E2E_ROUTES.openAiModels)
            .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
            .expect(200);
          const anthropic = await request(app.getHttpServer())
            .get(E2E_ROUTES.anthropicModels)
            .set('x-api-key', E2E_GATEWAY_KEY)
            .expect(200);
          const openAiIds = openAi.body.data
            .map((r: { id: string }) => r.id)
            .sort();
          const anthropicIds = anthropic.body.data
            .map((r: { id: string }) => r.id)
            .sort();
          expect(openAiIds).toEqual(anthropicIds);
        },
      );
    });
  });
});
