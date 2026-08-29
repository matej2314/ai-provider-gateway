import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { ProviderRegistryService } from '../../src/providers/provider-registry.service';
import { SmartRateLimiterService } from '../../src/rate-limit/smart-rate-limiter.service';
import { GATEWAY_CACHE_HEADER } from '../../src/cache/types/chat-cache-source.type';
import { ApiErrorCode } from '../../src/common/errors/api-error.code';
import {
  createIntegrationApp,
  closeIntegrationApp,
} from './helpers/create-integration-app';
import { flushIntegrationRedisDb } from './helpers/flush-integration-redis';
import { parseGatewaySseEvents } from './helpers/parse-gateway-sse-events';
import {
  getIntegrationGatewayKey,
  INTEGRATION_MODEL_ALIAS,
  INTEGRATION_MODEL_ALIAS_BRANDED,
  INTEGRATION_POST_SUCCESS_STATUS,
  INTEGRATION_PROVIDER_INSTANCE,
  INTEGRATION_ROUTES,
} from './helpers/integration-constants';
import { expectGatewayUsage } from '../helpers/expect-gateway-usage';

function joinedDeltaText(raw: string): string {
  return parseGatewaySseEvents(raw)
    .filter((e) => e.event === 'delta')
    .map((e) => (typeof e.data.text === 'string' ? e.data.text : ''))
    .join('');
}

describe('Gateway stream cache Redis (integration)', () => {
  let app: INestApplication;
  let streamSpy: jest.SpyInstance;
  let completeSpy: jest.SpyInstance;
  let rateLimiter: SmartRateLimiterService;

  const streamBody = {
    modelAlias: INTEGRATION_MODEL_ALIAS,
    messages: [
      {
        role: 'user' as const,
        content: 'integration-stream-cache-ping Reply with exactly: STREAM_OK',
      },
    ],
    params: { maxOutputTokens: 24, temperature: 0 },
  };

  const crossBody = {
    modelAlias: INTEGRATION_MODEL_ALIAS,
    messages: [
      {
        role: 'user' as const,
        content: 'integration-cross-cache-ping Reply with exactly: CROSS_OK',
      },
    ],
    params: { maxOutputTokens: 24, temperature: 0 },
  };

  const jsonThenStreamBody = {
    modelAlias: INTEGRATION_MODEL_ALIAS,
    messages: [
      {
        role: 'user' as const,
        content: 'integration-json-then-stream Reply with exactly: JSON_OK',
      },
    ],
    params: { maxOutputTokens: 24, temperature: 0 },
  };

  beforeAll(async () => {
    await flushIntegrationRedisDb();

    const context = await createIntegrationApp({
      cacheEnabled: true,
      rateLimitEnabled: false,
      toolsEnabled: true,
    });
    app = context.app;
    rateLimiter = app.get(SmartRateLimiterService);

    const registry = app.get(ProviderRegistryService);
    const resolved = registry.resolve(INTEGRATION_MODEL_ALIAS_BRANDED);
    streamSpy = jest.spyOn(resolved.provider, 'stream');
    completeSpy = jest.spyOn(resolved.provider, 'complete');
  });

  afterAll(async () => {
    streamSpy.mockRestore();
    completeSpy.mockRestore();
    await closeIntegrationApp(app);
  });

  it('stream miss → stream hit (exact)', async () => {
    const miss = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chatStream)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .set('Accept', 'text/event-stream')
      .send(streamBody)
      .expect(200)
      .expect('Content-Type', /text\/event-stream/);

    expect(miss.text).toContain('event: meta');
    expect(miss.text).not.toContain('"cached":true');
    const missText = joinedDeltaText(miss.text);
    expect(missText.length).toBeGreaterThan(0);
    expect(streamSpy).toHaveBeenCalledTimes(1);

    const hit = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chatStream)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .set('Accept', 'text/event-stream')
      .send(streamBody)
      .expect(200);

    expect(hit.headers['content-type']).toMatch(/text\/event-stream/);
    expect(hit.text).toContain('event: meta');
    expect(hit.text).toContain('"cached":true');
    expect(hit.text).toContain('"cacheSource":"exact"');
    expect(joinedDeltaText(hit.text)).toBe(missText);
    expect(streamSpy).toHaveBeenCalledTimes(1);
  });

  it('stream miss → JSON hit', async () => {
    const streamCallsBefore = streamSpy.mock.calls.length;
    const completeCallsBefore = completeSpy.mock.calls.length;

    const miss = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chatStream)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .set('Accept', 'text/event-stream')
      .send(crossBody)
      .expect(200);

    const streamed = joinedDeltaText(miss.text);
    expect(streamed.length).toBeGreaterThan(0);
    expect(streamSpy.mock.calls.length).toBe(streamCallsBefore + 1);

    const jsonHit = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chat)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .send(crossBody)
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(jsonHit.body).toMatchObject({
      cached: true,
      cachedAt: expect.any(String),
      cacheSource: 'exact',
      output: { text: streamed },
    });
    expectGatewayUsage(jsonHit.body.usage);
    expect(completeSpy.mock.calls.length).toBe(completeCallsBefore);
  });

  it('JSON miss → stream hit', async () => {
    const streamCallsBefore = streamSpy.mock.calls.length;
    const completeCallsBefore = completeSpy.mock.calls.length;

    const jsonMiss = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chat)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .send(jsonThenStreamBody)
      .expect(INTEGRATION_POST_SUCCESS_STATUS);

    expect(jsonMiss.body.cached).toBeFalsy();
    expect(jsonMiss.body.output.text.length).toBeGreaterThan(0);
    expect(completeSpy.mock.calls.length).toBe(completeCallsBefore + 1);

    const streamHit = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chatStream)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .set('Accept', 'text/event-stream')
      .send(jsonThenStreamBody)
      .expect(200);

    expect(streamHit.text).toContain('"cached":true');
    expect(streamHit.text).toContain('"cacheSource":"exact"');
    expect(joinedDeltaText(streamHit.text)).toBe(jsonMiss.body.output.text);
    expect(streamSpy.mock.calls.length).toBe(streamCallsBefore);
  });

  it('tooling stream request bypasses cache — provider.stream called twice', async () => {
    const toolingBody = {
      modelAlias: INTEGRATION_MODEL_ALIAS,
      messages: [
        {
          role: 'user' as const,
          content: 'integration-stream-tooling Reply with exactly: TOOL_OK',
        },
      ],
      params: { maxOutputTokens: 24, temperature: 0 },
      tooling: {
        definitions: [
          {
            name: 'get_weather',
            description: 'Get weather for a city',
            parameters: { type: 'object', properties: {} },
          },
        ],
      },
    };

    const streamCallsBefore = streamSpy.mock.calls.length;

    await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chatStream)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .set('Accept', 'text/event-stream')
      .send(toolingBody)
      .expect(200);

    const second = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chatStream)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .set('Accept', 'text/event-stream')
      .send(toolingBody)
      .expect(200);

    expect(second.text).not.toContain('"cached":true');
    expect(streamSpy.mock.calls.length).toBe(streamCallsBefore + 2);
  });

  it('cooldown returns 429 JSON without SSE when cache entry exists', async () => {
    const body = {
      modelAlias: INTEGRATION_MODEL_ALIAS,
      messages: [
        {
          role: 'user' as const,
          content: 'integration-stream-cooldown Reply with exactly: COOL_OK',
        },
      ],
      params: { maxOutputTokens: 24, temperature: 0 },
    };

    await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chatStream)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .set('Accept', 'text/event-stream')
      .send(body)
      .expect(200);

    await rateLimiter.setCooldown(
      getIntegrationGatewayKey(),
      INTEGRATION_PROVIDER_INSTANCE,
    );

    const response = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.chatStream)
      .set('x-gateway-key', getIntegrationGatewayKey())
      .set('Accept', 'text/event-stream')
      .send(body)
      .expect(429);

    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.text).not.toContain('event: meta');
    expect(response.body).toMatchObject({
      statusCode: 429,
      code: ApiErrorCode.RATE_LIMITED,
    });

    // Clear cooldown so later suites sharing Redis are not affected.
    await flushIntegrationRedisDb();
  });

  it('Anthropic facade stream sets X-Gateway-Cache on hit', async () => {
    const body = {
      model: INTEGRATION_MODEL_ALIAS,
      max_tokens: 24,
      stream: true,
      messages: [
        {
          role: 'user' as const,
          content: [
            {
              type: 'text' as const,
              text: 'integration-anthropic-stream-cache Reply with exactly: FAC_OK',
            },
          ],
        },
      ],
      temperature: 0,
    };

    const streamCallsBefore = streamSpy.mock.calls.length;

    await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.anthropicMessages)
      .set('x-api-key', getIntegrationGatewayKey())
      .set('anthropic-version', '2023-06-01')
      .send(body)
      .expect(200);

    const hit = await request(app.getHttpServer())
      .post(INTEGRATION_ROUTES.anthropicMessages)
      .set('x-api-key', getIntegrationGatewayKey())
      .set('anthropic-version', '2023-06-01')
      .send(body)
      .expect(200);

    expect(hit.headers[GATEWAY_CACHE_HEADER.toLowerCase()]).toBe('exact');
    expect(hit.text).not.toContain('cacheSource');
    expect(streamSpy.mock.calls.length).toBe(streamCallsBefore + 1);
  });
});
