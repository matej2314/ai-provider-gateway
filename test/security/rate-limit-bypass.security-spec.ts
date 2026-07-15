import request from 'supertest';
import { ApiErrorCode } from '../../src/common/errors/api-error.code';
import {
  TEST_MAX_CONCURRENT_STREAMS,
  TEST_MODEL_ALIAS,
  TEST_RATE_LIMIT_BURST,
} from '../../src/common/mocks/test-constants';
import {
  asGatewayKey,
  asRateLimitBurst,
  type GatewayKey,
} from '../../src/common/types';
import {
  E2E_API_PREFIX,
  E2E_GATEWAY_KEY,
  E2E_POST_SUCCESS_STATUS,
  E2E_ROUTES,
} from '../e2e/helpers/e2e-constants';
import { createE2eProviderRegistry } from '../e2e/helpers/e2e-provider-registry';
import {
  createE2eBurstRateLimiter,
  createE2eSaturatedConcurrentStreamLimiter,
} from '../e2e/helpers/e2e-rate-limiter';
import type { SmartRateLimiterService } from '../../src/rate-limit/smart-rate-limiter.service';
import { withSecurityApp } from './helpers/create-security-app';

const BURST_LIMIT = 3;
const SECOND_GATEWAY_KEY: GatewayKey = asGatewayKey('gw_valid_key_123');
const HEALTH_LIVENESS = `${E2E_API_PREFIX}/health`;
const HEALTH_READY = `${E2E_API_PREFIX}/health/ready`;

const rateLimitEnabledConfig = {
  extra: { RATE_LIMIT_SMART_ENABLED: true },
} as const;

const chatBody = {
  modelAlias: TEST_MODEL_ALIAS,
  messages: [{ role: 'user' as const, content: 'rate limit probe' }],
};

function createPerKeyBurstRateLimiter(
  allowedRequests: number,
): Partial<SmartRateLimiterService> {
  const counts = new Map<string, number>();
  const burstLimit = asRateLimitBurst(allowedRequests);

  return {
    checkRateLimit: jest.fn().mockImplementation((gatewayKey: GatewayKey) => {
      const key = String(gatewayKey);
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);

      if (next > burstLimit) {
        return Promise.resolve({
          allowed: false,
          remaining: 0,
          resetAt: new Date(),
          reason: 'Rate limit exceeded for gateway key.',
        });
      }

      return Promise.resolve({
        allowed: true,
        remaining: burstLimit - next,
        resetAt: new Date(),
      });
    }),
    checkConcurrentStreams: jest.fn().mockImplementation(() =>
      Promise.resolve({
        allowed: true,
        remaining: TEST_MAX_CONCURRENT_STREAMS,
        resetAt: new Date(),
      }),
    ),
    releaseStream: jest.fn().mockResolvedValue(undefined),
    setCooldown: jest.fn().mockResolvedValue(undefined),
    checkCooldown: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: TEST_RATE_LIMIT_BURST,
      resetAt: new Date(),
    }),
  };
}

function securityAppOptions(
  rateLimiter: Partial<SmartRateLimiterService>,
  providerRegistry = createE2eProviderRegistry(),
) {
  return {
    providerRegistry,
    rateLimiter,
    config: rateLimitEnabledConfig,
  };
}

describe('Security: Rate Limit Bypass Attempts', () => {
  describe('Burst limit enforcement', () => {
    it('should return 429 after N+1 requests with the same x-gateway-key', async () => {
      await withSecurityApp(
        securityAppOptions(createE2eBurstRateLimiter(BURST_LIMIT)),
        async ({ app }) => {
          const send = () =>
            request(app.getHttpServer())
              .post(E2E_ROUTES.chat)
              .set('x-gateway-key', E2E_GATEWAY_KEY)
              .send(chatBody);

          for (let i = 0; i < BURST_LIMIT; i += 1) {
            await send().expect(E2E_POST_SUCCESS_STATUS);
          }

          const response = await send().expect(429);

          expect(response.body).toMatchObject({
            statusCode: 429,
            code: ApiErrorCode.RATE_LIMITED,
            message: expect.stringMatching(/rate limit/i),
            requestId: expect.any(String),
          });
        },
      );
    });

    it('should enforce burst sequentially without allowing an extra request', async () => {
      const rateLimiter = createE2eBurstRateLimiter(BURST_LIMIT);

      await withSecurityApp(
        securityAppOptions(rateLimiter),
        async ({ app }) => {
          const send = () =>
            request(app.getHttpServer())
              .post(E2E_ROUTES.chat)
              .set('x-gateway-key', E2E_GATEWAY_KEY)
              .send(chatBody);

          for (let i = 0; i < BURST_LIMIT; i += 1) {
            await send().expect(E2E_POST_SUCCESS_STATUS);
          }

          await send().expect(429);

          expect(rateLimiter.checkRateLimit).toHaveBeenCalledTimes(
            BURST_LIMIT + 1,
          );
        },
      );
    });
  });

  describe('Per-key isolation', () => {
    it('should not let one gateway key exhaust the bucket of another key', async () => {
      await withSecurityApp(
        {
          ...securityAppOptions(createPerKeyBurstRateLimiter(2)),
          config: {
            extra: { RATE_LIMIT_SMART_ENABLED: true },
            gatewayKey: {
              allowList: [E2E_GATEWAY_KEY, SECOND_GATEWAY_KEY],
              masterKey: E2E_GATEWAY_KEY,
            },
          },
        },
        async ({ app }) => {
          const sendAs = (key: GatewayKey) =>
            request(app.getHttpServer())
              .post(E2E_ROUTES.chat)
              .set('x-gateway-key', key)
              .send(chatBody);

          await sendAs(E2E_GATEWAY_KEY).expect(E2E_POST_SUCCESS_STATUS);
          await sendAs(E2E_GATEWAY_KEY).expect(E2E_POST_SUCCESS_STATUS);
          await sendAs(E2E_GATEWAY_KEY).expect(429);

          await sendAs(SECOND_GATEWAY_KEY).expect(E2E_POST_SUCCESS_STATUS);
        },
      );
    });
  });

  describe('Key normalization', () => {
    it('should treat whitespace-padded keys as the same bucket after trim', async () => {
      await withSecurityApp(
        securityAppOptions(createE2eBurstRateLimiter(2)),
        async ({ app }) => {
          const sendPadded = () =>
            request(app.getHttpServer())
              .post(E2E_ROUTES.chat)
              .set('x-gateway-key', `  ${E2E_GATEWAY_KEY}  `)
              .send(chatBody);

          const sendPlain = () =>
            request(app.getHttpServer())
              .post(E2E_ROUTES.chat)
              .set('x-gateway-key', E2E_GATEWAY_KEY)
              .send(chatBody);

          await sendPadded().expect(E2E_POST_SUCCESS_STATUS);
          await sendPlain().expect(E2E_POST_SUCCESS_STATUS);
          await sendPadded().expect(429);
        },
      );
    });
  });

  describe('Concurrent stream limits', () => {
    it('should return 429 on /chat/stream when concurrent streams are saturated', async () => {
      await withSecurityApp(
        securityAppOptions(
          createE2eSaturatedConcurrentStreamLimiter(),
          createE2eProviderRegistry({ hangStream: true }),
        ),
        async ({ app }) => {
          const agent = request(app.getHttpServer());
          const openStream = () =>
            agent
              .post(E2E_ROUTES.chatStream)
              .set('x-gateway-key', E2E_GATEWAY_KEY)
              .send(chatBody);

          await Promise.all([openStream(), openStream()]);

          const response = await openStream().expect(429);

          expect(response.body).toMatchObject({
            statusCode: 429,
            code: ApiErrorCode.RATE_LIMITED,
            message: expect.stringMatching(/concurrent streams/i),
          });
        },
      );
    });
  });

  describe('Health endpoint bypass', () => {
    it('should not apply smart rate limit on GET /api/v1/health', async () => {
      await withSecurityApp(
        securityAppOptions(createE2eBurstRateLimiter(1)),
        async ({ app }) => {
          const exhaustChatLimit = () =>
            request(app.getHttpServer())
              .post(E2E_ROUTES.chat)
              .set('x-gateway-key', E2E_GATEWAY_KEY)
              .send(chatBody);

          await exhaustChatLimit().expect(E2E_POST_SUCCESS_STATUS);
          await exhaustChatLimit().expect(429);

          for (let i = 0; i < 5; i += 1) {
            const response = await request(app.getHttpServer())
              .get(HEALTH_LIVENESS)
              .expect(200);

            expect(response.body).toMatchObject({
              status: 'healthy',
            });
          }
        },
      );
    });

    it('should not apply smart rate limit on GET /api/v1/health/ready', async () => {
      await withSecurityApp(
        securityAppOptions(createE2eBurstRateLimiter(1)),
        async ({ app }) => {
          await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(chatBody)
            .expect(E2E_POST_SUCCESS_STATUS);

          await request(app.getHttpServer())
            .post(E2E_ROUTES.chat)
            .set('x-gateway-key', E2E_GATEWAY_KEY)
            .send(chatBody)
            .expect(429);

          const response = await request(app.getHttpServer())
            .get(HEALTH_READY)
            .expect(200);

          expect(response.body).toMatchObject({
            status: expect.stringMatching(/ready|not_ready/),
          });
        },
      );
    });
  });
});
