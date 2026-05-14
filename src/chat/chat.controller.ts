import { Controller, Post, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { GatewayKeyAndSmartRateLimit } from 'src/common/decorators/gateway-key-and-smart-rate-limit.decorator';
import { readGatewayKeyHeader } from 'src/common/readGatewayKeyHeader';

@Controller('chat')
@GatewayKeyAndSmartRateLimit()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Req() req: Request, @Body() requestBody: ChatRequestDto) {
    const gatewayKey = readGatewayKeyHeader(req);
    return this.chatService.executeChat(requestBody, req.requestId, gatewayKey);
  }
}
