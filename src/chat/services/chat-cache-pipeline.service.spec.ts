import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChatCachePipelineService } from './chat-cache-pipeline.service';
import { ResponseCacheService } from '../../cache/response-cache.service';
import { SemanticCacheService } from '../../cache/semantic/semantic-cache.service';
import { AppMetricsService } from '../../observability/app-metrics/app-metrics.service';
import { createMockResponseCacheService } from '../../common/mocks/createMockResponseCacheService';
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
  TEST_TOOL_CALL_ID,
} from '../../common/mocks/test-constants';
import {
  asClientId,
  asConversationId,
  asEnvRef,
  asGatewayKey,
  asProviderInstanceId,
  asRequestId,
  asResponseId,
} from '../../common/types/branded.types';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import { toChatCacheIdentity } from '../helpers/to-chat-cache-identity';
import type { ChatResponseData } from './chat-response-builder.service';
import type { ProviderCallOptions } from '../../providers/interfaces/ai-provider.interface';

const TEST_CLIENT_ID = asClientId('test-client');
const UNKNOWN_CLIENT_ID = asClientId('unknown');
const FIXED_VECTOR = [0.1, 0.2, 0.3];

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

describe('ChatCachePipelineService', () => {
  let service: ChatCachePipelineService;
  let mockCache: Partial<ResponseCacheService>;
  let mockSemanticCache: {
    lookup: jest.Mock;
    storeReply: jest.Mock;
  };
  let mockAppMetrics: { recordCachePipelineAccess: jest.Mock };

  const baseRequest: ChatRequestDto = {
    modelAlias: TEST_MODEL_ALIAS,
    messages: [{ role: 'user', content: 'Hi' }],
  };

  const cachedResponse = {
    id: asResponseId('cached-123'),
    provider: asProviderInstanceId('anthropic'),
    model: TEST_MODEL_ALIAS_BRANDED,
    output: { type: 'text' as const, text: 'Cached answer' },
    conversationId: TEST_CONVERSATION_ID,
    cached: true as const,
    cachedAt: '2026-01-01T00:00:00.000Z',
  };

  const chatResponse: ChatResponseData = {
    id: asResponseId('gw_new'),
    provider: asProviderInstanceId('anthropic'),
    model: TEST_MODEL_ALIAS_BRANDED,
    output: { type: 'text', text: 'Fresh answer' },
    requestId: asRequestId('req-2'),
    conversationId: asConversationId('conv_2'),
    finishReason: 'stop',
  };

  const providerOptions: ProviderCallOptions = { temperature: 0.5 };

  async function initService(
    configOptions: MockConfigServiceOptions = cacheEnabledGatewayConfig,
    withSemantic = true,
  ) {
    mockCache = createMockResponseCacheService();
    mockAppMetrics = {
      recordCachePipelineAccess: jest.fn(),
    };
    mockSemanticCache = {
      lookup: jest.fn().mockResolvedValue({
        reply: null,
        vector: FIXED_VECTOR,
        embedAttempted: true,
      }),
      storeReply: jest.fn().mockResolvedValue(undefined),
    };

    const mockConfig = createMockConfigService(configOptions);

    const providers: Array<
      typeof ChatCachePipelineService | { provide: unknown; useValue: unknown }
    > = [
      ChatCachePipelineService,
      { provide: ResponseCacheService, useValue: mockCache },
      { provide: ConfigService, useValue: mockConfig },
      { provide: AppMetricsService, useValue: mockAppMetrics },
    ];

    if (withSemantic) {
      providers.push({
        provide: SemanticCacheService,
        useValue: mockSemanticCache,
      });
    }

    const module = await Test.createTestingModule({
      providers,
    }).compile();

    service = module.get(ChatCachePipelineService);
  }

  beforeEach(async () => {
    await initService();
  });

  describe('getCachedIfAllowed', () => {
    describe('Happy path', () => {
      it('should return cached response when exact hit and model allowed', async () => {
        (mockCache.getCachedResponse as jest.Mock).mockResolvedValue(
          cachedResponse,
        );

        const result = await service.getCachedIfAllowed(
          baseRequest,
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(result).toEqual({
          cached: cachedResponse,
          cacheSource: 'exact',
        });
        expect(mockCache.getCachedResponse).toHaveBeenCalledWith(
          toChatCacheIdentity(baseRequest, TEST_CLIENT_ID, providerOptions),
        );
        expect(mockSemanticCache.lookup).not.toHaveBeenCalled();
        expect(mockAppMetrics.recordCachePipelineAccess).toHaveBeenCalledWith(
          TEST_MODEL_ALIAS_BRANDED,
          true,
        );
      });

      it('should fall through to semantic on exact miss', async () => {
        (mockCache.getCachedResponse as jest.Mock).mockResolvedValue(null);
        mockSemanticCache.lookup.mockResolvedValue({
          reply: cachedResponse,
          vector: FIXED_VECTOR,
          embedAttempted: true,
        });

        const result = await service.getCachedIfAllowed(
          baseRequest,
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(result).toEqual({
          cached: cachedResponse,
          cacheSource: 'semantic',
        });
        expect(mockSemanticCache.lookup).toHaveBeenCalledWith(
          toChatCacheIdentity(baseRequest, TEST_CLIENT_ID, providerOptions),
        );
        expect(mockAppMetrics.recordCachePipelineAccess).toHaveBeenCalledWith(
          TEST_MODEL_ALIAS_BRANDED,
          true,
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
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(result).toEqual({ cached: null });
        expect(mockCache.getCachedResponse).not.toHaveBeenCalled();
        expect(mockSemanticCache.lookup).not.toHaveBeenCalled();
        expect(mockAppMetrics.recordCachePipelineAccess).not.toHaveBeenCalled();
      });

      it('should return null when clientId is unknown', async () => {
        const result = await service.getCachedIfAllowed(
          baseRequest,
          providerOptions,
          UNKNOWN_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(result).toEqual({ cached: null });
        expect(mockCache.getCachedResponse).not.toHaveBeenCalled();
      });

      it('should return null when gatewayKey is empty', async () => {
        const result = await service.getCachedIfAllowed(
          baseRequest,
          providerOptions,
          TEST_CLIENT_ID,
          asGatewayKey(''),
        );

        expect(result).toEqual({ cached: null });
        expect(mockCache.getCachedResponse).not.toHaveBeenCalled();
      });

      it('should return embedState on exact and semantic miss', async () => {
        (mockCache.getCachedResponse as jest.Mock).mockResolvedValue(null);

        const result = await service.getCachedIfAllowed(
          baseRequest,
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(result).toEqual({
          cached: null,
          embedState: {
            vector: FIXED_VECTOR,
            embedAttempted: true,
          },
        });
        expect(mockSemanticCache.lookup).toHaveBeenCalled();
        expect(mockAppMetrics.recordCachePipelineAccess).not.toHaveBeenCalled();
      });

      it('should pass embedAttempted false when lookup skipped embed', async () => {
        (mockCache.getCachedResponse as jest.Mock).mockResolvedValue(null);
        mockSemanticCache.lookup.mockResolvedValue({
          reply: null,
          vector: null,
          embedAttempted: false,
        });

        const result = await service.getCachedIfAllowed(
          baseRequest,
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(result).toEqual({
          cached: null,
          embedState: { vector: undefined, embedAttempted: false },
        });
      });

      it('should call semantic lookup when no last user message (skip owned by service)', async () => {
        (mockCache.getCachedResponse as jest.Mock).mockResolvedValue(null);
        mockSemanticCache.lookup.mockResolvedValue({
          reply: null,
          vector: null,
          embedAttempted: false,
        });
        const request: ChatRequestDto = {
          ...baseRequest,
          messages: [{ role: 'assistant', content: 'Hello' }],
        };

        const result = await service.getCachedIfAllowed(
          request,
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(result).toEqual({
          cached: null,
          embedState: { vector: undefined, embedAttempted: false },
        });
        expect(mockSemanticCache.lookup).toHaveBeenCalledWith(
          toChatCacheIdentity(request, TEST_CLIENT_ID, providerOptions),
        );
      });

      it('should call semantic lookup for multi-turn request (B2 skip in service)', async () => {
        (mockCache.getCachedResponse as jest.Mock).mockResolvedValue(null);
        mockSemanticCache.lookup.mockResolvedValue({
          reply: null,
          vector: null,
          embedAttempted: false,
        });
        const multiTurn: ChatRequestDto = {
          ...baseRequest,
          messages: [
            { role: 'user', content: 'explain' },
            { role: 'assistant', content: 'sure' },
            { role: 'user', content: 'continue' },
          ],
        };

        const result = await service.getCachedIfAllowed(
          multiTurn,
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(result).toEqual({
          cached: null,
          embedState: { vector: undefined, embedAttempted: false },
        });
        expect(mockSemanticCache.lookup).toHaveBeenCalledWith(
          toChatCacheIdentity(multiTurn, TEST_CLIENT_ID, providerOptions),
        );
      });

      it('should skip semantic when SemanticCacheService is absent', async () => {
        await initService(cacheEnabledGatewayConfig, false);
        (mockCache.getCachedResponse as jest.Mock).mockResolvedValue(null);

        const result = await service.getCachedIfAllowed(
          baseRequest,
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(result).toEqual({ cached: null });
      });
    });

    describe('Policy rejection', () => {
      it('should throw when gateway config is missing before any cache I/O', async () => {
        await initService({ gateway: null });

        await expect(
          service.getCachedIfAllowed(
            baseRequest,
            providerOptions,
            TEST_CLIENT_ID,
            TEST_GATEWAY_KEY_BRANDED,
          ),
        ).rejects.toThrow('Missing config key: gateway');
        expect(mockCache.getCachedResponse).not.toHaveBeenCalled();
        expect(mockSemanticCache.lookup).not.toHaveBeenCalled();
      });

      it('should skip exact and semantic I/O when model alias not in gateway config', async () => {
        await initService({
          gatewayOptions: {
            models: {},
            providers: cacheEnabledGatewayConfig.gatewayOptions!.providers,
            replace: { models: true },
          },
        });

        const result = await service.getCachedIfAllowed(
          baseRequest,
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(result).toEqual({ cached: null });
        expect(mockCache.getCachedResponse).not.toHaveBeenCalled();
        expect(mockSemanticCache.lookup).not.toHaveBeenCalled();
      });

      it('should skip exact and semantic I/O when provider is disabled', async () => {
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

        const result = await service.getCachedIfAllowed(
          baseRequest,
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(result).toEqual({ cached: null });
        expect(mockCache.getCachedResponse).not.toHaveBeenCalled();
        expect(mockSemanticCache.lookup).not.toHaveBeenCalled();
      });

      it('should skip exact and semantic I/O when provider row missing', async () => {
        await initService({
          gatewayOptions: {
            models: cacheEnabledGatewayConfig.gatewayOptions!.models,
            providers: {},
            replace: { providers: true },
          },
        });

        const result = await service.getCachedIfAllowed(
          baseRequest,
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(result).toEqual({ cached: null });
        expect(mockCache.getCachedResponse).not.toHaveBeenCalled();
        expect(mockSemanticCache.lookup).not.toHaveBeenCalled();
      });
    });

    describe('Edge cases', () => {
      it('should propagate getCachedResponse errors', async () => {
        (mockCache.getCachedResponse as jest.Mock).mockRejectedValue(
          new Error('Cache backend error'),
        );

        await expect(
          service.getCachedIfAllowed(
            baseRequest,
            providerOptions,
            TEST_CLIENT_ID,
            TEST_GATEWAY_KEY_BRANDED,
          ),
        ).rejects.toThrow('Cache backend error');
      });
    });
  });

  describe('setCachedIfAllowed', () => {
    describe('Happy path', () => {
      it('should call setCachedResponse and await storeReply with options and embedState', async () => {
        await service.setCachedIfAllowed(
          baseRequest,
          chatResponse,
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
          { vector: FIXED_VECTOR, embedAttempted: true },
        );

        expect(mockCache.setCachedResponse).toHaveBeenCalledWith(
          toChatCacheIdentity(baseRequest, TEST_CLIENT_ID, providerOptions),
          expect.objectContaining({
            id: chatResponse.id,
            cached: true,
            output: chatResponse.output,
          }),
        );
        expect(mockSemanticCache.storeReply).toHaveBeenCalledWith(
          toChatCacheIdentity(baseRequest, TEST_CLIENT_ID, providerOptions),
          expect.objectContaining({
            id: chatResponse.id,
            cached: true,
            output: chatResponse.output,
          }),
          { vector: FIXED_VECTOR, embedAttempted: true },
        );
      });
    });

    describe('Write gate (P12)', () => {
      it('should skip cache I/O when finishReason is length', async () => {
        await service.setCachedIfAllowed(
          baseRequest,
          { ...chatResponse, finishReason: 'length' },
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
          { vector: FIXED_VECTOR, embedAttempted: true },
        );

        expect(mockCache.setCachedResponse).not.toHaveBeenCalled();
        expect(mockSemanticCache.storeReply).not.toHaveBeenCalled();
      });

      it('should skip cache I/O when finishReason is content_filter', async () => {
        await service.setCachedIfAllowed(
          baseRequest,
          { ...chatResponse, finishReason: 'content_filter' },
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
          { vector: FIXED_VECTOR, embedAttempted: true },
        );

        expect(mockCache.setCachedResponse).not.toHaveBeenCalled();
        expect(mockSemanticCache.storeReply).not.toHaveBeenCalled();
      });

      it('should skip cache I/O when output text is empty', async () => {
        await service.setCachedIfAllowed(
          baseRequest,
          { ...chatResponse, output: { type: 'text', text: '  ' } },
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(mockCache.setCachedResponse).not.toHaveBeenCalled();
        expect(mockSemanticCache.storeReply).not.toHaveBeenCalled();
      });

      it('should skip cache I/O when the reply contains toolCalls', async () => {
        await service.setCachedIfAllowed(
          baseRequest,
          {
            ...chatResponse,
            toolCalls: [
              { id: TEST_TOOL_CALL_ID, name: 'search', arguments: '{}' },
            ],
          },
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(mockCache.setCachedResponse).not.toHaveBeenCalled();
        expect(mockSemanticCache.storeReply).not.toHaveBeenCalled();
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
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(mockCache.setCachedResponse).not.toHaveBeenCalled();
        expect(mockSemanticCache.storeReply).not.toHaveBeenCalled();
      });

      it('should skip when clientId is unknown', async () => {
        await service.setCachedIfAllowed(
          baseRequest,
          chatResponse,
          providerOptions,
          UNKNOWN_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(mockCache.setCachedResponse).not.toHaveBeenCalled();
        expect(mockSemanticCache.storeReply).not.toHaveBeenCalled();
      });

      it('should skip when gatewayKey is empty', async () => {
        await service.setCachedIfAllowed(
          baseRequest,
          chatResponse,
          providerOptions,
          TEST_CLIENT_ID,
          asGatewayKey(''),
        );

        expect(mockCache.setCachedResponse).not.toHaveBeenCalled();
        expect(mockSemanticCache.storeReply).not.toHaveBeenCalled();
      });
    });

    describe('Multi-turn skip (B2)', () => {
      it('should still call storeReply for multi-turn (gate owned by service)', async () => {
        const multiTurn: ChatRequestDto = {
          ...baseRequest,
          messages: [
            { role: 'user', content: 'first' },
            { role: 'assistant', content: 'ok' },
            { role: 'user', content: 'second' },
          ],
        };

        await service.setCachedIfAllowed(
          multiTurn,
          chatResponse,
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
          { vector: FIXED_VECTOR, embedAttempted: true },
        );

        expect(mockCache.setCachedResponse).toHaveBeenCalled();
        expect(mockSemanticCache.storeReply).toHaveBeenCalledWith(
          toChatCacheIdentity(multiTurn, TEST_CLIENT_ID, providerOptions),
          expect.objectContaining({ cached: true }),
          { vector: FIXED_VECTOR, embedAttempted: true },
        );
      });
    });

    describe('Policy rejection on store (S4)', () => {
      it('should skip exact set and storeReply when provider is disabled', async () => {
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

        await service.setCachedIfAllowed(
          baseRequest,
          chatResponse,
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
          { vector: FIXED_VECTOR, embedAttempted: true },
        );

        expect(mockCache.setCachedResponse).not.toHaveBeenCalled();
        expect(mockSemanticCache.storeReply).not.toHaveBeenCalled();
      });

      it('should skip exact set and storeReply when model alias missing', async () => {
        await initService({
          gatewayOptions: {
            models: {},
            providers: cacheEnabledGatewayConfig.gatewayOptions!.providers,
            replace: { models: true },
          },
        });

        await service.setCachedIfAllowed(
          baseRequest,
          chatResponse,
          providerOptions,
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(mockCache.setCachedResponse).not.toHaveBeenCalled();
        expect(mockSemanticCache.storeReply).not.toHaveBeenCalled();
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
          TEST_CLIENT_ID,
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(mockCache.setCachedResponse).toHaveBeenCalled();
        expect(mockSemanticCache.storeReply).toHaveBeenCalled();
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
            TEST_CLIENT_ID,
            TEST_GATEWAY_KEY_BRANDED,
          ),
        ).rejects.toThrow('Write failed');
      });
    });
  });

  describe('buildIdentityKey', () => {
    it('delegates to ResponseCacheService', () => {
      (mockCache.buildIdentityKey as jest.Mock).mockReturnValue('identity-key');

      const key = service.buildIdentityKey(
        baseRequest,
        TEST_CLIENT_ID,
        providerOptions,
      );

      expect(key).toBe('identity-key');
      expect(mockCache.buildIdentityKey).toHaveBeenCalledWith(
        toChatCacheIdentity(baseRequest, TEST_CLIENT_ID, providerOptions),
      );
    });
  });
});
