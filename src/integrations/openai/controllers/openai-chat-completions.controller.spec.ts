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
import { OpenAiBearerAuthGuard } from '../guards/openai-bearer-auth.guard';
import { SmartRateLimitGuard } from '../../../guards/smart-rate-limit-guard';
import { createOpenAiStreamState } from '../mappers/openai-stream.mapper';
import type { Request, Response } from 'express';
import type { SseEvent } from '../../../chat/sse/sse-event.type';
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
  let chatService: jest.Mocked<ChatService>;
  let rateLimiter: jest.Mocked<SmartRateLimiterService>;

  const mockResponse = (): Response =>
    ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      write: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      flushHeaders: jest.fn(),
    }) as unknown as Response;

  const baseMessages = [{ role: 'user' as const, content: 'Hello' }];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenAiChatCompletionsController],
      providers: [
        {
          provide: ChatService,
          useValue: {
            executeChat: jest.fn(),
            executeStream: jest.fn(),
            validateForStreaming: jest.fn(),
          },
        },
        {
          provide: SmartRateLimiterService,
          useValue: createMockSmartRateLimiter(),
        },
      ],
    })
      .overrideGuard(OpenAiBearerAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(SmartRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(OpenAiChatCompletionsController);
    chatService = module.get(ChatService);
    rateLimiter = module.get(SmartRateLimiterService);
  });

  it('should execute non-streaming chat and return mapped response', async () => {
    const req = { requestId: 'req_1', gatewayKey: 'gw_app_key' } as Request;
    const res = mockResponse();
    chatService.executeChat.mockResolvedValue({
      id: 'gw_abc',
      output: { text: 'Hi there!' },
    } as never);

    await controller.completions(
      req,
      {
        model: 'claude-sonnet-4-5',
        messages: baseMessages,
        stream: false,
      },
      res,
    );

    expect(chatService.validateForStreaming).not.toHaveBeenCalled();
    expect(chatService.executeChat).toHaveBeenCalledWith(
      expect.objectContaining({ modelAlias: 'claude-sonnet-4-5' }),
      'req_1',
      'gw_app_key',
    );
    expect(chatService.executeStream).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'chatcmpl_gw_abc',
        choices: [{ message: { content: 'Hi there!' }, finish_reason: 'stop' }],
      }),
    );
  });

  it('should use empty gatewayKey when missing on non-streaming request', async () => {
    const req = { requestId: 'req_1' } as Request;
    const res = mockResponse();
    chatService.executeChat.mockResolvedValue({
      id: 'gw_1',
      output: { text: 'ok' },
    } as never);

    await controller.completions(
      req,
      { model: 'gpt-4', messages: baseMessages },
      res,
    );

    expect(chatService.executeChat).toHaveBeenCalledWith(
      expect.anything(),
      'req_1',
      '',
    );
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
      const req = { requestId: 'req_1', gatewayKey: 'gw_key' } as Request;
      const res = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      chatService.executeStream.mockImplementation(async (_req, _id, onEvent) => {
        onEvent({ name: 'delta', data: { text: 'Hi' } } as SseEvent);
      });

      await controller.completions(req, streamBody, res);

      expect(chatService.validateForStreaming).toHaveBeenCalledWith('gpt-4');
      expect(chatService.executeChat).not.toHaveBeenCalled();
      expect(createOpenAiStreamState).toHaveBeenCalledWith('gpt-4', false);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream; charset=utf-8',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-cache, no-transform',
      );
      expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'req_1');
      expect(res.flushHeaders).toHaveBeenCalled();
      expect(res.write).toHaveBeenCalled();
      expect(rateLimiter.releaseStream).toHaveBeenCalledWith('gw_key');
      expect(res.end).toHaveBeenCalled();
    });

    it('should pass includeUsage true when stream_options.include_usage is set', async () => {
      const req = { requestId: 'req_1', gatewayKey: 'gw_key' } as Request;
      const res = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      chatService.executeStream.mockResolvedValue(undefined);

      await controller.completions(
        req,
        { ...streamBody, stream_options: { include_usage: true } },
        res,
      );

      expect(createOpenAiStreamState).toHaveBeenCalledWith('gpt-4', true);
    });

    it('should pass includeUsage true when legacy include_usage is set', async () => {
      const req = { requestId: 'req_1', gatewayKey: 'gw_key' } as Request;
      const res = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      chatService.executeStream.mockResolvedValue(undefined);

      await controller.completions(
        req,
        { ...streamBody, include_usage: true },
        res,
      );

      expect(createOpenAiStreamState).toHaveBeenCalledWith('gpt-4', true);
    });

    it('should omit x-request-id header when requestId is missing', async () => {
      const req = { gatewayKey: 'gw_key' } as Request;
      const res = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      chatService.executeStream.mockResolvedValue(undefined);

      await controller.completions(req, streamBody, res);

      expect(res.setHeader).not.toHaveBeenCalledWith(
        'x-request-id',
        expect.anything(),
      );
    });

    it('should throw 429 when concurrent stream limit exceeded', async () => {
      const req = { requestId: 'req_1', gatewayKey: 'gw_key' } as Request;
      const res = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
        reason: 'Max 3 concurrent streams',
      });

      await expect(controller.completions(req, streamBody, res)).rejects.toMatchObject({
        response: {
          statusCode: 429,
          code: ApiErrorCode.RATE_LIMITED,
          message: 'Max 3 concurrent streams',
          requestId: 'req_1',
        },
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
      expect(chatService.executeStream).not.toHaveBeenCalled();
    });

    it('should use fallback rate-limit message when reason is missing', async () => {
      const req = { requestId: 'req_1', gatewayKey: 'gw_key' } as Request;
      const res = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      await expect(controller.completions(req, streamBody, res)).rejects.toMatchObject({
        response: { message: 'Concurrent stream limit exceeded' },
      });
    });

    it('should release stream and end response when executeStream throws', async () => {
      const req = { requestId: 'req_1', gatewayKey: 'gw_key' } as Request;
      const res = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      chatService.executeStream.mockRejectedValue(new Error('stream failed'));

      await expect(controller.completions(req, streamBody, res)).rejects.toThrow(
        'stream failed',
      );
      expect(rateLimiter.releaseStream).toHaveBeenCalledWith('gw_key');
      expect(res.end).toHaveBeenCalled();
    });
  });
});
