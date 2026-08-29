import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatStreamController } from './chat-stream.controller';
import { GatewayKeyGuard } from '../guards/gateway-key.guard';
import { SmartRateLimitGuard } from '../guards/smart-rate-limit-guard';
import { ResilientExecutor } from './resilience/resilient-executor';
import { ChatProviderCallService } from './services/chat-provider-call.service';
import { StreamCleanupInterceptor } from 'src/common/interceptors/stream-cleanup.interceptor';
import { ChatErrorHandlerService } from './services/chat-error-handler.service';
import { ChatValidationService } from './services/chat-validation.service';
import { ChatResponseBuilderService } from './services/chat-response-builder.service';
import { ChatCachePipelineService } from './services/chat-cache-pipeline.service';
import { ChatProviderCooldownService } from './services/chat-provider-cooldown.service';
import { StreamCacheReplayService } from './services/stream-cache-replay.service';

@Module({
  controllers: [ChatController, ChatStreamController],
  providers: [
    ChatService,
    GatewayKeyGuard,
    SmartRateLimitGuard,
    ResilientExecutor,
    ChatProviderCallService,
    StreamCleanupInterceptor,
    ChatErrorHandlerService,
    ChatValidationService,
    ChatResponseBuilderService,
    ChatCachePipelineService,
    ChatProviderCooldownService,
    StreamCacheReplayService,
  ],
  exports: [ChatService, SmartRateLimitGuard],
})
export class ChatModule {}
