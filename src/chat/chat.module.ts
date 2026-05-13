import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatStreamController } from './chat-stream.controller';
import { GatewayKeyGuard } from '../guards/gateway-key.guard';

@Module({
  controllers: [ChatController, ChatStreamController],
  providers: [ChatService, GatewayKeyGuard],
})
export class ChatModule {}
