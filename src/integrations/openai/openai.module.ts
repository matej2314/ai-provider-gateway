import { Module } from '@nestjs/common';
import { ChatModule } from 'src/chat/chat.module';
import { OpenAiBearerAuthGuard } from './guards/openai-bearer-auth.guard';
import { OpenAiExceptionFilter } from './filters/openai-exception.filter';
import { OpenAiModelsCatalogService } from './services/openai-models-catalog.service';
import { OpenAiModelsController } from './controllers/openai-models.controller';
import { OpenAiChatCompletionsController } from './controllers/openai-chat-completions.controller';

@Module({
  imports: [ChatModule],
  controllers: [OpenAiModelsController, OpenAiChatCompletionsController],
  providers: [
    OpenAiModelsCatalogService,
    OpenAiBearerAuthGuard,
    OpenAiExceptionFilter,
  ],
  exports: [OpenAiModelsCatalogService],
})
export class OpenAiModule {}
