import { Controller, Post, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiOperation,
  ApiBody,
  ApiSecurity,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { GatewayKeyAndSmartRateLimit } from '../common/decorators/gateway-key-and-smart-rate-limit.decorator';
import {
  ChatResponseDto,
  toChatResponseDto,
  toChatResponseDtoFromCache,
} from './dto/chat-response.dto';
import { ApiGatewayChatErrorResponses } from '../common/decorators/api-gateway-error-responses.decorator';
import { ApiRequestIdHeader } from '../common/decorators/api-request-id-header.decorator';
import { requireClientGatewayKey } from '../common/requireClientGatewayKey';
import { asRequestId, asClientId } from 'src/common/types/branded.types';

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
  @ApiResponse({ status: 201, type: ChatResponseDto })
  @ApiGatewayChatErrorResponses()
  @ApiRequestIdHeader()
  async chat(@Req() req: Request, @Body() requestBody: ChatRequestDto) {
    const gatewayKey = requireClientGatewayKey(req);
    const result = await this.chatService.executeChat(
      requestBody,
      req.clientId ? asClientId(req.clientId) : asClientId('unknown'),
      asRequestId(req.requestId),
      gatewayKey,
      'native',
    );

    if ('cached' in result && result.cached) {
      return toChatResponseDtoFromCache(result, result.conversationId, {
        cacheSource: result.cacheSource,
        requestId: result.requestId,
      });
    }

    return toChatResponseDto(result);
  }
}
