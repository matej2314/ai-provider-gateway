import request from 'supertest';
import { ApiErrorCode } from '../../src/common/errors/api-error.code';
import { withE2eApp } from './helpers/create-e2e-app';
import { createE2eOpenAiProviderRegistry } from './helpers/e2e-provider-registry';
import {
  E2E_GATEWAY_KEY,
  E2E_OPENAI_MODEL_ALIAS,
  E2E_OPENAI_PROVIDER_INSTANCE,
  E2E_POST_SUCCESS_STATUS,
  E2E_ROUTES,
} from './helpers/e2e-constants';
import { parseGatewaySseEvents } from '../integration/helpers/parse-gateway-sse-events';
import {
  asInputTokens,
  asOutputTokens,
  asSystemFingerprint,
} from '../../src/common/types/branded.types';

describe('Gateway Chat API — OpenAI provider (E2E)', () => {
  const validBody = {
    modelAlias: E2E_OPENAI_MODEL_ALIAS,
    messages: [{ role: 'user' as const, content: 'Hello' }],
  };

  describe('Happy path — POST /chat', () => {
    it('should return gateway-format response and call provider.complete', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eOpenAiProviderRegistry({
            completeResponse: {
              text: 'OpenAI mocked reply',
              usage: {
                inputTokens: asInputTokens(12),
                outputTokens: asOutputTokens(8),
              },
            },
          }),
        },
        async ({ app, providerRegistry }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(validBody)
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(response.body).toMatchObject({
            model: E2E_OPENAI_MODEL_ALIAS,
            provider: E2E_OPENAI_PROVIDER_INSTANCE,
            output: {
              type: 'text',
              text: 'OpenAI mocked reply',
            },
            usage: {
              inputTokens: 12,
              outputTokens: 8,
            },
          });
          expect(
            (providerRegistry.provider as unknown as Record<string, unknown>)
              .complete,
          ).toHaveBeenCalledTimes(1);
        },
      );
    });

    it('should pass through systemFingerprint from provider', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eOpenAiProviderRegistry({
            completeResponse: {
              systemFingerprint: asSystemFingerprint('fp_openai_e2e'),
            },
          }),
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(validBody)
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(response.body.systemFingerprint).toBe('fp_openai_e2e');
        },
      );
    });

    it('should pass through thinkingContent from provider', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eOpenAiProviderRegistry({
            completeResponse: { thinkingContent: 'reasoning trace' },
          }),
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(validBody)
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(response.body.thinkingContent).toBe('reasoning trace');
        },
      );
    });
  });

  describe('Generation warnings — OpenAI-specific', () => {
    it('should warn when topK is sent to openai provider', async () => {
      await withE2eApp(
        { providerRegistry: createE2eOpenAiProviderRegistry() },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              ...validBody,
              params: { topK: 40 },
            })
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(response.body.warnings).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                code: 'PARAM_IGNORED_BY_PROVIDER',
                field: 'params.topK',
              }),
            ]),
          );
        },
      );
    });

    it('should warn when frequencyPenalty is ignored on Responses path', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eOpenAiProviderRegistry({
            modelId: 'o3-mini',
            capabilities: { thinking: true },
          }),
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              ...validBody,
              params: { frequencyPenalty: 0.5 },
            })
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(response.body.warnings).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                field: 'params.frequencyPenalty',
              }),
            ]),
          );
        },
      );
    });

    it('should warn for numeric thinkingBudget without thinkingEnabled', async () => {
      await withE2eApp(
        { providerRegistry: createE2eOpenAiProviderRegistry() },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              ...validBody,
              params: { thinkingBudget: 2048 },
            })
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(response.body.warnings).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                field: 'params.thinkingBudget',
              }),
            ]),
          );
        },
      );
    });
  });

  describe('Validation — validateThinking', () => {
    it('should reject thinkingEnabled without capability', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eOpenAiProviderRegistry({
            capabilities: { thinking: false },
          }),
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              ...validBody,
              params: { thinkingEnabled: true },
            })
            .expect(400);

          expect(response.body.code).toBe(ApiErrorCode.THINKING_NOT_SUPPORTED);
        },
      );
    });

    it('should reject implicit string effort without capability', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eOpenAiProviderRegistry({
            capabilities: { thinking: false },
          }),
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              ...validBody,
              params: { thinkingBudget: 'high' },
            })
            .expect(400);

          expect(response.body.code).toBe(ApiErrorCode.THINKING_NOT_SUPPORTED);
        },
      );
    });

    it('should allow thinkingEnabled when capability is true', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eOpenAiProviderRegistry({
            capabilities: { thinking: true },
          }),
        },
        async ({ app }) => {
          await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              ...validBody,
              params: { thinkingEnabled: true },
            })
            .expect(E2E_POST_SUCCESS_STATUS);
        },
      );
    });
  });

  describe('Streaming — POST /chat/stream', () => {
    it('should emit meta, delta and done events', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eOpenAiProviderRegistry({
            streamChunks: ['Hello', ' OpenAI'],
          }),
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chatStream)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(validBody)
            .expect(200)
            .expect('Content-Type', /text\/event-stream/);

          const events = parseGatewaySseEvents(response.text);
          expect(events.some((e) => e.event === 'meta')).toBe(true);
          expect(
            events.filter((e) => e.event === 'delta').length,
          ).toBeGreaterThan(0);
          expect(events.some((e) => e.event === 'done')).toBe(true);

          const streamedText = events
            .filter((e) => e.event === 'delta')
            .map((e) => (typeof e.data.text === 'string' ? e.data.text : ''))
            .join('');
          expect(streamedText).toBe('Hello OpenAI');
        },
      );
    });

    it('should include thinkingContent in done event', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eOpenAiProviderRegistry({
            streamChunks: ['Hi'],
            streamOptions: { thinkingContent: 'stream reasoning' },
          }),
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chatStream)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(validBody)
            .expect(200);

          const done = parseGatewaySseEvents(response.text).find(
            (e) => e.event === 'done',
          );
          expect(done?.data.thinkingContent).toBe('stream reasoning');
        },
      );
    });

    it('should include systemFingerprint in done event', async () => {
      await withE2eApp(
        {
          providerRegistry: createE2eOpenAiProviderRegistry({
            streamChunks: ['Hi'],
            streamOptions: { systemFingerprint: 'fp_stream_openai' },
          }),
        },
        async ({ app }) => {
          const response = await request(app.getHttpServer())
            .post(E2E_ROUTES.chatStream)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(validBody)
            .expect(200);

          const done = parseGatewaySseEvents(response.text).find(
            (e) => e.event === 'done',
          );
          expect(done?.data.systemFingerprint).toBe('fp_stream_openai');
        },
      );
    });
  });

  describe('Provider call options mapping', () => {
    it('should forward temperature and maxOutputTokens to provider.complete', async () => {
      await withE2eApp(
        { providerRegistry: createE2eOpenAiProviderRegistry() },
        async ({ app, providerRegistry }) => {
          await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send({
              ...validBody,
              params: {
                temperature: 0.2,
                maxOutputTokens: 128,
              },
            })
            .expect(E2E_POST_SUCCESS_STATUS);

          expect(
            (providerRegistry.provider as unknown as Record<string, unknown>)
              .complete,
          ).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({
              temperature: 0.2,
              maxOutputTokens: 128,
            }),
          );
        },
      );
    });
  });
});
