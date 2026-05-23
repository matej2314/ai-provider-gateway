import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatStreamController } from './chat-stream.controller';
import { GatewayKeyGuard } from '../guards/gateway-key.guard';
import { SmartRateLimitGuard } from '../guards/smart-rate-limit-guard';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { ResilientExecutor } from 'src/common/resilience/resilient-executor';
import { ChatProviderCallService } from './chat-provider-call.service';
import { StreamCleanupInterceptor } from 'src/common/interceptors/stream-cleanup.interceptor';

@Module({
  imports: [RateLimitModule],
  controllers: [ChatController, ChatStreamController],
  providers: [
    ChatService,
    GatewayKeyGuard,
    SmartRateLimitGuard,
    ResilientExecutor,
    ChatProviderCallService,
    StreamCleanupInterceptor,
  ],
})
export class ChatModule {}
