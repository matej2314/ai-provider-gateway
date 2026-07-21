import {
  mapGatewayModelToAnthropic,
  mapGatewayModelsListToAnthropic,
} from './anthropic-models.mapper';
import type { GatewayModelDto } from '../../../models/dto/gateway-model.dto';

describe('anthropic-models.mapper', () => {
  const sample: GatewayModelDto = {
    modelAlias: 'fast-chat',
    providerInstance: 'google-main',
    providerType: 'google',
    modelId: 'gemini-2.5-flash',
  };

  it('mapGatewayModelToAnthropic should derive display_name from alias', () => {
    expect(mapGatewayModelToAnthropic(sample)).toMatchObject({
      type: 'model',
      id: 'fast-chat',
      display_name: 'Fast Chat',
      created_at: expect.any(String),
    });
  });

  it('mapGatewayModelsListToAnthropic should set pagination fields', () => {
    const result = mapGatewayModelsListToAnthropic([sample]);

    expect(result).toMatchObject({
      data: [expect.objectContaining({ id: 'fast-chat' })],
      first_id: 'fast-chat',
      last_id: 'fast-chat',
      has_more: false,
    });
  });
});
