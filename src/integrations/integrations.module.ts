import { Module } from '@nestjs/common';
import { OpenAiModule } from './openai/openai.module';
import { AnthropicModule } from './anthropic/anthropic.module';

@Module({
  imports: [OpenAiModule, AnthropicModule],
})
export class IntegrationsModule {}
