import { Module, Global } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service';

@Global()
@Module({
  providers: [ProviderRegistryService],
  exports: [ProviderRegistryService],
})
export class ProviderRegistryModule {}
