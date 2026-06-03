import { DynamicModule, Module } from '@nestjs/common';
import { loadGatewayConfigFromFile } from '../config/configuration';
import { ProviderRegistryModule } from './provider-registry.module';
import { ProviderInstancesBootstrap } from './provider-instances.bootstrap';

@Module({})
export class ProvidersModule {
  static register(): DynamicModule {
    const gateway = loadGatewayConfigFromFile();

    return {
      module: ProvidersModule,
      imports: [ProviderRegistryModule],
      providers: [ProviderInstancesBootstrap],
      exports: [],
    };
  }
}
