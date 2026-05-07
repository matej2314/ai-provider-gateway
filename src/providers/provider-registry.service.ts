import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider } from './interfaces/ai-provider.interface';

interface ResolvedProviderConfig {
  provider: AIProvider;
  providerName: string;
  modelId: string;
}

@Injectable()
export class ProviderRegistryService {
  private providers = new Map<string, { provider: AIProvider; name: string }>();

  constructor(private configService: ConfigService) {}

  register(providerName: string, provider: AIProvider) {
    this.providers.set(providerName, { provider, name: providerName });
  }

  resolve(modelAlias: string): ResolvedProviderConfig {
    const gatewayConfig = this.configService.get('gateway');

    const modelConfig = gatewayConfig.models[modelAlias];

    if (!modelConfig) {
      throw new BadRequestException(
        `Model alias ${modelAlias} not found in config`,
      );
    }

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

    console.log(
      `[ProviderRegistry] Resolved alias '${modelAlias}' → provider '${entry.name}', model '${modelConfig.modelId}'`,
    );

    return {
      provider: entry.provider,
      providerName: entry.name,
      modelId: modelConfig.modelId,
    };
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}
