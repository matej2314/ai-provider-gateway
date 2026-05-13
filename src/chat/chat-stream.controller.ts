import { Controller, Body, Post, Res, Req, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ChatRequestDto } from './dto/chat-request.dto';
import { SseSerializer } from './sse/sse.serializer';
import { ChatService } from './chat.service';
import { GatewayKeyGuard } from '../guards/gateway-key.guard';

@Controller('/chat')
@UseGuards(GatewayKeyGuard)
export class ChatStreamController {
  private readonly sse = new SseSerializer();

  constructor(private readonly chatService: ChatService) {}

  @Post('stream')
  async streamChat(
    @Req() req: Request,
    @Body() requestBody: ChatRequestDto,
    @Res() res: Response,
  ) {
    const resolved = this.chatService.validateForStreaming(
      requestBody.modelAlias,
    );

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      await this.chatService.executeStream(
        requestBody,
        req.requestId,
        (event) => {
          res.write(this.sse.serialize(event));
        },
      );
    } finally {
      res.end();
    }
  }
}
