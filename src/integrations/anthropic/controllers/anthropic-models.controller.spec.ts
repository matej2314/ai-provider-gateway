jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AnthropicModelsController } from './anthropic-models.controller';
import { GatewayModelsCatalogService } from '../../../models/services/gateway-models-catalog.service';
import { AnthropicApiKeyGuard } from '../guards/anthropic-api-key.guard';
import { SmartRateLimitGuard } from '../../../guards/smart-rate-limit-guard';

describe('AnthropicModelsController', () => {
  let controller: AnthropicModelsController;
  let catalog: jest.Mocked<GatewayModelsCatalogService>;

  const gatewayModel = {
    modelAlias: 'claude-3-opus',
    providerInstance: 'anthropic-main',
    providerType: 'anthropic' as const,
    modelId: 'claude-3-opus-20240229',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnthropicModelsController],
      providers: [
        {
          provide: GatewayModelsCatalogService,
          useValue: { list: jest.fn(), getOne: jest.fn() },
        },
      ],
    })
      .overrideGuard(AnthropicApiKeyGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(SmartRateLimitGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(AnthropicModelsController);
    catalog = module.get(GatewayModelsCatalogService);
  });

  it('list should map catalog rows to Anthropic list format', () => {
    catalog.list.mockReturnValue([gatewayModel]);

    const result = controller.list();

    expect(result.has_more).toBe(false);
    expect(result.data[0]).toMatchObject({
      id: 'claude-3-opus',
      type: 'model',
      display_name: 'Claude 3 Opus',
    });
  });

  it('getOne should map single row when found', () => {
    catalog.getOne.mockReturnValue(gatewayModel);

    expect(controller.getOne('claude-3-opus')).toMatchObject({
      id: 'claude-3-opus',
      type: 'model',
      display_name: 'Claude 3 Opus',
    });
  });

  it('getOne should throw NotFoundException with Anthropic message format', () => {
    catalog.getOne.mockReturnValue(null);

    expect(() => controller.getOne('missing-model')).toThrow(NotFoundException);
    try {
      controller.getOne('missing-model');
    } catch (error) {
      expect((error as NotFoundException).getResponse()).toMatchObject({
        message: 'model missing-model not found.',
      });
    }
  });
});
