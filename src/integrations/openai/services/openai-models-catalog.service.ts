import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GatewayConfig } from 'src/config/configuration';
import type { OpenAiModelDto } from '../dtos/openai-models-list-response.dto';

interface ListModelsResult {
  object: 'list';
  data: OpenAiModelDto[] | [];
}

@Injectable()
export class OpenAiModelsCatalogService {
  constructor(private readonly config: ConfigService) {}

  private getGatewayConfig(): GatewayConfig | undefined {
    return this.config.get<GatewayConfig>('gateway');
  }

  private resolveOwnedBy(
    gateway: GatewayConfig,
    providerInstance: string,
  ): string {
    const row = gateway.providers[providerInstance];
    return row?.type ?? 'gateway';
  }

  listModels(): ListModelsResult {
    const gateway = this.getGatewayConfig();
    if (!gateway) return { object: 'list', data: [] };

    const data: OpenAiModelDto[] = [];

    for (const [alias, model] of Object.entries(gateway.models)) {
      data.push({
        id: alias,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: this.resolveOwnedBy(gateway, model.providerInstance),
      });
    }
    return { object: 'list', data };
  }

  getModel(modelId: string): OpenAiModelDto | null {
    const gateway = this.getGatewayConfig();
    if (!gateway?.models[modelId]) return null;
    const model = gateway.models[modelId];

    return {
      id: modelId,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: this.resolveOwnedBy(gateway, model.providerInstance),
    };
  }
}
