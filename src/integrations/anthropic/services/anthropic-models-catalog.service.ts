import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfigOrThrow } from '../../../config/typed-config';
import type { GatewayConfig } from '../../../config/configuration';
import type {
  AnthropicModelDto,
  AnthropicModelsListResponseDto,
} from '../dtos/anthropic-models-list-response.dto';

@Injectable()
export class AnthropicModelsCatalogService {
  constructor(private readonly config: ConfigService) {}

  private getGatewayConfig(): GatewayConfig {
    return getAppConfigOrThrow(this.config, 'gateway');
  }

  private toDisplayName(alias: string): string {
    return alias
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private toModelDto(alias: string): AnthropicModelDto {
    return {
      type: 'model',
      id: alias,
      display_name: this.toDisplayName(alias),
      created_at: new Date().toISOString(),
    };
  }

  listModels(): AnthropicModelsListResponseDto {
    const gateway = this.getGatewayConfig();
    const data: AnthropicModelDto[] = [];

    for (const [alias] of Object.entries(gateway.models)) {
      data.push(this.toModelDto(alias));
    }

    return {
      data,
      first_id: data[0]?.id ?? '',
      last_id: data[data.length - 1]?.id ?? '',
      has_more: false,
    };
  }

  getModel(id: string): AnthropicModelDto | null {
    const gateway = this.getGatewayConfig();
    if (!gateway.models[id]) return null;

    return this.toModelDto(id);
  }
}
