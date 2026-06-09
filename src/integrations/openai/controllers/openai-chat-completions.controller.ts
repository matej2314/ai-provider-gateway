import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ChatService } from 'src/chat/chat.service';
import { SmartRateLimiterService } from 'src/rate-limit/smart-rate-limiter.service';
import { OpenAiAuth } from '../decorators/openai-auth.decorator';
import { ApiErrorCode } from 'src/common/errors/api-error.code';
import { OpenAiChatCompletionRequestDto } from '../dtos/openai-chat-completion-request.dto';
import { mapOpenAiChatRequestToGateway } from '../mappers/openai-request.mapper';
import { mapChatResponseToOpenAi } from '../mappers/openai-response.mapper';
import {
  createOpenAiStreamState,
  mapSseEventToOpenAi,
} from '../mappers/openai-stream.mapper';

import type { Request, Response } from 'express';
import type { ChatResponseDto } from 'src/chat/dto/chat-response.dto';
import type { SseEvent } from 'src/chat/sse/sse-event.type';

import { OPENAI_INTEGRATION_PATH } from 'src/integrations/integrations.constants';

@ApiTags('OpenAI API')
@ApiSecurity('BearerAuth')
@Controller(OPENAI_INTEGRATION_PATH)
@OpenAiAuth()
export class OpenAiChatCompletionsController {
  constructor(
    private readonly chatService: ChatService,
    private readonly rateLimiter: SmartRateLimiterService,
  ) {}

  private async handleStream(
    req: Request,
    res: Response,
    body: OpenAiChatCompletionRequestDto,
    gatewayKey: string,
  ) {
    this.chatService.validateForStreaming(body.model);

    const streamsCheck =
      await this.rateLimiter.checkConcurrentStreams(gatewayKey);

    if (!streamsCheck.allowed) {
      throw new HttpException(
        {
          statusCode: 429,
          code: ApiErrorCode.RATE_LIMITED,
          message: streamsCheck.reason || 'Concurrent stream limit exceeded',
          requestId: req.requestId,
          details: [],
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const gatewayRequest = mapOpenAiChatRequestToGateway(body);
    const includeUsage =
      body.stream_options?.include_usage === true ||
      body.include_usage === true;
    const state = createOpenAiStreamState(body.model, includeUsage);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (req.requestId) {
      res.setHeader('x-request-id', req.requestId);
    }
    res.flushHeaders?.();

    try {
      await this.chatService.executeStream(
        gatewayRequest,
        req.requestId,
        (event: SseEvent) => {
          const lines = mapSseEventToOpenAi(event, state);
          for (const line of lines) {
            res.write(line);
          }
        },
      );
    } finally {
      await this.rateLimiter.releaseStream(gatewayKey);
      res.end();
    }
  }

  @Post('chat/completions')
  @ApiOperation({ summary: 'Create chat completion (OPENAI API spec)' })
  @ApiBody({ type: OpenAiChatCompletionRequestDto })
  async completions(
    @Req() req: Request,
    @Body() body: OpenAiChatCompletionRequestDto,
    @Res({ passthrough: false }) res: Response,
  ) {
    const gatewayKey = req.gatewayKey ?? '';

    if (body.stream === true) {
      await this.handleStream(req, res, body, gatewayKey);
      return;
    }

    const gatewayRequest = mapOpenAiChatRequestToGateway(body);
    const result = (await this.chatService.executeChat(
      gatewayRequest,
      req.requestId,
      gatewayKey,
    )) as ChatResponseDto;

    res.json(mapChatResponseToOpenAi(result, body.model));
  }
}
