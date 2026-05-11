import {
  Injectable,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider } from './interfaces/ai-provider.interface';
import {
  GatewayConfig,
  GatewayModelConfig,
  GatewayCapabilitiesConfig,
  GatewayParamsConfig,
} from '../config/configuration';
import { ApiErrorCode } from '../common/errors/api-error.code';
import { UnsupportedProviderException } from '../common/exceptions/unsupported-provider.exception';

interface ResolvedProviderConfig {
  provider: AIProvider;
  providerName: string;
  modelId: string;
  capabilities: GatewayCapabilitiesConfig;
  params?: GatewayParamsConfig;
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
      throw new HttpException(
        {
          code: ApiErrorCode.MODEL_ALIAS_NOT_FOUND,
          message: `Model alias ${modelAlias} not found in config`,
          details: [],
        },
        HttpStatus.BAD_REQUEST,
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
      throw new HttpException(
        {
          code: ApiErrorCode.VALIDATION_FAILED,
          message: `Provider instance ${modelConfig.providerInstance} not found`,
          details: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const providerType = providerInstanceConfig.type;

    const entry = this.providers.get(providerType);

    if (!entry) {
      throw new UnsupportedProviderException(
        `Provider ${providerType} not registered.`,
      );
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
      capabilities: modelConfig.capabilities ?? undefined,
      params: modelConfig.policy?.params ?? undefined,
    };
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}
