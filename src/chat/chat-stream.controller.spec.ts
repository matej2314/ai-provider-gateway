jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ChatStreamController } from './chat-stream.controller';
import { ChatService } from './chat.service';
import { StreamCacheReplayService } from './services/stream-cache-replay.service';
import {
  createMockExpressRequest,
  createMockExpressResponse,
} from '../common/mocks/http-mocks';
import {
  TEST_CONVERSATION_ID,
  TEST_GATEWAY_KEY_BRANDED,
  TEST_MODEL_ALIAS,
  TEST_REQUEST_ID,
} from '../common/mocks/test-constants';
import { GatewayKeyGuard } from '../guards/gateway-key.guard';
import { SmartRateLimitGuard } from '../guards/smart-rate-limit-guard';
import { StreamCleanupInterceptor } from '../common/interceptors/stream-cleanup.interceptor';
import {
  asModelAlias,
  asProviderInstanceId,
  asResponseId,
} from '../common/types/branded.types';
import type { StreamCacheDecision } from './types/stream-cache-decision.types';
import type { ChatExecutionPrep } from './types/chat-execution-prep.types';
import type { CachedChatResponse } from '../cache/types/cached-chat-response.type';

describe('ChatStreamController', () => {
  let controller: ChatStreamController;
  let mockChatService: {
    validateForStreaming: jest.Mock;
    resolveStreamCache: jest.Mock;
    executeStreamMiss: jest.Mock;
  };
  let mockReplay: { replay: jest.Mock };

  const requestBody = {
    modelAlias: TEST_MODEL_ALIAS,
    messages: [{ role: 'user' as const, content: 'Hi' }],
  };

  const mockPrep = {
    responseConversationId: TEST_CONVERSATION_ID,
  } as ChatExecutionPrep;

  const missDecision: StreamCacheDecision = {
    outcome: 'miss',
    prep: mockPrep,
  };

  const cachedHit: CachedChatResponse = {
    id: asResponseId('gw_cached'),
    provider: asProviderInstanceId('anthropic'),
    model: asModelAlias(TEST_MODEL_ALIAS),
    output: { type: 'text', text: 'Cached stream' },
    cached: true,
    cachedAt: '2026-01-01T00:00:00.000Z',
    finishReason: 'stop',
  };

  function createStreamRequest() {
    return createMockExpressRequest({
      requestId: TEST_REQUEST_ID,
      gatewayKey: TEST_GATEWAY_KEY_BRANDED,
      header: jest.fn().mockReturnValue('gw_key_123'),
      headers: { 'x-gateway-key': 'gw_key_123' },
    });
  }

  beforeEach(async () => {
    mockChatService = {
      validateForStreaming: jest.fn(),
      resolveStreamCache: jest.fn().mockResolvedValue(missDecision),
      executeStreamMiss: jest
        .fn()
        .mockImplementation((_body, _reqId, _clientId, emit) => {
          emit({ name: 'delta', data: { text: 'Hello' } });
          emit({ name: 'done', data: { finishReason: 'stop' } });
        }),
    };
    mockReplay = {
      replay: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [ChatStreamController],
      providers: [
        { provide: ChatService, useValue: mockChatService },
        { provide: StreamCacheReplayService, useValue: mockReplay },
      ],
    })
      .overrideGuard(GatewayKeyGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(SmartRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideInterceptor(StreamCleanupInterceptor)
      .useValue({
        intercept: jest.fn((_context, next) => next.handle()),
      })
      .compile();

    controller = module.get(ChatStreamController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('streamChat', () => {
    let mockResponse: Partial<Response> & { writableEnded: boolean };

    beforeEach(() => {
      mockResponse = {
        ...createMockExpressResponse(),
        writableEnded: false,
      };
    });

    it('should look up cache before flushing SSE headers', async () => {
      const order: string[] = [];
      mockChatService.resolveStreamCache.mockImplementation(async () => {
        order.push('lookup');
        return missDecision;
      });
      mockResponse.flushHeaders = jest.fn(() => {
        order.push('flush');
      });

      await controller.streamChat(
        createStreamRequest() as Request,
        requestBody,
        mockResponse as Response,
      );

      expect(order).toEqual(['lookup', 'flush']);
      expect(mockChatService.validateForStreaming).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS,
      );
      expect(mockChatService.resolveStreamCache).toHaveBeenCalledWith(
        requestBody,
        TEST_REQUEST_ID,
        'unknown',
        'native',
        'gw_key_123',
      );
    });

    it('should not flush headers when cooldown rejects resolveStreamCache', async () => {
      const rateLimitError = new HttpException('Rate limited', 429);
      mockChatService.resolveStreamCache.mockRejectedValue(rateLimitError);

      await expect(
        controller.streamChat(
          createStreamRequest() as Request,
          requestBody,
          mockResponse as Response,
        ),
      ).rejects.toBe(rateLimitError);

      expect(mockResponse.flushHeaders).not.toHaveBeenCalled();
      expect(mockChatService.executeStreamMiss).not.toHaveBeenCalled();
      expect(mockReplay.replay).not.toHaveBeenCalled();
    });

    it('should replay cached response on exact hit without live stream', async () => {
      mockChatService.resolveStreamCache.mockResolvedValue({
        outcome: 'hit',
        prep: mockPrep,
        cached: cachedHit,
        cacheSource: 'exact',
      } satisfies StreamCacheDecision);

      await controller.streamChat(
        createStreamRequest() as Request,
        requestBody,
        mockResponse as Response,
      );

      expect(mockReplay.replay).toHaveBeenCalledWith({
        cached: cachedHit,
        cacheSource: 'exact',
        requestId: TEST_REQUEST_ID,
        conversationId: TEST_CONVERSATION_ID,
        emit: expect.any(Function),
        shouldAbort: expect.any(Function),
      });
      expect(mockChatService.executeStreamMiss).not.toHaveBeenCalled();
    });

    it('should replay semantic hit with cacheSource semantic', async () => {
      mockChatService.resolveStreamCache.mockResolvedValue({
        outcome: 'hit',
        prep: mockPrep,
        cached: cachedHit,
        cacheSource: 'semantic',
      } satisfies StreamCacheDecision);

      await controller.streamChat(
        createStreamRequest() as Request,
        requestBody,
        mockResponse as Response,
      );

      expect(mockReplay.replay).toHaveBeenCalledWith(
        expect.objectContaining({ cacheSource: 'semantic' }),
      );
      expect(mockChatService.executeStreamMiss).not.toHaveBeenCalled();
    });

    it('should execute miss path after headers on cache miss', async () => {
      await controller.streamChat(
        createStreamRequest() as Request,
        requestBody,
        mockResponse as Response,
      );

      expect(mockChatService.executeStreamMiss).toHaveBeenCalledWith(
        requestBody,
        TEST_REQUEST_ID,
        'unknown',
        expect.any(Function),
        'gw_key_123',
        missDecision,
      );
      expect(mockReplay.replay).not.toHaveBeenCalled();
    });

    it('should set SSE headers', async () => {
      await controller.streamChat(
        createStreamRequest() as Request,
        requestBody,
        mockResponse as Response,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream; charset=utf-8',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-cache, no-transform',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Connection',
        'keep-alive',
      );
    });

    it('should write events and end response on miss', async () => {
      await controller.streamChat(
        createStreamRequest() as Request,
        requestBody,
        mockResponse as Response,
      );

      expect(mockResponse.write).toHaveBeenCalled();
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should end response when executeStreamMiss throws', async () => {
      mockChatService.executeStreamMiss.mockRejectedValue(
        new Error('Stream error'),
      );

      await expect(
        controller.streamChat(
          createStreamRequest() as Request,
          requestBody,
          mockResponse as Response,
        ),
      ).rejects.toThrow('Stream error');

      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});
