import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfigOrThrow } from '../config/typed-config';
import { ProviderRegistryService } from './provider-registry.service';
import { createAnthropicProvider } from './factories/create-anthropic-provider';
import { createGoogleProvider } from './factories/create-google-provider';
import { LoggingService } from 'src/logging/logging.service';
import type { GatewayProviderType } from '../config/provider-types';
import { adaptApiKeyProviderFactory } from './factories/adapt-api-key-provider-factory';
import { createOpenAiProvider } from './factories/create-openai-provider';
import { createOpenAiCompatibleProviderInstance } from './factories/create-openai-compatible-provider-instance';
import type {
  ProviderFactoryContext,
  ProviderFactoryFn,
} from './factories/provider-factory.types';
import { isApiKeyRequiredForProviderType } from '../config/provider-api-key.validation';
import { isOpenAiProviderType } from '../config/provider-types';
import type { GatewayProviderInstanceConfig } from '../config/gateway-config.schema';
import type { ProviderInstanceRuntime } from '../config/configuration';
import { asProviderApiKey, asProviderInstanceId } from '../common/types';

const FACTORIES: Partial<Record<GatewayProviderType, ProviderFactoryFn>> = {
  anthropic: adaptApiKeyProviderFactory(createAnthropicProvider),
  google: adaptApiKeyProviderFactory(createGoogleProvider),
  openai: createOpenAiProvider,
  'openai-compatible': createOpenAiCompatibleProviderInstance,
};

function buildFactoryContext(
  instanceId: string,
  row: GatewayProviderInstanceConfig,
  runtime: ProviderInstanceRuntime,
): ProviderFactoryContext {
  const base: ProviderFactoryContext = {
    instanceId,
    type: row.type,
    apiKeyRef: row.apiKeyRef,
    apiKey: asProviderApiKey((runtime.apiKey ?? '').trim()),
  };
  if (!isOpenAiProviderType(row.type)) return base;
  return {
    ...base,
    baseUrlRef: row.baseUrlRef,
    baseUrl: runtime.baseUrl,
    ...(row.type === 'openai-compatible' && {
      apiSurface: runtime.apiSurface,
    }),
  };
}

@Injectable()
export class ProviderInstancesBootstrap implements OnApplicationBootstrap {
  constructor(
    private readonly configService: ConfigService,
    private readonly registry: ProviderRegistryService,
    private readonly loggingService: LoggingService,
  ) {}
  onApplicationBootstrap() {
    const gateway = getAppConfigOrThrow(this.configService, 'gateway');
    const byInstance = getAppConfigOrThrow(this.configService, 'providers');

    for (const [instanceId, row] of Object.entries(gateway.providers)) {
      if (row.enabled === false) continue;

      const brandedInstanceId = asProviderInstanceId(instanceId);
      const runtime = byInstance[brandedInstanceId];

      if (!runtime) {
        throw new Error(
          `[ProviderInstancesBootstrap] Missing runtime config for instance ${instanceId}`,
        );
      }

      const apiKeyRaw = (runtime?.apiKey ?? '').trim();

      if (isApiKeyRequiredForProviderType(row.type) && !apiKeyRaw) {
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
      const context = buildFactoryContext(instanceId, row, runtime);
      const provider = factory(context, this.loggingService);
      this.registry.registerInstance(
        asProviderInstanceId(instanceId),
        row.type,
        provider,
      );
    }
  }
}
