jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AnthropicMessagesController } from './anthropic-messages.controller';
import { ChatService } from '../../../chat/chat.service';
import { SmartRateLimiterService } from '../../../rate-limit/smart-rate-limiter.service';
import type { RateLimitResult } from '../../../rate-limit/smart-rate-limiter.service';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import type { Request, Response } from 'express';
import type { SseEvent } from '../../../chat/sse/sse-event.type';
import type { AnthropicMessagesRequestDto } from '../dtos/anthropic-messages-request.dto';
import { AnthropicApiKeyGuard } from '../guards/anthropic-api-key.guard';
import { SmartRateLimitGuard } from '../../../guards/smart-rate-limit-guard';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnthropicMessagesController],
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
          useValue: {
            checkConcurrentStreams: jest.fn(),
            releaseStream: jest.fn(),
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
    chatService = module.get(ChatService);
    rateLimiter = module.get(SmartRateLimiterService);
  });

  it('should execute non-streaming chat and return mapped Anthropic response', async () => {
    const req = { requestId: 'req_1', gatewayKey: 'gw_key' } as Request;
    const res = mockResponse();
    chatService.executeChat.mockResolvedValue({
      id: 'gw_abc',
      output: { text: 'Hi' },
    } as never);

    await controller.createMessage(req, res, {
      model: 'claude-3',
      max_tokens: 100,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
      stream: false,
    });

    expect(chatService.executeChat).toHaveBeenCalledWith(
      expect.objectContaining({ modelAlias: 'claude-3' }),
      'req_1',
      'gw_key',
      'facade-anthropic',
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'msg_abc',
        content: [{ type: 'text', text: 'Hi' }],
      }),
    );
  });

  it('should use empty gatewayKey when missing', async () => {
    const req = { requestId: 'req_1' } as Request;
    const res = mockResponse();
    chatService.executeChat.mockResolvedValue({
      id: 'gw_1',
      output: { text: 'ok' },
    } as never);

    await controller.createMessage(req, res, {
      model: 'claude-3',
      max_tokens: 1,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }],
    });

    expect(chatService.executeChat).toHaveBeenCalledWith(
      expect.anything(),
      'req_1',
      '',
      'facade-anthropic',
    );
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
      const req = { requestId: 'req_1', gatewayKey: 'gw_key' } as Request;
      const res = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      chatService.executeStream.mockImplementation(
        async (_req, _id, onEvent) => {
          onEvent({ name: 'delta', data: { text: 'Hi' } } as SseEvent);
        },
      );

      await controller.createMessage(req, res, streamBody);

      expect(chatService.validateForStreaming).toHaveBeenCalledWith('claude-3');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream; charset=utf-8',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'anthropic-version',
        '2023-06-01',
      );
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'req_1');
      expect(res.write).toHaveBeenCalled();
      expect(rateLimiter.releaseStream).toHaveBeenCalledWith('gw_key');
      expect(res.end).toHaveBeenCalled();
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

      await expect(
        controller.createMessage(req, res, streamBody),
      ).rejects.toMatchObject({
        response: {
          statusCode: 429,
          code: ApiErrorCode.RATE_LIMITED,
          message: 'Max 3 concurrent streams',
          requestId: 'req_1',
        },
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it('should use fallback rate-limit message when reason is missing', async () => {
      const req = { requestId: 'req_1', gatewayKey: 'gw_key' } as Request;
      const res = mockResponse();
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

    it('should release stream and end response when executeStream throws', async () => {
      const req = { requestId: 'req_1', gatewayKey: 'gw_key' } as Request;
      const res = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      chatService.executeStream.mockRejectedValue(new Error('stream failed'));

      await expect(
        controller.createMessage(req, res, streamBody),
      ).rejects.toThrow('stream failed');
      expect(rateLimiter.releaseStream).toHaveBeenCalledWith('gw_key');
      expect(res.end).toHaveBeenCalled();
    });
  });
});
