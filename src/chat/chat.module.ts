import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatStreamController } from './chat-stream.controller';
import { GatewayKeyGuard } from '../guards/gateway-key.guard';
import { SmartRateLimitGuard } from '../guards/smart-rate-limit-guard';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { ResilientExecutor } from 'src/common/resilience/resilient-executor';

@Module({
  imports: [RateLimitModule],
  controllers: [ChatController, ChatStreamController],
  providers: [
    ChatService,
    GatewayKeyGuard,
    SmartRateLimitGuard,
    ResilientExecutor,
  ],
})
export class ChatModule {}
