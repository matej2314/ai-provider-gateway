import { Module } from '@nestjs/common';
import { ChatModule } from '../../chat/chat.module';
import { ModelsModule } from '../../models/models.module';
import { OpenAiBearerAuthGuard } from './guards/openai-bearer-auth.guard';
import { OpenAiExceptionFilter } from './filters/openai-exception.filter';
import { OpenAiModelsController } from './controllers/openai-models.controller';
import { OpenAiChatCompletionsController } from './controllers/openai-chat-completions.controller';

@Module({
  imports: [ChatModule, ModelsModule],
  controllers: [OpenAiModelsController, OpenAiChatCompletionsController],
  providers: [OpenAiBearerAuthGuard, OpenAiExceptionFilter],
})
export class OpenAiModule {}
