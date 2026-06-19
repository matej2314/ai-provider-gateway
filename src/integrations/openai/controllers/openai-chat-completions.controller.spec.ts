jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { OpenAiChatCompletionsController } from './openai-chat-completions.controller';
import { ChatService } from '../../../chat/chat.service';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import { SmartRateLimiterService } from '../../../rate-limit/smart-rate-limiter.service';
import { createMockSmartRateLimiter } from '../../../common/mocks/createMockSmartRateLimiter';
import { OpenAiBearerAuthGuard } from '../guards/openai-bearer-auth.guard';
import { SmartRateLimitGuard } from '../../../guards/smart-rate-limit-guard';
import type { Request, Response } from 'express';
import type { SseEvent } from '../../../chat/sse/sse-event.type';

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

  beforeEach(async () => {
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
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
        stream: false,
      },
      res,
    );

    expect(chatService.executeChat).toHaveBeenCalledWith(
      expect.objectContaining({ modelAlias: 'claude-sonnet-4-5' }),
      'req_1',
      'gw_app_key',
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'chatcmpl_gw_abc',
        choices: [{ message: { content: 'Hi there!' }, finish_reason: 'stop' }],
      }),
    );
  });
});
