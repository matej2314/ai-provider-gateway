jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AnthropicMessagesController } from './anthropic-messages.controller';
import { ChatService } from '../../../chat/chat.service';
import { SmartRateLimiterService } from '../../../rate-limit/smart-rate-limiter.service';
import type { RateLimitResult } from '../../../rate-limit/smart-rate-limiter.service';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import type { Request, Response } from 'express';
import type { AnthropicMessagesRequestDto } from '../dtos/anthropic-messages-request.dto';
import { AnthropicApiKeyGuard } from '../guards/anthropic-api-key.guard';
import { SmartRateLimitGuard } from '../../../guards/smart-rate-limit-guard';
import { createMockExpressRequest } from '../../../common/mocks/http-mocks';
import { asGatewayKey, asRequestId } from '../../../common/types';
import {
  asClientId,
  asModelAlias,
  asProviderInstanceId,
  asResponseId,
} from '../../../common/types/branded.types';
import { GATEWAY_CACHE_HEADER } from '../../../cache/types/chat-cache-source.type';
import type { StreamCacheDecision } from '../../../chat/types/stream-cache-decision.types';
import type { ChatExecutionPrep } from '../../../chat/types/chat-execution-prep.types';
import type { CachedChatResponse } from '../../../cache/types/cached-chat-response.type';
import type { SseEvent } from '../../../chat/sse/sse-event.type';
import { TEST_CONVERSATION_ID } from '../../../common/mocks/test-constants';

jest.mock('../mappers/anthropic-request.mapper', () => ({
  mapAnthropicRequestToGateway: jest.fn((body) => ({
    modelAlias: body.model,
    messages: [],
  })),
}));

jest.mock('../mappers/anthropic-response.mapper', () => ({
  mapGatewayResponseToAnthropicFormat: jest.fn((result, model) => ({
    id: `msg_${result.id.replace(/^gw_/, '')}`,
    type: 'message',
    role: 'assistant',
    model,
    content: [{ type: 'text', text: result.output.text }],
  })),
}));

jest.mock('../mappers/anthropic-stream.mapper', () => ({
  createAnthropicStreamState: jest.fn((model) => ({ model })),
  mapSseEventToAnthropic: jest.fn(() => ['event: ping\ndata: {}\n\n']),
}));

describe('AnthropicMessagesController', () => {
  let controller: AnthropicMessagesController;
  let rateLimiter: jest.Mocked<SmartRateLimiterService>;
  let executeChatMock: jest.Mock;
  let resolveStreamCacheMock: jest.Mock;
  let executeStreamMissMock: jest.Mock;
  let replayStreamCacheHitMock: jest.Mock;
  let validateForStreamingMock: jest.Mock;
  let releaseStreamMock: jest.Mock;

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
    model: asModelAlias('claude-3'),
    output: { type: 'text', text: 'Cached stream' },
    cached: true,
    cachedAt: '2026-01-01T00:00:00.000Z',
    finishReason: 'stop',
  };

  const mockResponse = () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn().mockReturnThis();
    const setHeader = jest.fn().mockReturnThis();
    const write = jest.fn().mockReturnThis();
    const end = jest.fn().mockReturnThis();
    const flushHeaders = jest.fn();

    const res = {
      status,
      json,
      setHeader,
      write,
      end,
      flushHeaders,
      writableEnded: false,
    } as unknown as Response;

    return { res, status, json, setHeader, write, end, flushHeaders };
  };

  const REQ_ID = asRequestId('req_1');
  const GW_KEY = asGatewayKey('gw_key');

  beforeEach(async () => {
    executeChatMock = jest.fn();
    resolveStreamCacheMock = jest.fn().mockResolvedValue(missDecision);
    executeStreamMissMock = jest.fn();
    replayStreamCacheHitMock = jest.fn(
      (_decision, _requestId, emit: (event: SseEvent) => void) => {
        emit({ name: 'delta', data: { text: 'cached' } });
      },
    );
    validateForStreamingMock = jest.fn();
    releaseStreamMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnthropicMessagesController],
      providers: [
        {
          provide: ChatService,
          useValue: {
            executeChat: executeChatMock,
            resolveStreamCache: resolveStreamCacheMock,
            executeStreamMiss: executeStreamMissMock,
            replayStreamCacheHit: replayStreamCacheHitMock,
            validateForStreaming: validateForStreamingMock,
          },
        },
        {
          provide: SmartRateLimiterService,
          useValue: {
            checkConcurrentStreams: jest.fn(),
            releaseStream: releaseStreamMock,
          },
        },
      ],
    })
      .overrideGuard(AnthropicApiKeyGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(SmartRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(AnthropicMessagesController);
    rateLimiter = module.get(SmartRateLimiterService);
  });

  it('should execute non-streaming chat and return mapped Anthropic response', async () => {
    const req = createMockExpressRequest({
      requestId: REQ_ID,
      gatewayKey: GW_KEY,
    }) as Request;
    const { res, json, setHeader } = mockResponse();
    executeChatMock.mockResolvedValue({
      id: 'gw_abc',
      output: { text: 'Hi' },
    });

    await controller.createMessage(req, res, {
      model: 'claude-3',
      max_tokens: 100,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
      stream: false,
    });

    expect(executeChatMock).toHaveBeenCalledWith(
      expect.objectContaining({ modelAlias: 'claude-3' }),
      asClientId('unknown'),
      REQ_ID,
      GW_KEY,
      'facade-anthropic',
    );
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'msg_abc',
        content: [{ type: 'text', text: 'Hi' }],
      }),
    );
    expect(setHeader).not.toHaveBeenCalledWith(
      GATEWAY_CACHE_HEADER,
      expect.anything(),
    );
  });

  it('should set X-Gateway-Cache on semantic cache hit', async () => {
    const req = createMockExpressRequest({
      requestId: REQ_ID,
      gatewayKey: GW_KEY,
    }) as Request;
    const { res, json, setHeader } = mockResponse();
    executeChatMock.mockResolvedValue({
      id: 'gw_cached',
      provider: 'anthropic',
      model: 'claude-3',
      output: { type: 'text', text: 'From cache' },
      requestId: REQ_ID,
      conversationId: 'conv_1',
      cached: true,
      cachedAt: '2026-08-28T00:00:00.000Z',
      cacheSource: 'semantic',
      finishReason: 'stop',
    });

    await controller.createMessage(req, res, {
      model: 'claude-3',
      max_tokens: 100,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
      stream: false,
    });

    expect(setHeader).toHaveBeenCalledWith(GATEWAY_CACHE_HEADER, 'semantic');
    expect(json).toHaveBeenCalled();
  });

  it('should throw 401 when gateway key is missing', async () => {
    const req = createMockExpressRequest({
      requestId: REQ_ID,
      gatewayKey: undefined,
      header: jest.fn().mockReturnValue(undefined),
      headers: {},
    }) as Request;
    const { res } = mockResponse();

    await expect(
      controller.createMessage(req, res, {
        model: 'claude-3',
        max_tokens: 1,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }],
      }),
    ).rejects.toMatchObject({
      response: {
        statusCode: 401,
        code: ApiErrorCode.GATEWAY_KEY_MISSING,
        message: 'Missing client gateway key.',
        requestId: REQ_ID,
      },
      status: HttpStatus.UNAUTHORIZED,
    });

    expect(executeChatMock).not.toHaveBeenCalled();
  });

  describe('streaming', () => {
    const streamBody: AnthropicMessagesRequestDto = {
      model: 'claude-3',
      max_tokens: 100,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
      stream: true,
    };

    const allowedStreamCheck: RateLimitResult = {
      allowed: true,
      remaining: 0,
      resetAt: new Date(),
    };

    it('should set Anthropic SSE headers and forward mapped lines', async () => {
      const req = createMockExpressRequest({
        requestId: REQ_ID,
        gatewayKey: GW_KEY,
      }) as Request;
      const { res, status, setHeader, write, end, flushHeaders } =
        mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      executeStreamMissMock.mockImplementation(
        (_req, _id, _clientId, onEvent) => {
          onEvent({ name: 'delta', data: { text: 'Hi' } });
        },
      );

      await controller.createMessage(req, res, streamBody);

      expect(validateForStreamingMock).toHaveBeenCalledWith('claude-3');
      expect(resolveStreamCacheMock).toHaveBeenCalledWith(
        expect.objectContaining({ modelAlias: 'claude-3' }),
        REQ_ID,
        asClientId('unknown'),
        'facade-anthropic',
        GW_KEY,
      );
      expect(status).toHaveBeenCalledWith(200);
      expect(setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream; charset=utf-8',
      );
      expect(setHeader).toHaveBeenCalledWith('anthropic-version', '2023-06-01');
      expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(setHeader).toHaveBeenCalledWith('x-request-id', REQ_ID);
      expect(flushHeaders).toHaveBeenCalled();
      expect(write).toHaveBeenCalled();
      expect(releaseStreamMock).toHaveBeenCalledWith(GW_KEY);
      expect(end).toHaveBeenCalled();
      expect(setHeader).not.toHaveBeenCalledWith(
        GATEWAY_CACHE_HEADER,
        expect.anything(),
      );
      expect(executeStreamMissMock).toHaveBeenCalledWith(
        expect.objectContaining({ modelAlias: 'claude-3' }),
        REQ_ID,
        asClientId('unknown'),
        expect.any(Function),
        GW_KEY,
        missDecision,
      );
    });

    it('should throw 429 when concurrent stream limit exceeded', async () => {
      const req = createMockExpressRequest({
        requestId: REQ_ID,
        gatewayKey: GW_KEY,
      }) as Request;
      const { res } = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
        reason: 'Max 3 concurrent streams',
      });

      await expect(
        controller.createMessage(req, res, streamBody),
      ).rejects.toMatchObject({
        response: {
          statusCode: 429,
          code: ApiErrorCode.RATE_LIMITED,
          message: 'Max 3 concurrent streams',
          requestId: REQ_ID,
        },
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it('should use fallback rate-limit message when reason is missing', async () => {
      const req = createMockExpressRequest({
        requestId: REQ_ID,
        gatewayKey: GW_KEY,
      }) as Request;
      const { res } = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      await expect(
        controller.createMessage(req, res, streamBody),
      ).rejects.toMatchObject({
        response: { message: 'Concurrent streams limit exceeded' },
      });
    });

    it('should release stream and end response when executeStreamMiss throws', async () => {
      const req = createMockExpressRequest({
        requestId: REQ_ID,
        gatewayKey: GW_KEY,
      }) as Request;
      const { res, end } = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      executeStreamMissMock.mockRejectedValue(new Error('stream failed'));

      await expect(
        controller.createMessage(req, res, streamBody),
      ).rejects.toThrow('stream failed');
      expect(releaseStreamMock).toHaveBeenCalledWith(GW_KEY);
      expect(end).toHaveBeenCalled();
    });

    it('should look up cache before flushing SSE headers', async () => {
      const req = createMockExpressRequest({
        requestId: REQ_ID,
        gatewayKey: GW_KEY,
      }) as Request;
      const { res, flushHeaders } = mockResponse();
      const order: string[] = [];
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      resolveStreamCacheMock.mockImplementation(() => {
        order.push('lookup');
        return Promise.resolve(missDecision);
      });
      (res.flushHeaders as jest.Mock).mockImplementation(() => {
        order.push('flush');
      });

      await controller.createMessage(req, res, streamBody);

      expect(order).toEqual(['lookup', 'flush']);
      expect(flushHeaders).toHaveBeenCalled();
    });

    it('should not flush headers when cooldown rejects resolveStreamCache', async () => {
      const req = createMockExpressRequest({
        requestId: REQ_ID,
        gatewayKey: GW_KEY,
      }) as Request;
      const { res, flushHeaders, end } = mockResponse();
      const rateLimitError = new HttpException('Rate limited', 429);
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      resolveStreamCacheMock.mockRejectedValue(rateLimitError);

      await expect(controller.createMessage(req, res, streamBody)).rejects.toBe(
        rateLimitError,
      );

      expect(flushHeaders).not.toHaveBeenCalled();
      expect(end).not.toHaveBeenCalled();
      expect(executeStreamMissMock).not.toHaveBeenCalled();
      expect(replayStreamCacheHitMock).not.toHaveBeenCalled();
      expect(releaseStreamMock).toHaveBeenCalledWith(GW_KEY);
    });

    it('should set X-Gateway-Cache and replay on stream exact hit', async () => {
      const req = createMockExpressRequest({
        requestId: REQ_ID,
        gatewayKey: GW_KEY,
      }) as Request;
      const { res, setHeader, flushHeaders, write, end } = mockResponse();
      const order: string[] = [];
      setHeader.mockImplementation((name: string) => {
        if (name === GATEWAY_CACHE_HEADER) {
          order.push('cache-header');
        }
        return res;
      });
      flushHeaders.mockImplementation(() => {
        order.push('flush');
      });
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      const hitDecision: StreamCacheDecision = {
        outcome: 'hit',
        prep: mockPrep,
        cached: cachedHit,
        cacheSource: 'exact',
      };
      resolveStreamCacheMock.mockResolvedValue(hitDecision);

      await controller.createMessage(req, res, streamBody);

      expect(order).toEqual(['cache-header', 'flush']);
      expect(setHeader).toHaveBeenCalledWith(GATEWAY_CACHE_HEADER, 'exact');
      expect(replayStreamCacheHitMock).toHaveBeenCalledWith(
        hitDecision,
        REQ_ID,
        expect.any(Function),
        expect.any(Function),
      );
      expect(write).toHaveBeenCalled();
      expect(end).toHaveBeenCalled();
      expect(releaseStreamMock).toHaveBeenCalledWith(GW_KEY);
      expect(executeStreamMissMock).not.toHaveBeenCalled();
    });

    it('should set X-Gateway-Cache semantic on stream semantic hit', async () => {
      const req = createMockExpressRequest({
        requestId: REQ_ID,
        gatewayKey: GW_KEY,
      }) as Request;
      const { res, setHeader } = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      resolveStreamCacheMock.mockResolvedValue({
        outcome: 'hit',
        prep: mockPrep,
        cached: cachedHit,
        cacheSource: 'semantic',
      } satisfies StreamCacheDecision);

      await controller.createMessage(req, res, streamBody);

      expect(setHeader).toHaveBeenCalledWith(GATEWAY_CACHE_HEADER, 'semantic');
      expect(replayStreamCacheHitMock).toHaveBeenCalled();
      expect(executeStreamMissMock).not.toHaveBeenCalled();
    });
  });
});
