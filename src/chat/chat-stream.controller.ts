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
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      await this.chatService.executeStream(
        requestBody,
        asRequestId(req.requestId),
        req.clientId ? asClientId(req.clientId) : asClientId('unknown'),
        (event) => {
          res.write(this.sse.serialize(event));
        },
        'native',
        gatewayKey,
      );
    } finally {
      res.end();
    }
  }
}
