import { Module } from '@nestjs/common';
import { ChatModule } from 'src/chat/chat.module';
import { AnthropicApiKeyGuard } from './guards/anthropic-api-key.guard';
import { AnthropicExceptionFilter } from './filters/anthropic-exception.filter';
import { AnthropicModelsCatalogService } from './services/anthropic-models-catalog.service';
import { AnthropicModelsController } from './controllers/anthropic-models.controller';
import { AnthropicMessagesController } from './controllers/anthropic-messages.controller';
@Module({
  imports: [ChatModule],
  controllers: [AnthropicModelsController, AnthropicMessagesController],
  providers: [
    AnthropicApiKeyGuard,
    AnthropicExceptionFilter,
    AnthropicModelsCatalogService,
  ],
  exports: [AnthropicModelsCatalogService],
})
export class AnthropicModule {}
