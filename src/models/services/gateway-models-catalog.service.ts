import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfigOrThrow } from '../../config/typed-config';
import type { GatewayConfig } from '../../config/configuration';
import type { GatewayProviderType } from '../../config/provider-types';
import type { GatewayModelDto } from '../dto/gateway-model.dto';
import {
  asProviderInstanceId,
  asModelAlias,
  type ProviderInstanceId,
  type ModelAlias,
} from '../../common/types/branded.types';

@Injectable()
export class GatewayModelsCatalogService {
  constructor(private readonly config: ConfigService) {}

  private getGatewayConfig(): GatewayConfig {
    return getAppConfigOrThrow(this.config, 'gateway');
  }

  private resolveProviderType(
    gateway: GatewayConfig,
    providerInstance: ProviderInstanceId,
  ): GatewayProviderType | 'gateway' {
    const row = gateway.providers[providerInstance];
    return row?.type ?? 'gateway';
  }

  private toDto(
    gateway: GatewayConfig,
    modelAlias: ModelAlias,
  ): GatewayModelDto {
    const model = gateway.models[modelAlias];

    return {
      modelAlias,
      providerInstance: asProviderInstanceId(model.providerInstance),
      providerType: this.resolveProviderType(gateway, model.providerInstance),
      modelId: model.modelId,
      capabilities: model.capabilities,
      ...(model.fallback !== undefined && { fallback: model.fallback }),
    };
  }

  list(): GatewayModelDto[] {
    const gateway = this.getGatewayConfig();
    const models: GatewayModelDto[] = [];

    for (const alias of Object.keys(gateway.models)) {
      models.push(this.toDto(gateway, asModelAlias(alias)));
    }
    return models;
  }

  getOne(modelAlias: string): GatewayModelDto | null {
    const gateway = this.getGatewayConfig();
    if (!gateway.models[modelAlias]) return null;

    return this.toDto(gateway, asModelAlias(modelAlias));
  }
}
