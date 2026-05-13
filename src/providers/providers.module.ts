import { DynamicModule, Module } from '@nestjs/common';
import { AnthropicModule } from './anthropic/anthropic.module';
import { GoogleModule } from './google/google.module';
import { loadGatewayConfigFromFile } from '../config/configuration';
import type { GatewayConfig } from '../config/configuration';

const PROVIDER_MODULES: Record<
  GatewayConfig['providers'][string]['type'],
  typeof AnthropicModule | typeof GoogleModule
> = {
  anthropic: AnthropicModule,
  google: GoogleModule,
};

function importsFromGateway(gateway: GatewayConfig) {
  const types = new Set(
    Object.values(gateway.providers).map((row) => row.type),
  );

  const out: Array<typeof AnthropicModule | typeof GoogleModule> = [];
  for (const type of types) {
    const module = PROVIDER_MODULES[type];
    if (!module)
      throw new Error(`[ProvidersModule] Unsupported provider type: ${type}`);
    out.push(module);
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
