import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { GatewayKeyGuard } from '../guards/gateway-key.guard';

@Controller('chat')
@UseGuards(GatewayKeyGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Req() req: Request, @Body() requestBody: ChatRequestDto) {
    console.log('[ChatController] POST /api/v1/chat');
    return this.chatService.executeChat(requestBody, req.requestId);
  }
}
