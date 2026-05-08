import { Controller, Body, Post, Res, Sse } from '@nestjs/common';
import type { Response } from 'express';
import { ChatRequestDto } from './dto/chat-request.dto';
import { SseSerializer } from './sse/sse.serializer';
import { ChatService } from './chat.service';

@Controller('/chat')
export class ChatStreamController {
  private readonly sse = new SseSerializer();

  constructor(private readonly chatService: ChatService) {}

  @Post('stream')
  async streamChat(@Body() request: ChatRequestDto, @Res() res: Response) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      await this.chatService.executeStream(request, (event) => {
        res.write(this.sse.serialize(event));
      });
    } finally {
      res.end();
    }
  }
}
