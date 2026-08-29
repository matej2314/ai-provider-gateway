import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../src/app.module';
import { setupApp } from '../../src/setup.app';
import { CACHE_BACKEND } from '../../src/cache/cache.tokens';
import { GATEWAY_CACHE_HEADER } from '../../src/cache/types/chat-cache-source.type';
import { STREAM_CACHE_REPLAY_CHUNK_SIZE } from '../../src/chat/services/stream-cache-replay.service';
import { ProviderRegistryService } from '../../src/providers/provider-registry.service';
import { SmartRateLimiterService } from '../../src/rate-limit/smart-rate-limiter.service';
import { RedisConnectionService } from '../../src/cache/adapters/redis-cache/redis-connection.service';
import { ProviderInstancesBootstrap } from '../../src/providers/provider-instances.bootstrap';
import { LoggingService } from '../../src/logging/logging.service';
import { ApiErrorCode } from '../../src/common/errors/api-error.code';
import {
  createMockConfigService,
  type MockConfigServiceOptions,
} from '../../src/common/mocks/createMockConfigService';
import {
  TEST_MODEL_ALIAS,
  TEST_MODEL_ID,
  TEST_PROVIDER_INSTANCE_BRANDED,
} from '../../src/common/mocks/test-constants';
import { parseGatewaySseEvents } from '../integration/helpers/parse-gateway-sse-events';
import {
  closeE2eApp,
  createE2eGatewayKeyRuntime,
} from './helpers/create-e2e-app';
import { createE2eInMemoryCacheBackend } from './helpers/e2e-in-memory-cache';
import {
  createE2eFallbackProviderRegistry,
  createE2eProviderRegistry,
  type E2eProviderRegistryMock,
} from './helpers/e2e-provider-registry';
import {
  createE2eLoggingServiceMock,
  createE2eProviderBootstrapMock,
  createE2eRedisConnectionMock,
} from './helpers/e2e-infra-mocks';
import { createE2eCooldownDeniedLimiter } from './helpers/e2e-rate-limiter';
import {
  createAnthropicRequestBody,
  E2E_GATEWAY_KEY,
  E2E_POST_SUCCESS_STATUS,
  E2E_ROUTES,
} from './helpers/e2e-constants';

const LONG_STREAM_TEXT = `${'A'.repeat(STREAM_CACHE_REPLAY_CHUNK_SIZE)}${'B'.repeat(STREAM_CACHE_REPLAY_CHUNK_SIZE)}CD`;

type CreateStreamCacheAppOptions = {
  providerRegistry: E2eProviderRegistryMock;
  rateLimiter?: Partial<SmartRateLimiterService>;
  gatewayOptions?: MockConfigServiceOptions['gatewayOptions'];
  cacheBackend?: ReturnType<typeof createE2eInMemoryCacheBackend>;
};

async function createE2eAppWithStreamCache(
  options: CreateStreamCacheAppOptions,
): Promise<INestApplication> {
  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ConfigService)
    .useValue(
      createMockConfigService({
        cache: { enabled: true, backend: 'noop', ttl: 3600 },
        semanticCache: { enabled: false },
        gatewayKey: createE2eGatewayKeyRuntime(),
        gatewayOptions: options.gatewayOptions,
      }),
    )
    .overrideProvider(CACHE_BACKEND)
    .useValue(options.cacheBackend ?? createE2eInMemoryCacheBackend())
    .overrideProvider(ProviderRegistryService)
    .useValue(options.providerRegistry)
    .overrideProvider(RedisConnectionService)
    .useValue(createE2eRedisConnectionMock())
    .overrideProvider(ProviderInstancesBootstrap)
    .useValue(createE2eProviderBootstrapMock())
    .overrideProvider(LoggingService)
    .useValue(createE2eLoggingServiceMock());

  if (options.rateLimiter) {
    moduleBuilder
      .overrideProvider(SmartRateLimiterService)
      .useValue(options.rateLimiter);
  }

  const moduleFixture = await moduleBuilder.compile();
  const app = moduleFixture.createNestApplication();
  setupApp(app);
  await app.init();
  return app;
}

function joinedDeltaText(raw: string): string {
  return parseGatewaySseEvents(raw)
    .filter((e) => e.event === 'delta')
    .map((e) => (typeof e.data.text === 'string' ? e.data.text : ''))
    .join('');
}

describe('Gateway stream cache (E2E)', () => {
  const validBody = {
    modelAlias: TEST_MODEL_ALIAS,
    messages: [{ role: 'user' as const, content: 'Stream cache me' }],
  };

  describe('Exact cross-endpoint', () => {
    let app: INestApplication;
    let providerRegistry: E2eProviderRegistryMock;
    let streamSpy: jest.SpyInstance;
    let completeSpy: jest.SpyInstance;

    beforeAll(async () => {
      providerRegistry = createE2eProviderRegistry({
        streamChunks: [LONG_STREAM_TEXT],
        completeResponse: { text: LONG_STREAM_TEXT },
      });
      streamSpy = jest.spyOn(providerRegistry.provider, 'stream');
      completeSpy = jest.spyOn(providerRegistry.provider, 'complete');
      app = await createE2eAppWithStreamCache({ providerRegistry });
    });

    afterAll(async () => {
      await closeE2eApp(app);
    });

    it('stream miss → stream hit (exact) with 64-char replay chunks', async () => {
      const miss = await request(app.getHttpServer())
        .post(E2E_ROUTES.chatStream)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(200)
        .expect('Content-Type', /text\/event-stream/);

      expect(miss.text).toContain('event: meta');
      expect(miss.text).not.toContain('"cached":true');
      expect(joinedDeltaText(miss.text)).toBe(LONG_STREAM_TEXT);
      expect(streamSpy).toHaveBeenCalledTimes(1);

      const hit = await request(app.getHttpServer())
        .post(E2E_ROUTES.chatStream)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(validBody)
        .expect(200);

      expect(hit.headers['content-type']).toMatch(/text\/event-stream/);
      expect(hit.text).toContain('event: meta');
      expect(hit.text).toContain('"cached":true');
      expect(hit.text).toContain('"cacheSource":"exact"');

      const deltas = parseGatewaySseEvents(hit.text).filter(
        (e) => e.event === 'delta',
      );
      expect(deltas.map((e) => e.data.text)).toEqual([
        'A'.repeat(STREAM_CACHE_REPLAY_CHUNK_SIZE),
        'B'.repeat(STREAM_CACHE_REPLAY_CHUNK_SIZE),
        'CD',
      ]);
      expect(joinedDeltaText(hit.text)).toBe(LONG_STREAM_TEXT);
      expect(streamSpy).toHaveBeenCalledTimes(1);
    });

    it('stream miss → JSON hit', async () => {
      const body = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [
          { role: 'user' as const, content: 'Stream then JSON cache' },
        ],
      };

      await request(app.getHttpServer())
        .post(E2E_ROUTES.chatStream)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(body)
        .expect(200);

      const jsonHit = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(body)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(jsonHit.body).toMatchObject({
        cached: true,
        cacheSource: 'exact',
        output: { text: LONG_STREAM_TEXT },
      });
      expect(completeSpy).not.toHaveBeenCalled();
    });

    it('JSON miss → stream hit', async () => {
      const body = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [
          { role: 'user' as const, content: 'JSON then stream cache' },
        ],
      };
      const streamCallsBefore = streamSpy.mock.calls.length;

      const jsonMiss = await request(app.getHttpServer())
        .post(E2E_ROUTES.chat)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(body)
        .expect(E2E_POST_SUCCESS_STATUS);

      expect(jsonMiss.body.cached).toBeFalsy();
      expect(completeSpy).toHaveBeenCalled();

      const streamHit = await request(app.getHttpServer())
        .post(E2E_ROUTES.chatStream)
        .set('x-gateway-key', E2E_GATEWAY_KEY)
        .send(body)
        .expect(200);

      expect(streamHit.text).toContain('"cached":true');
      expect(streamHit.text).toContain('"cacheSource":"exact"');
      expect(joinedDeltaText(streamHit.text)).toBe(LONG_STREAM_TEXT);
      expect(streamSpy.mock.calls.length).toBe(streamCallsBefore);
    });
  });

  describe('Tooling / didFallback — no store', () => {
    it('tooling stream request does not populate exact cache', async () => {
      const providerRegistry = createE2eProviderRegistry({
        streamChunks: ['tool-stream'],
        completeResponse: { text: 'tool-stream' },
      });
      const streamSpy = jest.spyOn(providerRegistry.provider, 'stream');
      const app = await createE2eAppWithStreamCache({ providerRegistry });

      try {
        const toolingBody = {
          modelAlias: TEST_MODEL_ALIAS,
          messages: [
            { role: 'user' as const, content: 'Stream tooling bypass' },
          ],
          tooling: {
            definitions: [
              {
                name: 'get_weather',
                description: 'Get weather',
                parameters: { type: 'object', properties: {} },
              },
            ],
          },
        };

        await request(app.getHttpServer())
          .post(E2E_ROUTES.chatStream)
          .set('x-gateway-key', E2E_GATEWAY_KEY)
          .send(toolingBody)
          .expect(200);

        const second = await request(app.getHttpServer())
          .post(E2E_ROUTES.chatStream)
          .set('x-gateway-key', E2E_GATEWAY_KEY)
          .send(toolingBody)
          .expect(200);

        expect(second.text).not.toContain('"cached":true');
        expect(streamSpy).toHaveBeenCalledTimes(2);
      } finally {
        await closeE2eApp(app);
      }
    });

    it('didFallback stream success is not cached for the primary alias', async () => {
      const primaryAlias = TEST_MODEL_ALIAS;
      const fallbackAlias = 'claude-sonnet';
      const providerRegistry = createE2eFallbackProviderRegistry({
        primaryAlias,
        fallbackAlias,
        fallbackText: 'fallback-stream-text',
      });
      const streamSpy = jest.fn().mockImplementation(() => {
        throw new HttpException(
          {
            code: 'PROVIDER_ERROR',
            message: 'Server error',
            details: [],
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      });
      providerRegistry.provider.stream = streamSpy;

      const app = await createE2eAppWithStreamCache({
        providerRegistry,
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
      });

      try {
        const body = {
          modelAlias: primaryAlias,
          messages: [
            { role: 'user' as const, content: 'Stream fallback no cache' },
          ],
        };

        await request(app.getHttpServer())
          .post(E2E_ROUTES.chatStream)
          .set('x-gateway-key', E2E_GATEWAY_KEY)
          .send(body)
          .expect(200);

        const second = await request(app.getHttpServer())
          .post(E2E_ROUTES.chatStream)
          .set('x-gateway-key', E2E_GATEWAY_KEY)
          .send(body)
          .expect(200);

        expect(second.text).not.toContain('"cached":true');
        expect(streamSpy).toHaveBeenCalledTimes(2);
      } finally {
        await closeE2eApp(app);
      }
    });
  });

  describe('Cooldown before SSE', () => {
    it('returns 429 JSON without SSE when cooldown is active (even with cache entry)', async () => {
      const body = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [
          { role: 'user' as const, content: 'Cooldown with existing cache' },
        ],
      };
      const sharedCache = createE2eInMemoryCacheBackend();
      const seedRegistry = createE2eProviderRegistry({
        streamChunks: ['cooldown-seed'],
      });

      const seedApp = await createE2eAppWithStreamCache({
        providerRegistry: seedRegistry,
        cacheBackend: sharedCache,
      });

      try {
        await request(seedApp.getHttpServer())
          .post(E2E_ROUTES.chatStream)
          .set('x-gateway-key', E2E_GATEWAY_KEY)
          .send(body)
          .expect(200);
      } finally {
        await closeE2eApp(seedApp);
      }

      const cooldownApp = await createE2eAppWithStreamCache({
        providerRegistry: seedRegistry,
        cacheBackend: sharedCache,
        rateLimiter: createE2eCooldownDeniedLimiter(),
      });

      try {
        const response = await request(cooldownApp.getHttpServer())
          .post(E2E_ROUTES.chatStream)
          .set('x-gateway-key', E2E_GATEWAY_KEY)
          .send(body)
          .expect(429);

        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.text).not.toContain('event: meta');
        expect(response.body).toMatchObject({
          statusCode: 429,
          code: ApiErrorCode.RATE_LIMITED,
        });
      } finally {
        await closeE2eApp(cooldownApp);
      }
    });
  });

  describe('OpenAI facade stream — X-Gateway-Cache', () => {
    it('sets header on stream hit and omits cacheSource from vendor body', async () => {
      const openAiModel = 'gpt-4';
      const providerRegistry = createE2eProviderRegistry({
        modelAlias: openAiModel,
        streamChunks: ['facade-cache'],
        completeResponse: { text: 'facade-cache' },
      });
      const app = await createE2eAppWithStreamCache({
        providerRegistry,
        gatewayOptions: {
          models: {
            [openAiModel]: {
              providerInstance: TEST_PROVIDER_INSTANCE_BRANDED,
              modelId: TEST_MODEL_ID,
              capabilities: { tools: true, streaming: true },
            },
          },
        },
      });
      const body = {
        model: openAiModel,
        messages: [{ role: 'user' as const, content: 'Facade stream cache' }],
        stream: true,
      };

      try {
        await request(app.getHttpServer())
          .post(E2E_ROUTES.openAiCompletions)
          .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
          .send(body)
          .expect(200);

        const hit = await request(app.getHttpServer())
          .post(E2E_ROUTES.openAiCompletions)
          .set('Authorization', `Bearer ${E2E_GATEWAY_KEY}`)
          .send(body)
          .expect(200);

        expect(hit.headers[GATEWAY_CACHE_HEADER.toLowerCase()]).toBe('exact');
        expect(hit.text).not.toContain('cacheSource');
        expect(hit.text).not.toContain('cachedAt');
        expect(hit.text).toContain('data: [DONE]');
      } finally {
        await closeE2eApp(app);
      }
    });
  });

  describe('Anthropic facade stream — X-Gateway-Cache', () => {
    it('sets header on stream hit and omits cacheSource from vendor body', async () => {
      const anthropicModel = 'claude-3-opus-20240229';
      const providerRegistry = createE2eProviderRegistry({
        modelAlias: anthropicModel,
        streamChunks: ['anthropic-cache'],
        completeResponse: { text: 'anthropic-cache' },
      });
      const app = await createE2eAppWithStreamCache({
        providerRegistry,
        gatewayOptions: {
          models: {
            [anthropicModel]: {
              providerInstance: TEST_PROVIDER_INSTANCE_BRANDED,
              modelId: TEST_MODEL_ID,
              capabilities: { tools: true, streaming: true },
            },
          },
        },
      });
      const body = createAnthropicRequestBody(anthropicModel, { stream: true });

      try {
        await request(app.getHttpServer())
          .post(E2E_ROUTES.anthropicMessages)
          .set('x-api-key', E2E_GATEWAY_KEY)
          .set('anthropic-version', '2023-06-01')
          .send(body)
          .expect(200);

        const hit = await request(app.getHttpServer())
          .post(E2E_ROUTES.anthropicMessages)
          .set('x-api-key', E2E_GATEWAY_KEY)
          .set('anthropic-version', '2023-06-01')
          .send(body)
          .expect(200);

        expect(hit.headers[GATEWAY_CACHE_HEADER.toLowerCase()]).toBe('exact');
        expect(hit.text).not.toContain('cacheSource');
        expect(hit.text).not.toContain('cachedAt');
      } finally {
        await closeE2eApp(app);
      }
    });
  });
});
