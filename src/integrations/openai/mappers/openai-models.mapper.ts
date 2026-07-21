import type { GatewayModelDto } from '../../../models/dto/gateway-model.dto';
import type {
  OpenAiModelDto,
  OpenAiModelsListResponseDto,
} from '../dtos/openai-models-list-response.dto';

export function mapGatewayModelToOpenAi(
  model: GatewayModelDto,
): OpenAiModelDto {
  return {
    id: model.modelAlias,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: model.providerType,
  };
}

export function mapGatewayModelsListToOpenAi(
  models: GatewayModelDto[],
): OpenAiModelsListResponseDto {
  return {
    object: 'list',
    data: models.map(mapGatewayModelToOpenAi),
  };
}
