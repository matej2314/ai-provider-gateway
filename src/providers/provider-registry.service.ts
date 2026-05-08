import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider } from './interfaces/ai-provider.interface';

interface ResolvedProviderConfig {
  provider: AIProvider;
  providerName: string;
  modelId: string;
}

export interface GatewayModelConfig {
  providerInstance: string;
  modelId: string;
  [key: string]: unknown;
}

export interface GatewayProviderInstanceConfig {
  type: string;
  [key: string]: unknown;
}

export interface GatewayConfig {
  models: Record<string, GatewayModelConfig>;
  providers: Record<string, GatewayProviderInstanceConfig>;
  [key: string]: unknown;
}

@Injectable()
export class ProviderRegistryService {
  private providers = new Map<string, { provider: AIProvider; name: string }>();

  constructor(private configService: ConfigService) {}

  register(providerName: string, provider: AIProvider) {
    this.providers.set(providerName, { provider, name: providerName });
  }

  private getGatewayConfig(): GatewayConfig {
    const config = this.configService.get<GatewayConfig>('gateway');

    if (!config) {
      throw new InternalServerErrorException('Gateway config not found');
    }

    return config;
  }

  private resolveModelAlias(
    gatewayConfig: GatewayConfig,
    modelAlias: string,
  ): GatewayModelConfig {
    const modelConfig = gatewayConfig?.models[modelAlias];

    if (!modelConfig) {
      throw new BadRequestException(
        `Model alias ${modelAlias} not found in config`,
      );
    }

    return modelConfig;
  }

  private resolveProviderEntry(
    gatewayConfig: GatewayConfig,
    modelConfig: GatewayModelConfig,
  ) {
    const providerInstanceConfig =
      gatewayConfig.providers[modelConfig.providerInstance];

    if (!providerInstanceConfig) {
      throw new BadRequestException(
        `Provider instance ${modelConfig.providerInstance} not found in config`,
      );
    }

    const providerType = providerInstanceConfig.type;

    const entry = this.providers.get(providerType);

    if (!entry) {
      throw new BadRequestException(`Provider ${providerType} not registered`);
    }

    return entry;
  }

  resolve(modelAlias: string): ResolvedProviderConfig {
    const gatewayConfig = this.getGatewayConfig();

    const modelConfig = this.resolveModelAlias(gatewayConfig, modelAlias);

    const providerEntry = this.resolveProviderEntry(gatewayConfig, modelConfig);

    console.log(
      `[ProviderRegistry] Resolved alias '${modelAlias}' → provider '${providerEntry.name}', model '${modelConfig.modelId}'`,
    );

    return {
      provider: providerEntry.provider,
      providerName: providerEntry.name,
      modelId: modelConfig.modelId,
    };
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}
