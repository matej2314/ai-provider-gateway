import { Controller, Post, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiOperation,
  ApiOkResponse,
  ApiBody,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { GatewayKeyAndSmartRateLimit } from '../common/decorators/gateway-key-and-smart-rate-limit.decorator';
import { readGatewayKeyHeader } from '../common/readGatewayKeyHeader';
import { ChatResponseDto } from './dto/chat-response.dto';
import { ApiGatewayChatErrorResponses } from '../common/decorators/api-gateway-error-responses.decorator';
import { ApiRequestIdHeader } from '../common/decorators/api-request-id-header.decorator';

@ApiTags('Chat')
@ApiSecurity('GatewayKeyAuth')
@Controller('chat')
@GatewayKeyAndSmartRateLimit()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({
    summary: 'Standard chat',
    description:
      'Full JSON response. Cache, smart rate limit, ResilientExecutor, optional fallback (effectiveModelAlias).',
  })
  @ApiBody({ type: ChatRequestDto })
  @ApiOkResponse({ type: ChatResponseDto })
  @ApiGatewayChatErrorResponses()
  @ApiRequestIdHeader()
  async chat(@Req() req: Request, @Body() requestBody: ChatRequestDto) {
    const gatewayKey = readGatewayKeyHeader(req);
    return this.chatService.executeChat(requestBody, req.requestId, gatewayKey);
  }
}
