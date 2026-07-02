import {
  Injectable,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfigOrThrow } from '../config/typed-config';
import { AIProvider } from './interfaces/ai-provider.interface';
import {
  GatewayConfig,
  GatewayModelConfig,
  GatewayCapabilitiesConfig,
  GatewayParamsConfig,
} from '../config/configuration';
import { isOpenAiProviderType } from '../config/provider-types';
import { resolveApiSurfaceDefault } from './openai/resolve-api-surface-default';
import { ApiErrorCode } from '../common/errors/api-error.code';
import { UnsupportedProviderException } from '../common/exceptions/unsupported-provider.exception';
import { LoggingService } from '../logging/logging.service';
import { RETRY_POLICY_DEFAULTS } from '../common/retry-policy-defaults';
import type { ProviderToolCall } from './interfaces/ai-provider.interface';
import type { GatewayProviderType } from '../config/provider-types';
import type { OpenAiApiSurface } from './openai/openai-provider.types';

export interface RegisteredProviderInstance {
  instanceId: string;
  type: GatewayProviderType;
  provider: AIProvider;
}

export interface ResolvedProviderConfig {
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
  toolCalls?: ProviderToolCall[];
  providerType: GatewayProviderType;
  openAiApiSurface?: OpenAiApiSurface;
}

@Injectable()
export class ProviderRegistryService {
  private instances = new Map<string, RegisteredProviderInstance>();
  private readonly logger: LoggingService;

  constructor(
    private readonly configService: ConfigService,
    loggingService: LoggingService,
  ) {
    this.logger = loggingService.child({ module: 'ProviderRegistryService' });
  }

  registerInstance(
    instanceId: string,
    type: GatewayProviderType,
    provider: AIProvider,
  ): void {
    this.instances.set(instanceId, {
      instanceId,
      type: type,
      provider,
    });
  }

  private getGatewayConfig(): GatewayConfig {
    try {
      return getAppConfigOrThrow(this.configService, 'gateway');
    } catch {
      this.logger.error(
        'Gateway config not found.',
        new Error('Gateway config not found'),
      );
      throw new InternalServerErrorException('Gateway config not found');
    }
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
  ): RegisteredProviderInstance {
    const instanceId = modelConfig.providerInstance;
    const providerInstanceConfig = gatewayConfig.providers[instanceId];

    if (!providerInstanceConfig) {
      this.logger.warn('Provider instance not found in config:', {
        providerInstance: instanceId,
      });
      throw new HttpException(
        {
          code: ApiErrorCode.VALIDATION_FAILED,
          message: `Provider instance ${instanceId} not found`,
          details: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const entry = this.instances.get(instanceId);

    if (!entry) {
      this.logger.warn('Provider instance not registered:', {
        instanceId,
        type: providerInstanceConfig.type,
      });
      throw new UnsupportedProviderException(
        `Provider instance ${instanceId} not registered (type: ${providerInstanceConfig.type})`,
      );
    }

    if (entry.type !== providerInstanceConfig.type) {
      this.logger.error('Provider instance type mismatch:', {
        message: `Provider instance ${instanceId} type mismatch: config=${providerInstanceConfig.type} vs registry=${entry.type}`,
        name: 'ProviderInstanceTypeMismatch',
      });
      throw new InternalServerErrorException(
        `Provider instance "${instanceId}" type mismatch: config=${providerInstanceConfig.type}, registry=${entry.type}`,
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

    const providerInstanceConfig =
      gatewayConfig.providers[modelConfig.providerInstance];

    return {
      provider: providerEntry.provider,
      providerName: providerEntry.instanceId,
      providerType: providerEntry.type,
      modelId: modelConfig.modelId,
      modelAlias,
      fallbackAlias,
      capabilities: modelConfig.capabilities ?? {},
      policy,
      params: modelConfig.policy?.params ?? undefined,
      ...(isOpenAiProviderType(providerEntry.type) && {
        openAiApiSurface: resolveApiSurfaceDefault(
          providerEntry.type,
          providerInstanceConfig.apiSurface,
        ),
      }),
    };
  }

  list(): string[] {
    return Array.from(this.instances.keys());
  }
}
