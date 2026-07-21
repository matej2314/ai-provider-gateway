import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { ChatCacheGuardService } from './chat-cache-guard.service';
import { ResponseCacheService } from '../../cache/response-cache.service';
import { SmartRateLimiterService } from '../../rate-limit/smart-rate-limiter.service';
import { LoggingService } from '../../logging/logging.service';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';
import { createMockResponseCacheService } from '../../common/mocks/createMockResponseCacheService';
import { createMockSmartRateLimiter } from '../../common/mocks/createMockSmartRateLimiter';
import {
  createMockConfigService,
  type MockConfigServiceOptions,
} from '../../common/mocks/createMockConfigService';
import {
  TEST_API_KEY_REF,
  TEST_CONVERSATION_ID,
  TEST_GATEWAY_KEY_BRANDED,
  TEST_MODEL_ALIAS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_PROVIDER_INSTANCE,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_REQUEST_ID,
} from '../../common/mocks/test-constants';
import {
  asConversationId,
  asEnvRef,
  asProviderInstanceId,
  asRequestId,
  asResponseId,
} from '../../common/types/branded.types';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type { ChatResponseData } from './chat-response-builder.service';
import type { ProviderCallOptions } from '../../providers/interfaces/ai-provider.interface';

const cacheEnabledGatewayConfig: MockConfigServiceOptions = {
  gatewayOptions: {
    models: {
      [TEST_MODEL_ALIAS]: {
        providerInstance: TEST_PROVIDER_INSTANCE_BRANDED,
        modelId: 'test-model',
      },
    },
    providers: {
      [TEST_PROVIDER_INSTANCE]: {
        type: 'anthropic',
        apiKeyRef: asEnvRef(TEST_API_KEY_REF),
        enabled: true,
      },
    },
  },
};

describe('ChatCacheGuardService', () => {
  let service: ChatCacheGuardService;
  let mockCache: Partial<ResponseCacheService>;
  let mockRateLimiter: Partial<SmartRateLimiterService>;
  let mockLogger: Partial<LoggingService>;

  const baseRequest: ChatRequestDto = {
    modelAlias: TEST_MODEL_ALIAS,
    messages: [{ role: 'user', content: 'Hi' }],
  };

  const cachedResponse = {
    id: asResponseId('cached-123'),
    provider: asProviderInstanceId('anthropic'),
    model: TEST_MODEL_ALIAS_BRANDED,
    output: { type: 'text' as const, text: 'Cached answer' },
    requestId: asRequestId('req-1'),
    conversationId: TEST_CONVERSATION_ID,
    cached: true,
  };

  const chatResponse: ChatResponseData = {
    id: asResponseId('gw_new'),
    provider: asProviderInstanceId('anthropic'),
    model: TEST_MODEL_ALIAS_BRANDED,
    output: { type: 'text', text: 'Fresh answer' },
    requestId: asRequestId('req-2'),
    conversationId: asConversationId('conv_2'),
  };

  const providerOptions: ProviderCallOptions = { temperature: 0.5 };

  async function initService(
    configOptions: MockConfigServiceOptions = cacheEnabledGatewayConfig,
  ) {
    mockCache = createMockResponseCacheService();
    mockRateLimiter = createMockSmartRateLimiter();
    mockLogger = createMockLoggingService();

    const mockConfig = createMockConfigService(configOptions);

    const module = await Test.createTestingModule({
      providers: [
        ChatCacheGuardService,
        { provide: ResponseCacheService, useValue: mockCache },
        { provide: ConfigService, useValue: mockConfig },
        { provide: SmartRateLimiterService, useValue: mockRateLimiter },
        { provide: LoggingService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(ChatCacheGuardService);
  }

  beforeEach(async () => {
    await initService();
  });

  describe('checkRateLimit', () => {
    describe('Happy path', () => {
      it('should resolve when cooldown allows request', async () => {
        await expect(
          service.checkRateLimit(
            TEST_GATEWAY_KEY_BRANDED,
            'anthropic',
            TEST_REQUEST_ID,
          ),
        ).resolves.toBeUndefined();

        expect(mockRateLimiter.checkCooldown).toHaveBeenCalledWith(
          TEST_GATEWAY_KEY_BRANDED,
          'anthropic',
        );
      });
    });

    describe('Errors', () => {
      it('should throw 429 RATE_LIMITED when cooldown denies request', async () => {
        (mockRateLimiter.checkCooldown as jest.Mock).mockResolvedValue({
          allowed: false,
          reason: 'Cooldown active for provider',
        });

        await expect(
          service.checkRateLimit(
            TEST_GATEWAY_KEY_BRANDED,
            'anthropic',
            TEST_REQUEST_ID,
          ),
        ).rejects.toMatchObject({
          status: HttpStatus.TOO_MANY_REQUESTS,
          response: {
            statusCode: 429,
            code: ApiErrorCode.RATE_LIMITED,
            message: 'Cooldown active for provider',
            requestId: TEST_REQUEST_ID,
            details: [],
          },
        });

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Rate limit exceeded',
          expect.objectContaining({
            provider: 'anthropic',
            status: 429,
            code: ApiErrorCode.RATE_LIMITED,
          }),
        );
      });

      it('should use default message when cooldown reason is empty', async () => {
        (mockRateLimiter.checkCooldown as jest.Mock).mockResolvedValue({
          allowed: false,
        });

        await expect(
          service.checkRateLimit(
            TEST_GATEWAY_KEY_BRANDED,
            'anthropic',
            asRequestId('req-456'),
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            message: 'Rate limit exceeded',
          }),
        });
      });
    });

    describe('Edge cases', () => {
      it('should propagate rateLimiter.checkCooldown rejection', async () => {
        (mockRateLimiter.checkCooldown as jest.Mock).mockRejectedValue(
          new Error('Redis unavailable'),
        );

        await expect(
          service.checkRateLimit(
            TEST_GATEWAY_KEY_BRANDED,
            'anthropic',
            asRequestId('req-789'),
          ),
        ).rejects.toThrow('Redis unavailable');
      });
    });
  });

  describe('getCachedIfAllowed', () => {
    describe('Happy path', () => {
      it('should return cached response when cache hit and model allowed', async () => {
        (mockCache.getCachedResponse as jest.Mock).mockResolvedValue(
          cachedResponse,
        );

        const result = await service.getCachedIfAllowed(
          baseRequest,
          providerOptions,
        );

        expect(result).toEqual(cachedResponse);
        expect(mockCache.getCachedResponse).toHaveBeenCalledWith(
          baseRequest,
          providerOptions,
        );
      });
    });

    describe('Cache skipped', () => {
      it('should return null for tooling request without calling cache', async () => {
        const toolingRequest: ChatRequestDto = {
          ...baseRequest,
          tooling: {
            definitions: [{ name: 'get_weather', parameters: {} }],
          },
        };

        const result = await service.getCachedIfAllowed(
          toolingRequest,
          providerOptions,
        );

        expect(result).toBeNull();
        expect(mockCache.getCachedResponse).not.toHaveBeenCalled();
      });

      it('should return null on cache miss', async () => {
        (mockCache.getCachedResponse as jest.Mock).mockResolvedValue(null);

        const result = await service.getCachedIfAllowed(
          baseRequest,
          providerOptions,
        );

        expect(result).toBeNull();
      });
    });

    describe('Policy rejection', () => {
      it('should throw when gateway config is missing', async () => {
        await initService({ gateway: null });

        (mockCache.getCachedResponse as jest.Mock).mockResolvedValue(
          cachedResponse,
        );

        await expect(
          service.getCachedIfAllowed(baseRequest, providerOptions),
        ).rejects.toThrow('Missing config key: gateway');
      });

      it('should return null when model alias not in gateway config', async () => {
        await initService({
          gatewayOptions: {
            models: {},
            providers: cacheEnabledGatewayConfig.gatewayOptions!.providers,
            replace: { models: true },
          },
        });

        (mockCache.getCachedResponse as jest.Mock).mockResolvedValue(
          cachedResponse,
        );

        const result = await service.getCachedIfAllowed(
          baseRequest,
          providerOptions,
        );

        expect(result).toBeNull();
      });

      it('should return null when provider is disabled', async () => {
        await initService({
          gatewayOptions: {
            providers: {
              [TEST_PROVIDER_INSTANCE]: {
                type: 'anthropic',
                apiKeyRef: asEnvRef(TEST_API_KEY_REF),
                enabled: false,
              },
            },
          },
        });

        (mockCache.getCachedResponse as jest.Mock).mockResolvedValue(
          cachedResponse,
        );

        const result = await service.getCachedIfAllowed(
          baseRequest,
          providerOptions,
        );

        expect(result).toBeNull();
      });

      it('should return null when provider row missing', async () => {
        await initService({
          gatewayOptions: {
            models: cacheEnabledGatewayConfig.gatewayOptions!.models,
            providers: {},
            replace: { providers: true },
          },
        });

        (mockCache.getCachedResponse as jest.Mock).mockResolvedValue(
          cachedResponse,
        );

        const result = await service.getCachedIfAllowed(
          baseRequest,
          providerOptions,
        );

        expect(result).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should propagate getCachedResponse errors', async () => {
        (mockCache.getCachedResponse as jest.Mock).mockRejectedValue(
          new Error('Cache backend error'),
        );

        await expect(
          service.getCachedIfAllowed(baseRequest, providerOptions),
        ).rejects.toThrow('Cache backend error');
      });
    });
  });

  describe('setCachedIfAllowed', () => {
    describe('Happy path', () => {
      it('should call setCachedResponse for non-tooling request', async () => {
        await service.setCachedIfAllowed(
          baseRequest,
          chatResponse,
          providerOptions,
        );

        expect(mockCache.setCachedResponse).toHaveBeenCalledWith(
          baseRequest,
          chatResponse,
          providerOptions,
        );
      });
    });

    describe('Cache skipped', () => {
      it('should skip setCachedResponse for tooling request', async () => {
        const toolingRequest: ChatRequestDto = {
          ...baseRequest,
          messages: [
            { role: 'tool', content: '{"result":1}', toolCallId: 'tc_1' },
          ],
        };

        await service.setCachedIfAllowed(
          toolingRequest,
          chatResponse,
          providerOptions,
        );

        expect(mockCache.setCachedResponse).not.toHaveBeenCalled();
      });
    });

    describe('Edge cases', () => {
      it('should still cache when tooling.definitions is empty', async () => {
        const request: ChatRequestDto = {
          ...baseRequest,
          tooling: { definitions: [] },
        };

        await service.setCachedIfAllowed(
          request,
          chatResponse,
          providerOptions,
        );

        expect(mockCache.setCachedResponse).toHaveBeenCalled();
      });

      it('should propagate setCachedResponse errors', async () => {
        (mockCache.setCachedResponse as jest.Mock).mockRejectedValue(
          new Error('Write failed'),
        );

        await expect(
          service.setCachedIfAllowed(
            baseRequest,
            chatResponse,
            providerOptions,
          ),
        ).rejects.toThrow('Write failed');
      });
    });
  });
});
