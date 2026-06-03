import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderRegistryService } from './provider-registry.service';
import { createAnthropicProvider } from './factories/create-anthropic-provider';
import { createGoogleProvider } from './factories/create-google-provider';
import { LoggingService } from 'src/logging/logging.service';
import type { GatewayProviderType } from '../config/provider-types';
import type {
  GatewayConfig,
  ProviderInstanceRuntime,
} from '../config/configuration';

const FACTORIES: Record<
  GatewayProviderType,
  (
    apiKey: string,
    logger: LoggingService,
  ) => import('./interfaces/ai-provider.interface').AIProvider
> = {
  anthropic: createAnthropicProvider,
  google: createGoogleProvider,
};

@Injectable()
export class ProviderInstancesBootstrap implements OnApplicationBootstrap {
  constructor(
    private readonly configService: ConfigService,
    private readonly registry: ProviderRegistryService,
    private readonly loggingService: LoggingService,
  ) {}
  onApplicationBootstrap() {
    const gateway = this.configService.get<GatewayConfig>('gateway');
    const byInstance =
      this.configService.get<Record<string, ProviderInstanceRuntime>>(
        'providers',
      );

    if (!gateway || !byInstance) {
      throw new Error(
        '[ProviderInstancesBootstrap] Missing gateway or providerByInstance config',
      );
    }
    for (const [instanceId, row] of Object.entries(gateway.providers)) {
      if (row.enabled === false) continue;

      const runtime = byInstance[instanceId];
      const apiKey = (runtime?.apiKey ?? '').trim();

      if (!apiKey) {
        throw new Error(
          `[ProviderInstancesBootstrap] Missing API key for instance ${instanceId}`,
        );
      }

      const factory = FACTORIES[row.type];
      if (!factory) {
        throw new Error(
          `[ProviderInstancesBootstrap] Unsupported provider type: ${row.type}`,
        );
      }
      const provider = factory(apiKey, this.loggingService);
      this.registry.registerInstance(instanceId, row.type, provider);
    }
  }
}
