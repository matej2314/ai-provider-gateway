import {
  Injectable,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  OnApplicationBootstrap,
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
import { LoggingService } from '../logging/logging.service';
import { RETRY_POLICY_DEFAULTS } from 'src/common/retry-policy-defaults';

interface ResolvedProviderConfig {
  provider: AIProvider;
  providerName: string;
  modelId: string;
  modelAlias: string;
  fallbackAlias?: string;
  capabilities: GatewayCapabilitiesConfig;
  policy?: {
    timeoutMs?: number;
    retry?: {
      maxAttempts?: number;
      onStatus?: number[];
    };
  };
  params?: GatewayParamsConfig;
}

@Injectable()
export class ProviderRegistryService implements OnApplicationBootstrap {
  private providers = new Map<string, { provider: AIProvider; name: string }>();
  private readonly logger: LoggingService;

  constructor(
    private readonly configService: ConfigService,
    loggingService: LoggingService,
  ) {
    this.logger = loggingService.child({ module: 'ProviderRegistryService' });
  }

  register(providerName: string, provider: AIProvider) {
    this.providers.set(providerName, { provider, name: providerName });
    this.logger.debug('Registered provider:', {
      provider: providerName,
      adapter: provider.constructor.name,
    });
  }

  private getGatewayConfig(): GatewayConfig {
    const config = this.configService.get<GatewayConfig>('gateway');

    if (!config) {
      this.logger.error(
        'Gateway config not found.',
        new Error('Gateway config not found'),
      );
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
      this.logger.warn('Model alias not found in config:', { modelAlias });
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
      this.logger.warn('Provider instance not found in config:', {
        providerInstance: modelConfig.providerInstance,
      });
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
      this.logger.warn('Provider not registered:', { provider: providerType });
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

    let fallbackAlias: string | undefined = undefined;
    if (modelConfig.fallback) {
      if (!gatewayConfig.models[modelConfig.fallback]) {
        this.logger.warn('Fallback alias not found in config:', {
          modelAlias,
          fallback: modelConfig.fallback,
        });
      } else {
        fallbackAlias = modelConfig.fallback;
      }
    }

    const policy = modelConfig.policy
      ? {
          timeoutMs:
            modelConfig.policy.timeoutMs ?? RETRY_POLICY_DEFAULTS.timeoutMs,
          retry: modelConfig.policy.retry
            ? {
                maxAttempts:
                  modelConfig.policy.retry.maxAttempts ??
                  RETRY_POLICY_DEFAULTS.maxAttempts,
                onStatus:
                  modelConfig.policy.retry.onStatus ??
                  RETRY_POLICY_DEFAULTS.onStatus,
              }
            : undefined,
        }
      : undefined;

    return {
      provider: providerEntry.provider,
      providerName: providerEntry.name,
      modelId: modelConfig.modelId,
      modelAlias,
      fallbackAlias,
      capabilities: modelConfig.capabilities ?? {},
      policy,
      params: modelConfig.policy?.params ?? undefined,
    };
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }

  onApplicationBootstrap() {
    this.logger.info(
      `Registered providers: ${this.list().join(', ') || '(none)'}`,
    );
  }
}
