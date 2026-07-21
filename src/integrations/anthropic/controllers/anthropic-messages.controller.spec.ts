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
import type { AnthropicMessagesRequestDto } from '../dtos/anthropic-messages-request.dto';
import { AnthropicApiKeyGuard } from '../guards/anthropic-api-key.guard';
import { SmartRateLimitGuard } from '../../../guards/smart-rate-limit-guard';
import { createMockExpressRequest } from '../../../common/mocks/http-mocks';
import { asGatewayKey, asRequestId } from '../../../common/types';
import { asClientId } from '../../../common/types/branded.types';

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

  const REQ_ID = asRequestId('req_1');
  const GW_KEY = asGatewayKey('gw_key');

  beforeEach(async () => {
    executeChatMock = jest.fn();
    executeStreamMock = jest.fn();
    validateForStreamingMock = jest.fn();
    releaseStreamMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnthropicMessagesController],
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
    const { res, json } = mockResponse();
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
      const { res, status, setHeader, write, end } = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      executeStreamMock.mockImplementation((_req, _id, _clientId, onEvent) => {
        onEvent({ name: 'delta', data: { text: 'Hi' } });
      });

      await controller.createMessage(req, res, streamBody);

      expect(validateForStreamingMock).toHaveBeenCalledWith('claude-3');
      expect(status).toHaveBeenCalledWith(200);
      expect(setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream; charset=utf-8',
      );
      expect(setHeader).toHaveBeenCalledWith('anthropic-version', '2023-06-01');
      expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(setHeader).toHaveBeenCalledWith('x-request-id', REQ_ID);
      expect(write).toHaveBeenCalled();
      expect(releaseStreamMock).toHaveBeenCalledWith(GW_KEY);
      expect(end).toHaveBeenCalled();
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

    it('should release stream and end response when executeStream throws', async () => {
      const req = createMockExpressRequest({
        requestId: REQ_ID,
        gatewayKey: GW_KEY,
      }) as Request;
      const { res, end } = mockResponse();
      rateLimiter.checkConcurrentStreams.mockResolvedValue(allowedStreamCheck);
      executeStreamMock.mockRejectedValue(new Error('stream failed'));

      await expect(
        controller.createMessage(req, res, streamBody),
      ).rejects.toThrow('stream failed');
      expect(releaseStreamMock).toHaveBeenCalledWith(GW_KEY);
      expect(end).toHaveBeenCalled();
    });
  });
});
