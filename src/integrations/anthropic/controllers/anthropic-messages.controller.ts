import {
  Controller,
  Body,
  Post,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiProduces,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { ChatService } from '../../../chat/chat.service';
import { SmartRateLimiterService } from '../../../rate-limit/smart-rate-limiter.service';
import { AnthropicAuth } from '../decorators/anthropic-auth.decorator';
import { AnthropicMessagesRequestDto } from '../dtos/anthropic-messages-request.dto';
import { AnthropicMessagesResponseDto } from '../dtos/anthropic-messages-response.dto';
import { ApiAnthropicErrorResponses } from '../../../common/decorators/api-anthropic-error-response.decorator';
import { ApiRequestIdHeader } from '../../../common/decorators/api-request-id-header.decorator';
import { mapAnthropicRequestToGateway } from '../mappers/anthropic-request.mapper';
import { mapGatewayResponseToAnthropicFormat } from '../mappers/anthropic-response.mapper';
import {
  toChatResponseDto,
  toChatResponseDtoFromCache,
} from '../../../chat/dto/chat-response.dto';
import { GATEWAY_CACHE_HEADER } from '../../../cache/types/chat-cache-source.type';
import {
  createAnthropicStreamState,
  mapSseEventToAnthropic,
} from '../mappers/anthropic-stream.mapper';

import { ANTHROPIC_INTEGRATION_PATH } from '../../../integrations/integrations.constants';
import { ANTHROPIC_STREAM_API_DESCRIPTION } from '../helpers/anthropic-stream-api-description';
import { requireClientGatewayKey } from '../../../common/requireClientGatewayKey';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import { asRequestId, asClientId } from '../../../common/types/branded.types';
import type { SseEvent } from '../../../chat/sse/sse-event.type';
import type { Request, Response } from 'express';
import type { GatewayKey } from '../../../common/types';

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
  @ApiOperation({
    summary: 'Create message (Anthropic API)',
    description:
      'JSON message when `stream` is false/omitted. Anthropic SSE when `stream: true`',
  })
  @ApiBody({ type: AnthropicMessagesRequestDto })
  @ApiResponse({
    status: 201,
    type: AnthropicMessagesResponseDto,
    description: 'Non-streaming response.',
    headers: {
      [GATEWAY_CACHE_HEADER]: {
        description:
          'Present on cache hit (JSON and stream): `exact` or `semantic`. Omitted on miss.',
        schema: { type: 'string', enum: ['exact', 'semantic'] },
      },
    },
  })
  @ApiProduces('text/event-stream')
  @ApiResponse({
    status: 200,
    description: ANTHROPIC_STREAM_API_DESCRIPTION,
    headers: {
      [GATEWAY_CACHE_HEADER]: {
        description:
          'Present on cache hit (JSON and stream): `exact` or `semantic`. Omitted on miss.',
        schema: { type: 'string', enum: ['exact', 'semantic'] },
      },
    },
    content: {
      'text/event-stream': {
        schema: { type: 'string' },
        examples: {
          message_start: {
            value:
              'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_...","type":"message"}}\n\n',
          },
        },
      },
    },
  })
  @ApiHeader({
    name: 'anthropic-version',
    required: false,
    description: 'Set to "2023-06-01" on stream.',
    example: '2023-06-01',
  })
  @ApiAnthropicErrorResponses()
  @ApiRequestIdHeader()
  async createMessage(
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
    @Body() body: AnthropicMessagesRequestDto,
  ) {
    const gatewayKey = requireClientGatewayKey(req);

    if (body.stream === true) {
      await this.handleStream(req, res, body, gatewayKey);
      return;
    }

    const gatewayRequest = mapAnthropicRequestToGateway(body);
    const result = await this.chatService.executeChat(
      gatewayRequest,
      req.clientId ? asClientId(req.clientId) : asClientId('unknown'),
      asRequestId(req.requestId),
      gatewayKey,
      'facade-anthropic',
    );

    if ('cached' in result && result.cached && result.cacheSource) {
      res.setHeader(GATEWAY_CACHE_HEADER, result.cacheSource);
    }

    const dto =
      'cached' in result && result.cached
        ? toChatResponseDtoFromCache(result, result.conversationId, {
            cacheSource: result.cacheSource,
            requestId: result.requestId,
          })
        : toChatResponseDto(result);

    res.json(mapGatewayResponseToAnthropicFormat(dto, body.model));
  }

  private async handleStream(
    req: Request,
    res: Response,
    body: AnthropicMessagesRequestDto,
    gatewayKey: GatewayKey,
  ) {
    this.chatService.validateForStreaming(body.model);

    const requestId = asRequestId(req.requestId);
    const clientId = req.clientId
      ? asClientId(req.clientId)
      : asClientId('unknown');

    const streamsCheck = await this.rateLimiter.checkConcurrentStreams(
      gatewayKey,
      clientId,
    );

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

    try {
      const decision = await this.chatService.resolveStreamCache(
        gatewayRequest,
        requestId,
        clientId,
        'facade-anthropic',
        gatewayKey,
      );

      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('anthropic-version', '2023-06-01');
      res.setHeader('Cache-Control', 'no-cache');
      if (req.requestId) {
        res.setHeader('x-request-id', req.requestId);
      }

      if (decision.outcome === 'hit') {
        res.setHeader(GATEWAY_CACHE_HEADER, decision.cacheSource);
      }

      res.flushHeaders?.();

      const emit = (event: SseEvent) => {
        const lines = mapSseEventToAnthropic(event, state);
        for (const line of lines) {
          if (!res.writableEnded) {
            res.write(line);
          }
        }
      };

      try {
        if (decision.outcome === 'hit') {
          this.chatService.replayStreamCacheHit(
            decision,
            requestId,
            emit,
            () => res.writableEnded,
          );
        } else {
          await this.chatService.executeStreamMiss(
            gatewayRequest,
            requestId,
            clientId,
            emit,
            gatewayKey,
            decision,
          );
        }
      } finally {
        res.end();
      }
    } finally {
      await this.rateLimiter.releaseStream(gatewayKey);
    }
  }
}
