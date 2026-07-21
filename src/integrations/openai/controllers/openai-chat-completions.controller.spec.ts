jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { OpenAiChatCompletionsController } from './openai-chat-completions.controller';
import { ChatService } from '../../../chat/chat.service';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import { SmartRateLimiterService } from '../../../rate-limit/smart-rate-limiter.service';
import type { RateLimitResult } from '../../../rate-limit/smart-rate-limiter.service';
import { createMockSmartRateLimiter } from '../../../common/mocks/createMockSmartRateLimiter';
import { createMockExpressRequest } from '../../../common/mocks/http-mocks';
import { asGatewayKey, asRequestId } from '../../../common/types';
import { asClientId } from '../../../common/types/branded.types';
import { OpenAiBearerAuthGuard } from '../guards/openai-bearer-auth.guard';
import { SmartRateLimitGuard } from '../../../guards/smart-rate-limit-guard';
import { createOpenAiStreamState } from '../mappers/openai-stream.mapper';
import type { Request, Response } from 'express';
import type { OpenAiChatCompletionRequestDto } from '../dtos/openai-chat-completion-request.dto';

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
  let executeStreamMock: jest.Mock;
  let validateForStreamingMock: jest.Mock;
  let releaseStreamMock: jest.Mock;

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
    executeStreamMock = jest.fn();
    validateForStreamingMock = jest.fn();
    releaseStreamMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAiChatCompletionsController],
      providers: [
        {
          provide: ChatService,
          useValue: {
            executeChat: executeChatMock,
            executeStream: executeStreamMock,
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
    const { res, json } = mockResponse();
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
    expect(executeStreamMock).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'chatcmpl_gw_abc',
        choices: [{ message: { content: 'Hi there!' }, finish_reason: 'stop' }],
      }),
    );
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
      executeStreamMock.mockImplementation((_req, _id, _clientId, onEvent) => {
        onEvent({ name: 'delta', data: { text: 'Hi' } });
      });

      await controller.completions(req, streamBody, res);

      expect(validateForStreamingMock).toHaveBeenCalledWith('gpt-4');
      expect(executeChatMock).not.toHaveBeenCalled();
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
    });

    it('should pass includeUsage true when stream_options.include_usage is set', async () => {
      const req = createMockExpressRequest({
        requestId: REQ_ID,
        gatewayKey: GW_KEY,
      }) as Request;
      const { res } = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      executeStreamMock.mockResolvedValue(undefined);

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
      executeStreamMock.mockResolvedValue(undefined);

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
      executeStreamMock.mockResolvedValue(undefined);

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
      expect(executeStreamMock).not.toHaveBeenCalled();
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

    it('should release stream and end response when executeStream throws', async () => {
      const req = createMockExpressRequest({
        requestId: REQ_ID,
        gatewayKey: GW_KEY,
      }) as Request;
      const { res, end } = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      executeStreamMock.mockRejectedValue(new Error('stream failed'));

      await expect(
        controller.completions(req, streamBody, res),
      ).rejects.toThrow('stream failed');
      expect(releaseStreamMock).toHaveBeenCalledWith(GW_KEY);
      expect(end).toHaveBeenCalled();
    });
  });
});
