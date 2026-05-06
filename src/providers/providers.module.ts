import { Module } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service';
import { AnthropicModule } from './anthropic/anthropic.module';
import { GoogleModule } from './google/google.module';

@Module({
  providers: [ProviderRegistryService],
  imports: [AnthropicModule, GoogleModule],
})
export class ProvidersModule {}
