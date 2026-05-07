import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() request: ChatRequestDto) {
    console.log('[ChatController] POST /api/v1/chat');
    return this.chatService.executeChat(request);
  }
}
