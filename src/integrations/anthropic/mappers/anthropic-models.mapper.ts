import type { GatewayModelDto } from '../../../models/dto/gateway-model.dto';
import type {
  AnthropicModelDto,
  AnthropicModelsListResponseDto,
} from '../dtos/anthropic-models-list-response.dto';

function toDisplayName(modelAlias: string): string {
  return modelAlias
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function mapGatewayModelToAnthropic(
  model: GatewayModelDto,
): AnthropicModelDto {
  return {
    type: 'model',
    id: model.modelAlias,
    display_name: toDisplayName(model.modelAlias),
    created_at: new Date().toISOString(),
  };
}

export function mapGatewayModelsListToAnthropic(
  models: GatewayModelDto[],
): AnthropicModelsListResponseDto {
  const data = models.map(mapGatewayModelToAnthropic);

  return {
    data,
    first_id: data[0]?.id ?? '',
    last_id: data[data.length - 1]?.id ?? '',
    has_more: false,
  };
}
