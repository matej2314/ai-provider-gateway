jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import type { Request } from 'express';
import { createMockExpressRequest } from '../common/mocks/http-mocks';
import {
  TEST_CONVERSATION_ID,
  TEST_GATEWAY_KEY_BRANDED,
  TEST_MODEL_ALIAS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_REQUEST_ID,
} from '../common/mocks/test-constants';
import { GatewayKeyGuard } from '../guards/gateway-key.guard';
import { SmartRateLimitGuard } from '../guards/smart-rate-limit-guard';

describe('ChatController', () => {
  let controller: ChatController;
  let mockChatService: Partial<ChatService>;

  beforeEach(async () => {
    mockChatService = {
      executeChat: jest.fn().mockResolvedValue({
        id: 'resp-123',
        output: { text: 'Response' },
        finishReason: 'stop',
      }),
    };

    const module = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: mockChatService }],
    })
      .overrideGuard(GatewayKeyGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(SmartRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(ChatController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('chat', () => {
    it('should call chatService.executeChat with correct params', async () => {
      const mockRequest = createMockExpressRequest({
        requestId: TEST_REQUEST_ID,
        gatewayKey: TEST_GATEWAY_KEY_BRANDED,
        header: jest.fn().mockReturnValue('gw_key_123'),
        headers: { 'x-gateway-key': 'gw_key_123' },
      });

      const requestBody = {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hello' }],
      };

      await controller.chat(mockRequest as Request, requestBody);

      expect(mockChatService.executeChat).toHaveBeenCalledWith(
        requestBody,
        'unknown',
        'req-123',
        'gw_key_123',
        'native',
      );
    });

    it('should map cache hit with cacheSource exact', async () => {
      const mockRequest = createMockExpressRequest({
        requestId: TEST_REQUEST_ID,
        gatewayKey: TEST_GATEWAY_KEY_BRANDED,
        header: jest.fn().mockReturnValue('gw_key_123'),
        headers: { 'x-gateway-key': 'gw_key_123' },
      });
      (mockChatService.executeChat as jest.Mock).mockResolvedValue({
        id: 'cached-123',
        provider: TEST_PROVIDER_INSTANCE_BRANDED,
        model: TEST_MODEL_ALIAS_BRANDED,
        output: { type: 'text', text: 'From cache' },
        requestId: TEST_REQUEST_ID,
        conversationId: TEST_CONVERSATION_ID,
        cached: true,
        cachedAt: '2026-01-01T00:00:00.000Z',
        cacheSource: 'exact',
      });

      const dto = await controller.chat(mockRequest as Request, {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hello' }],
      });

      expect(dto).toMatchObject({
        cached: true,
        cacheSource: 'exact',
        cachedAt: '2026-01-01T00:00:00.000Z',
        output: { type: 'text', text: 'From cache' },
      });
    });

    it('should omit cache fields on provider miss', async () => {
      const mockRequest = createMockExpressRequest({
        requestId: TEST_REQUEST_ID,
        gatewayKey: TEST_GATEWAY_KEY_BRANDED,
        header: jest.fn().mockReturnValue('gw_key_123'),
        headers: { 'x-gateway-key': 'gw_key_123' },
      });
      (mockChatService.executeChat as jest.Mock).mockResolvedValue({
        id: 'resp-123',
        provider: TEST_PROVIDER_INSTANCE_BRANDED,
        model: TEST_MODEL_ALIAS_BRANDED,
        output: { type: 'text', text: 'Response' },
        requestId: TEST_REQUEST_ID,
        conversationId: TEST_CONVERSATION_ID,
        finishReason: 'stop',
      });

      const dto = await controller.chat(mockRequest as Request, {
        modelAlias: TEST_MODEL_ALIAS,
        messages: [{ role: 'user' as const, content: 'Hello' }],
      });

      expect(dto).not.toHaveProperty('cached');
      expect(dto).not.toHaveProperty('cachedAt');
      expect(dto).not.toHaveProperty('cacheSource');
    });
  });
});
