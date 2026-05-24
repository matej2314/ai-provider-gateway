import { Module } from '@nestjs/common';
import { OpenaiModule } from './openai/openai.module';
import { AnthropicModule } from './anthropic/anthropic.module';

@Module({
  imports: [OpenaiModule, AnthropicModule]
})
export class IntegrationsModule {}
