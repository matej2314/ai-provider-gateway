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

describe('Native Models API (E2E)', () => {
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

  describe('GET /models', () => {
    it('should return 401 when X-Gateway-Key is missing', async () => {
      await request(app.getHttpServer())
        .get(E2E_ROUTES.models)
        .expect(401)
        .expect((res) => {
          expect(res.body.code).toBe('GATEWAY_KEY_MISSING');
        });
    });

    it('should return 403 when X-Gateway-Key is invalid', async () => {
      await request(app.getHttpServer())
        .get(E2E_ROUTES.models)
        .set('X-Gateway-Key', E2E_INVALID_GATEWAY_KEY)
        .expect(403);
    });

    it('should list both aliases in gateway native format', async () => {
      const response = await request(app.getHttpServer())
        .get(E2E_ROUTES.models)
        .set('X-Gateway-Key', E2E_GATEWAY_KEY)
        .expect(200);

      expect(response.body.models).toEqual(expect.any(Array));
      const aliases = response.body.models.map(
        (row: { modelAlias: string }) => row.modelAlias,
      );
      expect(aliases).toEqual(
        expect.arrayContaining([TEST_MODEL_ALIAS, E2E_SECOND_MODEL_ALIAS]),
      );

      const anthropicRow = response.body.models.find(
        (row: { modelAlias: string }) => row.modelAlias === TEST_MODEL_ALIAS,
      );
      expect(anthropicRow).toMatchObject({
        providerType: 'anthropic',
        modelId: expect.any(String),
      });
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('GET /models/:modelAlias', () => {
    it('should return model details for known alias', async () => {
      const response = await request(app.getHttpServer())
        .get(`${E2E_ROUTES.models}/${TEST_MODEL_ALIAS}`)
        .set('X-Gateway-Key', E2E_GATEWAY_KEY)
        .expect(200);

      expect(response.body).toMatchObject({
        modelAlias: TEST_MODEL_ALIAS,
        providerType: 'anthropic',
        modelId: expect.any(String),
        providerInstance: expect.any(String),
      });
    });

    it('should return 404 with ErrorEnvelope for unknown alias', async () => {
      const response = await request(app.getHttpServer())
        .get(`${E2E_ROUTES.models}/does-not-exist`)
        .set('X-Gateway-Key', E2E_GATEWAY_KEY)
        .expect(404);

      expect(response.body).toMatchObject({
        code: 'MODEL_ALIAS_NOT_FOUND',
        message: expect.stringMatching(/does-not-exist/),
        requestId: expect.any(String),
      });
    });
  });

  describe('Cross-surface alias parity', () => {
    it('should expose the same alias set on native, OpenAI and Anthropic list endpoints', async () => {
      await withE2eApp(
        { config: createE2eDualModelGatewayConfig() },
        async ({ app }) => {
          const native = await request(app.getHttpServer())
            .get(E2E_ROUTES.models)
            .set('X-Gateway-Key', E2E_GATEWAY_KEY)
            .expect(200);
          const openAi = await request(app.getHttpServer())
            .get(E2E_ROUTES.openAiModels)
            .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
            .expect(200);
          const anthropic = await request(app.getHttpServer())
            .get(E2E_ROUTES.anthropicModels)
            .set('x-api-key', E2E_GATEWAY_KEY)
            .expect(200);

          const nativeIds = native.body.models
            .map((r: { modelAlias: string }) => r.modelAlias)
            .sort();
          const openAiIds = openAi.body.data
            .map((r: { id: string }) => r.id)
            .sort();
          const anthropicIds = anthropic.body.data
            .map((r: { id: string }) => r.id)
            .sort();

          expect(nativeIds).toEqual(openAiIds);
          expect(nativeIds).toEqual(anthropicIds);
        },
      );
    });
  });
});
