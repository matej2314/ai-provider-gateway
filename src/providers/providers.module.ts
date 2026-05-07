import { Module, OnModuleInit } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service';
import { AnthropicModule } from './anthropic/anthropic.module';
import { AnthropicAdapter } from './anthropic/anthropic.adapter';
import { GoogleModule } from './google/google.module';
import { GoogleAdapter } from './google/google.adapter';

@Module({
  providers: [ProviderRegistryService],
  exports: [ProviderRegistryService],
  imports: [AnthropicModule, GoogleModule],
})
export class ProvidersModule implements OnModuleInit {
  constructor(
    private registry: ProviderRegistryService,
    private anthropicAdapter: AnthropicAdapter,
    private googleAdapter: GoogleAdapter,
  ) {}

  onModuleInit() {
    this.registry.register('anthropic', this.anthropicAdapter);
    this.registry.register('google', this.googleAdapter);
    console.log('[ProvidersModule] Providers registered:', this.registry.list());
  }
}
