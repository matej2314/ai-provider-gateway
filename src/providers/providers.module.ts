import { DynamicModule, Module } from '@nestjs/common';
import { ProviderRegistryModule } from './provider-registry.module';
import { ProviderInstancesBootstrap } from './provider-instances.bootstrap';

@Module({})
export class ProvidersModule {
  static register(): DynamicModule {
    return {
      module: ProvidersModule,
      imports: [ProviderRegistryModule],
      providers: [ProviderInstancesBootstrap],
      exports: [],
    };
  }
}
