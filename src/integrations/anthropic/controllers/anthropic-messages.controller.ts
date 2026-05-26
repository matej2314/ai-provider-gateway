import {
  Controller,
  Body,
  Post,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ChatService } from 'src/chat/chat.service';
import { SmartRateLimiterService } from 'src/rate-limit/smart-rate-limiter.service';
import { AnthropicAuth } from '../decorators/anthropic-auth.decorator';
import { AnthropicMessagesRequestDto } from '../dtos/anthropic-messages-request.dto';
import { mapAnthropicRequestToGateway } from '../mappers/anthropic-request.mapper';
import { mapGatewayResultToAnthropic } from '../mappers/anthropic-response.mapper';
import {
  createAnthropicStreamState,
  mapSseEventToAnthropic,
} from '../mappers/anthropic-stream.mapper';
import type { SseEvent } from 'src/chat/sse/sse-event.type';
import type { Request, Response } from 'express';
import type { ChatResponseDto } from 'src/chat/dto/chat-response.dto';

import { ANTHROPIC_INTEGRATION_PATH } from 'src/integrations/integrations.constants';
import { ApiErrorCode } from 'src/common/errors/api-error.code';

@ApiTags('Anthropic API')
@ApiSecurity('ApiKeyAuth')
@Controller(ANTHROPIC_INTEGRATION_PATH)
@AnthropicAuth()
export class AnthropicMessagesController {
  constructor(
    private readonly chatService: ChatService,
    private readonly rateLimiter: SmartRateLimiterService,
  ) {}

  @Post('messages')
  @ApiOperation({ summary: 'Create message (Anthropic API)' })
  @ApiBody({ type: AnthropicMessagesRequestDto })
  async createMessage(
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
    @Body() body: AnthropicMessagesRequestDto,
  ) {
    const gatewayKey = req.gatewayKey ?? '';

    if (body.stream === true) {
      await this.handleStream(req, res, body, gatewayKey);
      return;
    }

    const gatewayRequest = mapAnthropicRequestToGateway(body);
    const result = (await this.chatService.executeChat(
      gatewayRequest,
      req.requestId,
      gatewayKey,
    )) as ChatResponseDto;
    res.json(mapGatewayResultToAnthropic(result, body.model));
  }

  private async handleStream(
    req: Request,
    res: Response,
    body: AnthropicMessagesRequestDto,
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
          message: streamsCheck.reason || 'Concurrent streams limit exceeded',
          requestId: req.requestId,
          details: [],
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const gatewayRequest = mapAnthropicRequestToGateway(body);
    const state = createAnthropicStreamState(body.model);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('anthropic-version', '2023-06-01');
    res.setHeader('Cache-Control', 'no-cache');
    if (req.requestId) {
      res.setHeader('x-request-id', req.requestId);
    }
    res.flushHeaders?.();

    try {
      await this.chatService.executeStream(
        gatewayRequest,
        req.requestId,
        (event: SseEvent) => {
          const lines = mapSseEventToAnthropic(event, state);
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
}
