import { Module } from '@nestjs/common';
import { AnthropicAdapter } from './anthropic.adapter';

@Module({
    providers: [AnthropicAdapter],
    exports: [AnthropicAdapter]
})
export class AnthropicModule {}
