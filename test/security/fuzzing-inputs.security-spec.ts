import type { INestApplication } from '@nestjs/common';
import * as fc from 'fast-check';
import request from 'supertest';
import { TEST_MODEL_ALIAS } from '../../src/common/mocks/test-constants';
import { E2E_GATEWAY_KEY, E2E_ROUTES } from '../e2e/helpers/e2e-constants';
import { createE2eProviderRegistry } from '../e2e/helpers/e2e-provider-registry';
import {
  closeSecurityApp,
  createSecurityApp,
} from './helpers/create-security-app';
import { expectNoSecretsDisclosed } from './helpers/scan-response-for-secrets';

const FC_NUM_RUNS = 75;
const FC_OPTIONS: fc.Parameters<unknown> = { numRuns: FC_NUM_RUNS };

const VALID_USER_MESSAGE = { role: 'user' as const, content: 'fuzz probe' };

/**
 * Names that collide with Object.prototype or are stripped by class-transformer
 * before forbidNonWhitelisted — not representative user-supplied field names.
 */
const NON_FUZZABLE_OBJECT_KEYS = new Set([
  ...Object.getOwnPropertyNames(Object.prototype),
  '__proto__',
  'prototype',
]);

const CHAT_REQUEST_DTO_KEYS = new Set([
  'modelAlias',
  'messages',
  'params',
  'conversationId',
  'tooling',
  'metadata',
]);

function isFuzzableUnknownTopLevelField(field: string): boolean {
  return (
    !CHAT_REQUEST_DTO_KEYS.has(field) && !NON_FUZZABLE_OBJECT_KEYS.has(field)
  );
}

function isFuzzableModelAlias(alias: string): boolean {
  return !NON_FUZZABLE_OBJECT_KEYS.has(alias);
}

function expectNoServerError(status: number): void {
  expect(status).toBeLessThan(500);
  expect(status).not.toBe(500);
}

function assertSafeFuzzResponse(response: request.Response): void {
  expectNoServerError(response.status);
  if (response.status >= 400) {
    expectNoSecretsDisclosed(response.body);
  }
}

describe('Security: Fuzzing Inputs (Property-Based)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const providerRegistry = createE2eProviderRegistry();
    const context = await createSecurityApp({ providerRegistry });
    app = context.app;
  });

  afterAll(async () => {
    await closeSecurityApp(app);
  });

  describe('Native gateway POST /api/v1/chat', () => {
    it('should never return 5xx for arbitrary modelAlias strings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string().filter(isFuzzableModelAlias),
          async (modelAlias) => {
            const response = await request(app.getHttpServer())
              .post(E2E_ROUTES.chat)
              .set('x-gateway-key', E2E_GATEWAY_KEY)
              .send({
                modelAlias,
                messages: [VALID_USER_MESSAGE],
              });

            assertSafeFuzzResponse(response);
            expectNoServerError(response.status);
          },
        ),
        FC_OPTIONS,
      );
    });

    it('should return 400 for messages array size violations (0 or >150 elements)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.constant(0), fc.integer({ min: 151, max: 200 })),
          async (messageCount) => {
            const messages = Array.from({ length: messageCount }, () => ({
              ...VALID_USER_MESSAGE,
            }));

            const response = await request(app.getHttpServer())
              .post(E2E_ROUTES.chat)
              .set('x-gateway-key', E2E_GATEWAY_KEY)
              .send({
                modelAlias: TEST_MODEL_ALIAS,
                messages,
              })
              .expect(400);

            assertSafeFuzzResponse(response);
          },
        ),
        FC_OPTIONS,
      );
    });

    it('should return 400 for metadata with non-primitive values', async () => {
      const nonPrimitiveMetadata = fc.oneof(
        fc.constant({ nested: { object: true } }),
        fc.constant({ list: [1, 2, 3] }),
        fc.record({
          key: fc.oneof(
            fc.constant(null),
            fc.constant({ deep: true }),
            fc.array(fc.string()),
          ),
        }),
      );

      await fc.assert(
        fc.asyncProperty(nonPrimitiveMetadata, async (metadata) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              modelAlias: TEST_MODEL_ALIAS,
              messages: [VALID_USER_MESSAGE],
              metadata,
            })
            .expect(400);

          assertSafeFuzzResponse(response);
        }),
        FC_OPTIONS,
      );
    });

    it('should return 400 for invalid message role values', async () => {
      const invalidRole = fc
        .string({ minLength: 1, maxLength: 32 })
        .filter((role) => !['user', 'assistant', 'tool'].includes(role));

      await fc.assert(
        fc.asyncProperty(invalidRole, async (role) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              modelAlias: TEST_MODEL_ALIAS,
              messages: [{ role, content: 'fuzz probe' }],
            })
            .expect(400);

          assertSafeFuzzResponse(response);
        }),
        FC_OPTIONS,
      );
    });

    it('should return 400 for out-of-range ChatParamsDto values', async () => {
      const invalidParams = fc.oneof(
        fc.record({
          temperature: fc.oneof(
            fc.double({ min: -100, max: -0.001, noNaN: true }),
            fc.double({ min: 2.001, max: 100, noNaN: true }),
          ),
        }),
        fc.record({
          maxOutputTokens: fc.oneof(
            fc.integer({ max: 0 }),
            fc.integer({ min: 8193, max: 100_000 }),
          ),
        }),
      );

      await fc.assert(
        fc.asyncProperty(invalidParams, async (params) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              modelAlias: TEST_MODEL_ALIAS,
              messages: [VALID_USER_MESSAGE],
              params,
            })
            .expect(400);

          assertSafeFuzzResponse(response);
        }),
        FC_OPTIONS,
      );
    });

    it('should return 400 for unknown top-level fields (forbidNonWhitelisted)', async () => {
      const extraField = fc.record({
        name: fc
          .string({ minLength: 1, maxLength: 24 })
          .filter(isFuzzableUnknownTopLevelField),
        value: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
      });

      await fc.assert(
        fc.asyncProperty(extraField, async ({ name, value }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              modelAlias: TEST_MODEL_ALIAS,
              messages: [VALID_USER_MESSAGE],
              [name]: value,
            })
            .expect(400);

          assertSafeFuzzResponse(response);
        }),
        FC_OPTIONS,
      );
    });
  });

  describe('OpenAI facade POST /api/v1/openai/chat/completions', () => {
    it('should never return 5xx for fuzzed OpenAI completion bodies', async () => {
      const openAiBody = fc.record({
        model: fc.string(),
        messages: fc.oneof(
          fc.constant([]),
          fc.array(
            fc.record({
              role: fc.constantFrom('user', 'assistant', 'system', 'invalid'),
              content: fc.string({ maxLength: 64 }),
            }),
            { minLength: 0, maxLength: 5 },
          ),
          fc.array(
            fc.record({
              role: fc.constantFrom('user', 'assistant'),
              content: fc.string({ maxLength: 64 }),
            }),
            { minLength: 1, maxLength: 160 },
          ),
        ),
        temperature: fc.option(fc.double({ min: -5, max: 5, noNaN: true }), {
          nil: undefined,
        }),
        max_tokens: fc.option(fc.integer({ min: -10, max: 10_000_000 }), {
          nil: undefined,
        }),
        stream: fc.option(fc.boolean(), { nil: undefined }),
        injectedField: fc.option(fc.string(), { nil: undefined }),
      });

      await fc.assert(
        fc.asyncProperty(openAiBody, async (body) => {
          const payload = Object.fromEntries(
            Object.entries(body).filter(([, value]) => value !== undefined),
          );

          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.openAiCompletions)
            .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
            .send(payload);

          assertSafeFuzzResponse(response);
          expectNoServerError(response.status);
        }),
        FC_OPTIONS,
      );
    });
  });

  describe('Payload size limits', () => {
    it('should reject payloads larger than 1mb before DTO validation', async () => {
      const oversizedContent = 'x'.repeat(1024 * 1024 + 1);

      const response = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .set('Content-Type', 'application/json')
        .send(
          JSON.stringify({
            modelAlias: TEST_MODEL_ALIAS,
            messages: [{ role: 'user', content: oversizedContent }],
          }),
        )
        .expect(413);

      assertSafeFuzzResponse(response);
    });
  });
});
