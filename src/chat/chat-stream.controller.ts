import {
  Controller,
  Body,
  Post,
  Res,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiOperation,
  ApiBody,
  ApiSecurity,
  ApiTags,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import { ChatRequestDto } from './dto/chat-request.dto';
import { SseSerializer } from './sse/sse.serializer';
import { ChatService } from './chat.service';
import { GatewayKeyAndSmartRateLimit } from '../common/decorators/gateway-key-and-smart-rate-limit.decorator';
import { StreamCleanupInterceptor } from '../common/interceptors/stream-cleanup.interceptor';
import { ApiGatewayChatErrorResponses } from '../common/decorators/api-gateway-error-responses.decorator';
import { SseMetaPayloadDto } from './dto/sse-meta-payload.dto';
import { ApiRequestIdHeader } from '../common/decorators/api-request-id-header.decorator';
import { CHAT_STREAM_API_DESCRIPTION } from './dto/sse-stream-description';
import { requireClientGatewayKey } from '../common/requireClientGatewayKey';
import { asClientId, asRequestId } from 'src/common/types/branded.types';
import type { SseEvent } from './sse/sse-event.type';

@ApiTags('Chat')
@ApiSecurity('GatewayKeyAuth')
@Controller('chat')
@GatewayKeyAndSmartRateLimit()
export class ChatStreamController {
  private readonly sse = new SseSerializer();

  constructor(private readonly chatService: ChatService) {}

  @Post('stream')
  @UseInterceptors(StreamCleanupInterceptor)
  @ApiOperation({
    summary: 'Streaming chat',
    description: CHAT_STREAM_API_DESCRIPTION,
  })
  @ApiBody({ type: ChatRequestDto })
  @ApiProduces('text/event-stream')
  @ApiResponse({
    status: 200,
    description:
      'SSE: event meta (SseMetaPayload), delta* (SseDeltaPayload), done (SseDonePayload).',
    content: {
      'text/event-stream': {
        schema: {
          type: 'string',
          description: 'Format: `event: <name>\\ndata: <json>\\n\\n`',
        },
        examples: {
          meta: {
            value: `event: meta\ndata: ${JSON.stringify({
              id: 'gw_...',
              provider: 'anthropic',
              model: 'chat-default',
              requestId: 'req_...',
              conversationId: 'conv_...',
            } satisfies SseMetaPayloadDto)}`,
          },
          metaCacheHit: {
            value: `event: meta\ndata: ${JSON.stringify({
              id: 'gw_...',
              provider: 'anthropic',
              model: 'chat-default',
              requestId: 'req_...',
              conversationId: 'conv_...',
              cached: true,
              cachedAt: '2026-01-01T00:00:00.000Z',
              cacheSource: 'exact',
            } satisfies SseMetaPayloadDto)}`,
          },
        },
      },
    },
  })
  @ApiGatewayChatErrorResponses()
  @ApiRequestIdHeader()
  async streamChat(
    @Req() req: Request,
    @Body() requestBody: ChatRequestDto,
    @Res() res: Response,
  ) {
    const gatewayKey = requireClientGatewayKey(req);
    this.chatService.validateForStreaming(requestBody.modelAlias);

    const requestId = asRequestId(req.requestId);
    const clientId = req.clientId
      ? asClientId(req.clientId)
      : asClientId('unknown');

    // Cooldown + cache lookup before headers → 429 as JSON ErrorEnvelope (D3)
    const decision = await this.chatService.resolveStreamCache(
      requestBody,
      requestId,
      clientId,
      'native',
      gatewayKey,
    );

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const emit = (event: SseEvent) => {
      if (!res.writableEnded) {
        res.write(this.sse.serialize(event));
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
          requestBody,
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
  }
}
