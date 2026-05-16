import { Module, Global } from '@nestjs/common';
import { LoggingModule } from '../logging/logging.module';
import { ProviderRegistryService } from './provider-registry.service';

@Global()
@Module({
  imports: [LoggingModule],
  providers: [ProviderRegistryService],
  exports: [ProviderRegistryService],
})
export class ProviderRegistryModule {}
