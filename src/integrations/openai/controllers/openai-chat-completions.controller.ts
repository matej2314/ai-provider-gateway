import {
  Controller,
  Post,
  Body,
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
} from '@nestjs/swagger';
import { ChatService } from '../../../chat/chat.service';
import { SmartRateLimiterService } from '../../../rate-limit/smart-rate-limiter.service';
import { OpenAiAuth } from '../decorators/openai-auth.decorator';
import { requireClientGatewayKey } from '../../../common/requireClientGatewayKey';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import { OpenAiChatCompletionRequestDto } from '../dtos/openai-chat-completion-request.dto';
import { mapOpenAiChatRequestToGateway } from '../mappers/openai-request.mapper';
import { mapChatResponseToOpenAi } from '../mappers/openai-response.mapper';
import {
  createOpenAiStreamState,
  mapSseEventToOpenAi,
} from '../mappers/openai-stream.mapper';
import { OPENAI_STREAM_API_DESCRIPTION } from '../helpers/openai-stream-api-description';

import type { Request, Response } from 'express';
import type { ChatResponseDto } from '../../../chat/dto/chat-response.dto';
import type { SseEvent } from '../../../chat/sse/sse-event.type';

import { OPENAI_INTEGRATION_PATH } from '../../../integrations/integrations.constants';
import { ApiRequestIdHeader } from '../../../common/decorators/api-request-id-header.decorator';
import { ApiOpenAiErrorResponses } from '../../../common/decorators/api-openai-error-response.decorator';
import { OpenAiChatCompletionResponseDto } from '../dtos/openai-chat-completion-response.dto';
import { asRequestId, asClientId } from 'src/common/types/branded.types';
import type { GatewayKey } from '../../../common/types';

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
    gatewayKey: GatewayKey,
  ) {
    this.chatService.validateForStreaming(body.model);

    const streamsCheck = await this.rateLimiter.checkConcurrentStreams(
      gatewayKey,
      req.clientId ? asClientId(req.clientId) : asClientId('unknown'),
    );

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
        asRequestId(req.requestId),
        req.clientId ? asClientId(req.clientId) : asClientId('unknown'),
        (event: SseEvent) => {
          const lines = mapSseEventToOpenAi(event, state);
          for (const line of lines) {
            res.write(line);
          }
        },
        'facade-openai',
        gatewayKey,
      );
    } finally {
      await this.rateLimiter.releaseStream(gatewayKey);
      res.end();
    }
  }

  @Post('chat/completions')
  @ApiOperation({
    summary: 'Create chat completion (OPENAI API spec)',
    description:
      'JSON completion when `stream` is false/omitted. SSE chunks when `stream: true`',
  })
  @ApiBody({ type: OpenAiChatCompletionRequestDto })
  @ApiResponse({
    status: 201,
    type: OpenAiChatCompletionResponseDto,
    description: 'Non-streaming response.',
  })
  @ApiProduces('text/event-stream')
  @ApiResponse({
    status: 200,
    description: OPENAI_STREAM_API_DESCRIPTION.join('\n\n'),
    content: {
      'text/event-stream': {
        schema: {
          type: 'string',
          description:
            'OpenAI chunk lines: `data: <json>\\n\\n`, terminated with `data: [DONE]\\n\\n`.',
        },
        examples: {
          chunk: {
            value:
              'data: {"id":"chatcmpl_...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hi"}}]}\n\n',
          },
          done: {
            value: 'data: [DONE]\n\n',
          },
        },
      },
    },
  })
  @ApiOpenAiErrorResponses()
  @ApiRequestIdHeader()
  async completions(
    @Req() req: Request,
    @Body() body: OpenAiChatCompletionRequestDto,
    @Res({ passthrough: false }) res: Response,
  ) {
    const gatewayKey = requireClientGatewayKey(req);

    if (body.stream === true) {
      await this.handleStream(req, res, body, gatewayKey);
      return;
    }

    const gatewayRequest = mapOpenAiChatRequestToGateway(body);
    const result = (await this.chatService.executeChat(
      gatewayRequest,
      req.clientId ? asClientId(req.clientId) : asClientId('unknown'),
      asRequestId(req.requestId),
      gatewayKey,
      'facade-openai',
    )) as ChatResponseDto;

    res.json(mapChatResponseToOpenAi(result, body.model));
  }
}
