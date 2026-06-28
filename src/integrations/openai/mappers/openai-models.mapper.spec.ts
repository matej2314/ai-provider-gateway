import {
  mapGatewayModelToOpenAi,
  mapGatewayModelsListToOpenAi,
} from './openai-models.mapper';
import type { GatewayModelDto } from '../../../models/dto/gateway-model.dto';

describe('openai-models.mapper', () => {
  const sample: GatewayModelDto = {
    modelAlias: 'chat-default',
    providerInstance: 'anthropic-primary',
    providerType: 'anthropic',
    modelId: 'claude-sonnet',
  };

  it('mapGatewayModelToOpenAi should use modelAlias as id and providerType as owned_by', () => {
    const result = mapGatewayModelToOpenAi(sample);

    expect(result).toMatchObject({
      id: 'chat-default',
      object: 'model',
      owned_by: 'anthropic',
    });
    expect(result.created).toBeGreaterThan(0);
  });

  it('mapGatewayModelsListToOpenAi should wrap mapped rows', () => {
    const result = mapGatewayModelsListToOpenAi([sample]);

    expect(result).toEqual({
      object: 'list',
      data: [expect.objectContaining({ id: 'chat-default' })],
    });
  });
});
