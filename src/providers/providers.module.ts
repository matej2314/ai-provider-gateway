import { DynamicModule, Module, Type } from '@nestjs/common';
import { AnthropicModule } from './anthropic/anthropic.module';
import { GoogleModule } from './google/google.module';
import { loadGatewayConfigFromFile } from '../config/configuration';
import type { GatewayConfig } from '../config/configuration';
import type { GatewayProviderType } from '../config/provider-types';

function providerModuleByType(
  map: Record<GatewayProviderType, Type<unknown>>,
): Record<GatewayProviderType, Type<unknown>> {
  return map;
}

const PROVIDER_MODULES = providerModuleByType({
  anthropic: AnthropicModule,
  google: GoogleModule,
});

function importsFromGateway(gateway: GatewayConfig): Type<unknown>[] {
  const types = new Set(
    Object.values(gateway.providers).map((row) => row.type),
  );

  const out: Type<unknown>[] = [];
  for (const type of types) {
    const mod = PROVIDER_MODULES[type as GatewayProviderType];
    if (!mod) {
      throw new Error(`[ProvidersModule] Unsupported provider type: ${type}`);
    }
    out.push(mod);
  }

  return out;
}

@Module({})
export class ProvidersModule {
  static register(): DynamicModule {
    const gateway = loadGatewayConfigFromFile();

    return {
      module: ProvidersModule,
      imports: importsFromGateway(gateway),
      providers: [],
      exports: [],
    };
  }
}
