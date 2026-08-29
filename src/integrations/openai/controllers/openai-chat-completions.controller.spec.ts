jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { OpenAiChatCompletionsController } from './openai-chat-completions.controller';
import { ChatService } from '../../../chat/chat.service';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import { SmartRateLimiterService } from '../../../rate-limit/smart-rate-limiter.service';
import type { RateLimitResult } from '../../../rate-limit/smart-rate-limiter.service';
import { createMockSmartRateLimiter } from '../../../common/mocks/createMockSmartRateLimiter';
import { createMockExpressRequest } from '../../../common/mocks/http-mocks';
import { asGatewayKey, asRequestId } from '../../../common/types';
import {
  asClientId,
  asModelAlias,
  asProviderInstanceId,
  asResponseId,
} from '../../../common/types/branded.types';
import { OpenAiBearerAuthGuard } from '../guards/openai-bearer-auth.guard';
import { SmartRateLimitGuard } from '../../../guards/smart-rate-limit-guard';
import { createOpenAiStreamState } from '../mappers/openai-stream.mapper';
import { GATEWAY_CACHE_HEADER } from '../../../cache/types/chat-cache-source.type';
import type { Request, Response } from 'express';
import type { OpenAiChatCompletionRequestDto } from '../dtos/openai-chat-completion-request.dto';
import type { StreamCacheDecision } from '../../../chat/types/stream-cache-decision.types';
import type { ChatExecutionPrep } from '../../../chat/types/chat-execution-prep.types';
import type { CachedChatResponse } from '../../../cache/types/cached-chat-response.type';
import type { SseEvent } from '../../../chat/sse/sse-event.type';
import { TEST_CONVERSATION_ID } from '../../../common/mocks/test-constants';

jest.mock('../mappers/openai-request.mapper', () => ({
  mapOpenAiChatRequestToGateway: jest.fn((body) => ({
    modelAlias: body.model,
    messages: body.messages,
  })),
}));

jest.mock('../mappers/openai-response.mapper', () => ({
  mapChatResponseToOpenAi: jest.fn((result, model) => ({
    id: `chatcmpl_${result.id}`,
    model,
    choices: [
      { message: { content: result.output.text }, finish_reason: 'stop' },
    ],
  })),
}));

jest.mock('../mappers/openai-stream.mapper', () => ({
  createOpenAiStreamState: jest.fn((model, includeUsage) => ({
    model,
    includeUsage,
    roleSent: false,
  })),
  mapSseEventToOpenAi: jest.fn(() => ['data: {}\n\n']),
}));

describe('OpenAiChatCompletionsController', () => {
  let controller: OpenAiChatCompletionsController;
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
    provider: asProviderInstanceId('openai'),
    model: asModelAlias('gpt-4'),
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

  const baseMessages = [{ role: 'user' as const, content: 'Hello' }];
  const REQ_ID = asRequestId('req_1');
  const GW_APP_KEY = asGatewayKey('gw_app_key');
  const GW_KEY = asGatewayKey('gw_key');

  beforeEach(async () => {
    jest.clearAllMocks();

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
      controllers: [OpenAiChatCompletionsController],
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
            ...createMockSmartRateLimiter(),
            releaseStream: releaseStreamMock,
          },
        },
      ],
    })
      .overrideGuard(OpenAiBearerAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(SmartRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(OpenAiChatCompletionsController);
    rateLimiter = module.get(SmartRateLimiterService);
  });

  it('should execute non-streaming chat and return mapped response', async () => {
    const req = createMockExpressRequest({
      requestId: REQ_ID,
      gatewayKey: GW_APP_KEY,
    }) as Request;
    const { res, json, setHeader } = mockResponse();
    executeChatMock.mockResolvedValue({
      id: 'gw_abc',
      output: { text: 'Hi there!' },
    });

    await controller.completions(
      req,
      {
        model: 'claude-sonnet-4-5',
        messages: baseMessages,
        stream: false,
      },
      res,
    );

    expect(validateForStreamingMock).not.toHaveBeenCalled();
    expect(executeChatMock).toHaveBeenCalledWith(
      expect.objectContaining({ modelAlias: 'claude-sonnet-4-5' }),
      asClientId('unknown'),
      REQ_ID,
      GW_APP_KEY,
      'facade-openai',
    );
    expect(resolveStreamCacheMock).not.toHaveBeenCalled();
    expect(executeStreamMissMock).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'chatcmpl_gw_abc',
        choices: [{ message: { content: 'Hi there!' }, finish_reason: 'stop' }],
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
      gatewayKey: GW_APP_KEY,
    }) as Request;
    const { res, json, setHeader } = mockResponse();
    executeChatMock.mockResolvedValue({
      id: 'gw_cached',
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      output: { type: 'text', text: 'From cache' },
      requestId: REQ_ID,
      conversationId: 'conv_1',
      cached: true,
      cachedAt: '2026-08-28T00:00:00.000Z',
      cacheSource: 'semantic',
      finishReason: 'stop',
    });

    await controller.completions(
      req,
      {
        model: 'claude-sonnet-4-5',
        messages: baseMessages,
        stream: false,
      },
      res,
    );

    expect(setHeader).toHaveBeenCalledWith(GATEWAY_CACHE_HEADER, 'semantic');
    expect(json).toHaveBeenCalled();
  });

  it('should throw 401 when gateway key is missing on non-streaming request', async () => {
    const req = createMockExpressRequest({
      requestId: REQ_ID,
      gatewayKey: undefined,
      header: jest.fn().mockReturnValue(undefined),
      headers: {},
    }) as Request;
    const { res } = mockResponse();

    await expect(
      controller.completions(
        req,
        { model: 'gpt-4', messages: baseMessages },
        res,
      ),
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
    const streamBody: OpenAiChatCompletionRequestDto = {
      model: 'gpt-4',
      messages: baseMessages,
      stream: true,
    };

    const allowedStreamCheck: RateLimitResult = {
      allowed: true,
      remaining: 0,
      resetAt: new Date(),
    };

    it('should set OpenAI SSE headers and forward mapped lines', async () => {
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

      await controller.completions(req, streamBody, res);

      expect(validateForStreamingMock).toHaveBeenCalledWith('gpt-4');
      expect(executeChatMock).not.toHaveBeenCalled();
      expect(resolveStreamCacheMock).toHaveBeenCalledWith(
        expect.objectContaining({ modelAlias: 'gpt-4' }),
        REQ_ID,
        asClientId('unknown'),
        'facade-openai',
        GW_KEY,
      );
      expect(createOpenAiStreamState).toHaveBeenCalledWith('gpt-4', false);
      expect(status).toHaveBeenCalledWith(200);
      expect(setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream; charset=utf-8',
      );
      expect(setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-cache, no-transform',
      );
      expect(setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
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
        expect.objectContaining({ modelAlias: 'gpt-4' }),
        REQ_ID,
        asClientId('unknown'),
        expect.any(Function),
        GW_KEY,
        missDecision,
      );
    });

    it('should pass includeUsage true when stream_options.include_usage is set', async () => {
      const req = createMockExpressRequest({
        requestId: REQ_ID,
        gatewayKey: GW_KEY,
      }) as Request;
      const { res } = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      executeStreamMissMock.mockResolvedValue(undefined);

      await controller.completions(
        req,
        { ...streamBody, stream_options: { include_usage: true } },
        res,
      );

      expect(createOpenAiStreamState).toHaveBeenCalledWith('gpt-4', true);
    });

    it('should pass includeUsage true when legacy include_usage is set', async () => {
      const req = createMockExpressRequest({
        requestId: REQ_ID,
        gatewayKey: GW_KEY,
      }) as Request;
      const { res } = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      executeStreamMissMock.mockResolvedValue(undefined);

      await controller.completions(
        req,
        { ...streamBody, include_usage: true },
        res,
      );

      expect(createOpenAiStreamState).toHaveBeenCalledWith('gpt-4', true);
    });

    it('should omit x-request-id header when requestId is missing', async () => {
      const req = {
        gatewayKey: GW_KEY,
        header: jest.fn(),
        headers: {},
      } as unknown as Request;
      const { res, setHeader } = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      executeStreamMissMock.mockResolvedValue(undefined);

      await controller.completions(req, streamBody, res);

      expect(setHeader).not.toHaveBeenCalledWith(
        'x-request-id',
        expect.anything(),
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
        controller.completions(req, streamBody, res),
      ).rejects.toMatchObject({
        response: {
          statusCode: 429,
          code: ApiErrorCode.RATE_LIMITED,
          message: 'Max 3 concurrent streams',
          requestId: REQ_ID,
        },
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
      expect(resolveStreamCacheMock).not.toHaveBeenCalled();
      expect(executeStreamMissMock).not.toHaveBeenCalled();
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
        controller.completions(req, streamBody, res),
      ).rejects.toMatchObject({
        response: { message: 'Concurrent stream limit exceeded' },
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
        controller.completions(req, streamBody, res),
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

      await controller.completions(req, streamBody, res);

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

      await expect(controller.completions(req, streamBody, res)).rejects.toBe(
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

      await controller.completions(req, streamBody, res);

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

      await controller.completions(req, streamBody, res);

      expect(setHeader).toHaveBeenCalledWith(GATEWAY_CACHE_HEADER, 'semantic');
      expect(replayStreamCacheHitMock).toHaveBeenCalled();
      expect(executeStreamMissMock).not.toHaveBeenCalled();
    });
  });
});
