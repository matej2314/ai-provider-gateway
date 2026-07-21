jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { ChatStreamController } from './chat-stream.controller';
import { ChatService } from './chat.service';
import {
  createMockExpressRequest,
  createMockExpressResponse,
} from '../common/mocks/http-mocks';
import {
  TEST_GATEWAY_KEY_BRANDED,
  TEST_MODEL_ALIAS,
  TEST_REQUEST_ID,
} from '../common/mocks/test-constants';
import { GatewayKeyGuard } from '../guards/gateway-key.guard';
import { SmartRateLimitGuard } from '../guards/smart-rate-limit-guard';
import { StreamCleanupInterceptor } from '../common/interceptors/stream-cleanup.interceptor';

describe('ChatStreamController', () => {
  let controller: ChatStreamController;
  let mockChatService: Partial<ChatService>;

  beforeEach(async () => {
    mockChatService = {
      validateForStreaming: jest.fn(),
      executeStream: jest
        .fn()
        .mockImplementation((_body, _reqId, _clientId, emit) => {
          emit({ name: 'delta', data: { delta: 'Hello' } });
          emit({ name: 'done', data: { finishReason: 'stop' } });
        }),
    };

    const module = await Test.createTestingModule({
      controllers: [ChatStreamController],
      providers: [{ provide: ChatService, useValue: mockChatService }],
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
    let mockResponse: Partial<Response>;

    const requestBody = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'user' as const, content: 'Hi' }],
    };

    function createStreamRequest() {
      return createMockExpressRequest({
        requestId: TEST_REQUEST_ID,
        gatewayKey: TEST_GATEWAY_KEY_BRANDED,
        header: jest.fn().mockReturnValue('gw_key_123'),
        headers: { 'x-gateway-key': 'gw_key_123' },
      });
    }

    beforeEach(() => {
      mockResponse = createMockExpressResponse();
    });

    it('should check concurrent streams limit', async () => {
      const mockRequest = createStreamRequest();

      await controller.streamChat(
        mockRequest as Request,
        requestBody,
        mockResponse as Response,
      );

      expect(mockChatService.validateForStreaming).toHaveBeenCalledWith(
        TEST_MODEL_ALIAS,
      );
      expect(mockChatService.executeStream).toHaveBeenCalledWith(
        requestBody,
        'req-123',
        'unknown',
        expect.any(Function),
        'native',
        'gw_key_123',
      );
    });

    it('should set SSE headers', async () => {
      const mockRequest = createStreamRequest();

      await controller.streamChat(
        mockRequest as Request,
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

    it('should release stream on completion', async () => {
      const mockRequest = createStreamRequest();

      await controller.streamChat(
        mockRequest as Request,
        requestBody,
        mockResponse as Response,
      );

      expect(mockResponse.write).toHaveBeenCalled();
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should release stream on error', async () => {
      (mockChatService.executeStream as jest.Mock).mockRejectedValue(
        new Error('Stream error'),
      );

      const mockRequest = createStreamRequest();

      await expect(
        controller.streamChat(
          mockRequest as Request,
          requestBody,
          mockResponse as Response,
        ),
      ).rejects.toThrow('Stream error');

      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});
