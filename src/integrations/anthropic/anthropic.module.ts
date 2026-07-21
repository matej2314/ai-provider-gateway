import { Module } from '@nestjs/common';
import { ChatModule } from '../../chat/chat.module';
import { ModelsModule } from '../../models/models.module';
import { AnthropicApiKeyGuard } from './guards/anthropic-api-key.guard';
import { AnthropicExceptionFilter } from './filters/anthropic-exception.filter';
import { AnthropicModelsController } from './controllers/anthropic-models.controller';
import { AnthropicMessagesController } from './controllers/anthropic-messages.controller';
@Module({
  imports: [ChatModule, ModelsModule],
  controllers: [AnthropicModelsController, AnthropicMessagesController],
  providers: [AnthropicApiKeyGuard, AnthropicExceptionFilter],
})
export class AnthropicModule {}
